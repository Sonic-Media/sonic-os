import type { Prisma } from "@/lib/generated/prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { BranchIdFilter } from "@/lib/server/branch-scope";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { syncClosedDayDailyOperation } from "@/lib/day-closing/sync-daily-operation";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import {
  getBranchIdByCode,
  getBranchCodeById,
  getBranchIdForSession,
} from "@/lib/server/branch-lookup";
import { assertRecordInSessionBranchScope } from "@/lib/server/branch-record-guard";
import { mapStaffToEntity } from "@/lib/server/mappers/entities";
import { requireSession } from "@/lib/server/session";
import { isRoleGreetingLabel } from "@/lib/ux/user-display";
import { buildStaffActionRecord } from "@/lib/staff/session";
import { upsertDailyOperation } from "@/lib/server/services/daily-operations-service";
import {
  assertCanCloseDay,
  assertCanOpenShop,
} from "@/lib/server/day-closing-guards";
import type { Branch } from "@/types";
import type { DayClosingSummary } from "@/types/day-closing";
import type {
  DayClosingRecord,
  DayClosingStaffPayout,
  DayClosingStatus,
} from "@/types/day-closing";

const closeDaySchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  metrics: z.record(z.string(), z.number()),
  staffPayouts: z.array(z.record(z.string(), z.unknown())),
  expectedCash: z.number(),
  actualCashCounted: z.number(),
  reconciliationNotes: z.string().optional(),
  closingNotes: z.string().optional(),
  cashDifference: z.number(),
  cashStatus: z.enum(["balanced", "short", "over"]),
  summary: z.record(z.string(), z.number()),
  closedBy: z.string().optional(),
  closedByName: z.string().optional(),
});

const reopenDaySchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  reopenedBy: z.string().optional(),
  reopenedByName: z.string().optional(),
});

const openDaySchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  openedBy: z.string().optional(),
  openedByName: z.string().optional(),
});

const EMPTY_METRICS: DayClosingRecord["metrics"] = {
  todaySales: 0,
  todayPurchases: 0,
  todayOperatingExpenses: 0,
  todayInventoryInvestment: 0,
  todayStaffPaymentsRecorded: 0,
  cashBeforeClosing: 0,
};

const EMPTY_SUMMARY: DayClosingSummary = {
  sales: 0,
  expenses: 0,
  inventoryInvestment: 0,
  staffPayments: 0,
  remainingCash: 0,
  inventoryFund: 0,
  operatingFund: 0,
};

function mapDayClosing(record: {
  id: string;
  date: string;
  branchId: string;
  status: string;
  metrics: unknown;
  staffPayouts: unknown;
  expectedCash: number;
  actualCashCounted: number;
  cashDifference: number;
  cashStatus: string;
  reconciliationNotes: string | null;
  summary: unknown;
  closedBy: string | null;
  closedByName: string | null;
  closedAt: Date | null;
  openedBy: string | null;
  openedByName: string | null;
  openedAt: Date | null;
  reopenedBy: string | null;
  reopenedByName: string | null;
  reopenedAt: Date | null;
  closingNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}, branchCode: Branch): DayClosingRecord {
  return {
    id: record.id,
    date: record.date,
    branch: branchCode,
    status: record.status as DayClosingStatus,
    metrics: record.metrics as DayClosingRecord["metrics"],
    staffPayouts: record.staffPayouts as DayClosingStaffPayout[],
    expectedCash: record.expectedCash,
    actualCashCounted: record.actualCashCounted,
    cashDifference: record.cashDifference,
    cashStatus: record.cashStatus as DayClosingRecord["cashStatus"],
    reconciliationNotes: record.reconciliationNotes ?? undefined,
    summary: record.summary as DayClosingRecord["summary"],
    closedBy: record.closedBy ?? undefined,
    closedByName: record.closedByName ?? undefined,
    closedAt: record.closedAt?.toISOString(),
    openedBy: record.openedBy ?? undefined,
    openedByName: record.openedByName ?? undefined,
    openedAt: record.openedAt?.toISOString(),
    reopenedBy: record.reopenedBy ?? undefined,
    reopenedByName: record.reopenedByName ?? undefined,
    reopenedAt: record.reopenedAt?.toISOString(),
    closingNotes: record.closingNotes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function mapDayClosingRecord(record: {
  id: string;
  date: string;
  branchId: string;
  status: string;
  metrics: unknown;
  staffPayouts: unknown;
  expectedCash: number;
  actualCashCounted: number;
  cashDifference: number;
  cashStatus: string;
  reconciliationNotes: string | null;
  summary: unknown;
  closedBy: string | null;
  closedByName: string | null;
  closedAt: Date | null;
  openedBy: string | null;
  openedByName: string | null;
  openedAt: Date | null;
  reopenedBy: string | null;
  reopenedByName: string | null;
  reopenedAt: Date | null;
  closingNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Promise<DayClosingRecord> {
  const branchCode = await getBranchCodeById(record.branchId);
  return mapDayClosing(record, branchCode as Branch);
}

export async function listDayClosings(
  branchFilter?: BranchIdFilter
): Promise<DayClosingRecord[]> {
  const records = await prisma.dayClosing.findMany({
    where: branchFilter ? { branchId: branchFilter.branchId } : undefined,
    include: { branch: true },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });

  return records.map((record) => mapDayClosing(record, record.branch.code as Branch));
}

async function resolveActorDisplayName(
  session: Awaited<ReturnType<typeof requireSession>>,
  staffName?: string | null
): Promise<string> {
  if (staffName && !isRoleGreetingLabel(staffName)) {
    return staffName;
  }

  if (!isRoleGreetingLabel(session.displayName)) {
    return session.displayName;
  }

  return staffName ?? session.displayName;
}

async function ensureDailyOperationDraft(
  branch: Branch,
  date: string,
  session: Awaited<ReturnType<typeof requireSession>>
) {
  const branchId = await getBranchIdByCode(branch);
  const existing = await prisma.dailyOperation.findUnique({
    where: {
      branchId_date: {
        branchId,
        date,
      },
    },
  });

  if (existing) {
    return;
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      staff: {
        include: {
          role: true,
          branch: true,
          user: true,
        },
      },
    },
  });

  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await upsertDailyOperation({
    id: randomUUID(),
    date,
    time,
    timestamp: now.getTime(),
    branch,
    sales: 0,
    expenses: [],
    notes: "",
    status: "draft",
    staffId: actor?.staff?.id,
    staffName: await resolveActorDisplayName(
      session,
      actor?.staff?.name ?? null
    ),
    createdAt: now.toISOString(),
  });
}

export async function openDay(input: unknown): Promise<DayClosingRecord> {
  const parsed = openDaySchema.parse(input);
  const session = await requireSession();
  assertCanOpenShop(session);
  const branchId = await getBranchIdForSession(session, parsed.branch);

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { staff: true },
  });
  const openedByName =
    parsed.openedByName ??
    (await resolveActorDisplayName(session, actor?.staff?.name ?? null));

  const existing = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
  });

  if (existing?.status === "closed") {
    throw new ApiError(
      "This branch day is closed. Reopen it before opening the shop.",
      {
        status: 409,
        code: "day_closed",
      }
    );
  }

  if (
    existing?.status === "open" &&
    (existing.openedAt || existing.reopenedAt)
  ) {
    throw new ApiError("This branch day is already open.", {
      status: 409,
      code: "day_already_open",
    });
  }

  const now = new Date();
  const record = await prisma.dayClosing.upsert({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
    update: {
      status: "open",
      openedBy: parsed.openedBy ?? session.userId,
      openedByName,
      openedAt: now,
      metrics: EMPTY_METRICS as unknown as Prisma.InputJsonValue,
      staffPayouts: [] as unknown as Prisma.InputJsonValue,
      expectedCash: 0,
      actualCashCounted: 0,
      cashDifference: 0,
      cashStatus: "balanced",
      summary: EMPTY_SUMMARY as unknown as Prisma.InputJsonValue,
      reconciliationNotes: null,
      closingNotes: null,
      closedBy: null,
      closedByName: null,
      closedAt: null,
    },
    create: {
      date: parsed.date,
      branchId,
      status: "open",
      metrics: EMPTY_METRICS as unknown as Prisma.InputJsonValue,
      staffPayouts: [] as unknown as Prisma.InputJsonValue,
      expectedCash: 0,
      actualCashCounted: 0,
      cashDifference: 0,
      cashStatus: "balanced",
      summary: EMPTY_SUMMARY as unknown as Prisma.InputJsonValue,
      openedBy: parsed.openedBy ?? session.userId,
      openedByName,
      openedAt: now,
    },
  });

  await ensureDailyOperationDraft(parsed.branch as Branch, parsed.date, session);

  return mapDayClosingRecord(record);
}

export async function closeDay(input: unknown): Promise<DayClosingRecord> {
  const parsed = closeDaySchema.parse(input);
  const session = await requireSession();
  assertCanCloseDay(session);
  const branchId = await getBranchIdForSession(session, parsed.branch);
  const summary = parsed.summary as unknown as DayClosingSummary;

  const existing = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
  });

  if (existing?.status === "closed") {
    throw new ApiError("This branch day is already closed.", {
      status: 409,
      code: "day_already_closed",
    });
  }

  if (!existing?.openedAt && !existing?.reopenedAt) {
    throw new ApiError("Open the shop before closing the day.", {
      status: 400,
      code: "shop_not_opened",
    });
  }

  const now = new Date();
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      staff: {
        include: {
          role: true,
          branch: true,
          user: true,
        },
      },
    },
  });

  const createdBy =
    actor?.staff &&
    buildStaffActionRecord(
      mapStaffToEntity(actor.staff),
      now.toISOString(),
      parsed.branch as Branch
    );

  await syncClosedDayDailyOperation({
    branch: parsed.branch as Branch,
    date: parsed.date,
    summary,
    closingNotes: parsed.closingNotes,
    createdBy: createdBy || undefined,
  });

  const record = await prisma.dayClosing.upsert({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
    update: {
      status: "closed",
      metrics: parsed.metrics as unknown as Prisma.InputJsonValue,
      staffPayouts: parsed.staffPayouts as unknown as Prisma.InputJsonValue,
      expectedCash: parsed.expectedCash,
      actualCashCounted: parsed.actualCashCounted,
      cashDifference: parsed.cashDifference,
      cashStatus: parsed.cashStatus,
      reconciliationNotes: parsed.reconciliationNotes?.trim() || null,
      summary: parsed.summary as unknown as Prisma.InputJsonValue,
      closedBy: parsed.closedBy ?? null,
      closedByName: parsed.closedByName ?? null,
      closedAt: now,
      closingNotes: parsed.closingNotes?.trim() || null,
      reopenedBy: null,
      reopenedByName: null,
      reopenedAt: null,
    },
    create: {
      date: parsed.date,
      branchId,
      status: "closed",
      metrics: parsed.metrics as unknown as Prisma.InputJsonValue,
      staffPayouts: parsed.staffPayouts as unknown as Prisma.InputJsonValue,
      expectedCash: parsed.expectedCash,
      actualCashCounted: parsed.actualCashCounted,
      cashDifference: parsed.cashDifference,
      cashStatus: parsed.cashStatus,
      reconciliationNotes: parsed.reconciliationNotes?.trim() || null,
      summary: parsed.summary as unknown as Prisma.InputJsonValue,
      closedBy: parsed.closedBy ?? null,
      closedByName: parsed.closedByName ?? null,
      closedAt: now,
      closingNotes: parsed.closingNotes?.trim() || null,
    },
  });

  return mapDayClosingRecord(record);
}

export async function reopenDay(input: unknown): Promise<DayClosingRecord> {
  const parsed = reopenDaySchema.parse(input);
  const session = await requireSession();
  const branchId = await getBranchIdForSession(session, parsed.branch);

  if (
    session.role !== "owner" &&
    migrateLegacyAuthRole(session.role) !== "branch-manager"
  ) {
    throw new ApiError("Only Owner or Branch Manager can reopen a closed day.", {
      status: 403,
      code: "forbidden",
    });
  }

  const existing = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
  });

  if (!existing || existing.status !== "closed") {
    throw new ApiError("This branch day is not closed.", {
      status: 400,
      code: "day_not_closed",
    });
  }

  const record = await prisma.dayClosing.update({
    where: { id: existing.id },
    data: {
      status: "open",
      reopenedBy: parsed.reopenedBy ?? null,
      reopenedByName: parsed.reopenedByName ?? null,
      reopenedAt: new Date(),
    },
  });

  return mapDayClosingRecord(record);
}

export async function getClosedDayRecord(
  branch: Branch,
  date: string
): Promise<DayClosingRecord | null> {
  const branchId = await getBranchIdByCode(branch);
  const record = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date,
      },
    },
  });

  if (!record || record.status !== "closed") {
    return null;
  }

  return mapDayClosingRecord(record);
}

export async function isBranchDayOpened(
  branch: Branch,
  date: string
): Promise<boolean> {
  const branchId = await getBranchIdByCode(branch);
  const record = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date,
      },
    },
  });

  if (!record || record.status !== "open") {
    return false;
  }

  return !!(record.openedAt || record.reopenedAt);
}

export async function isBranchDayClosed(
  branch: Branch,
  date: string
): Promise<boolean> {
  const record = await getClosedDayRecord(branch, date);
  return record !== null;
}
