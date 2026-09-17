import type { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { ApiError } from "@/lib/api/errors";
import { getTodayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  getActiveStaffAttendance,
  getCurrentShopSessionStaff,
  isStaffOnShift,
} from "@/lib/staff/attendance";
import {
  getBranchIdByCode,
  getBranchIdForSession,
} from "@/lib/server/branch-lookup";
import {
  createAuditLogEntry,
  listStaffAttendanceEntries,
} from "@/lib/server/services/system-audit-log-service";
import { getLinkedStaffForUser } from "@/lib/server/services/staff-service";
import { mapStaffToEntity } from "@/lib/server/mappers/entities";
import { requireSession } from "@/lib/server/session";
import { assertStaffOperationalRole } from "@/lib/server/day-closing-guards";
import { isRoleGreetingLabel } from "@/lib/ux/user-display";
import type { AuditLogRecord } from "@/types/audit-log";
import type { Branch } from "@/types";
import type { StaffAuditRecord } from "@/types/staff-audit";

const ATTENDANCE_ACTIONS = [
  AUDIT_ACTIONS.START_SHIFT,
  AUDIT_ACTIONS.END_SHIFT,
  AUDIT_ACTIONS.CLOCK_IN,
  AUDIT_ACTIONS.CLOCK_OUT,
  AUDIT_ACTIONS.OPEN_DAY,
] as const;

const attendanceActionSchema = z.object({
  action: z.enum(["clock-in"]),
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1).optional(),
});

const startShiftInputSchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  staffId: z.string().trim().min(1),
  staffName: z.string().trim().min(1),
  role: z.string().trim().min(1),
  detail: z.string().trim().optional(),
});

function mapAuditToStaffRecord(record: AuditLogRecord): StaffAuditRecord {
  return {
    id: record.id,
    timestamp: record.timestamp,
    staffId: record.userId,
    staffName: record.userName,
    role: record.role as StaffAuditRecord["role"],
    branch: record.branch,
    action: record.action,
    module: record.module,
    recordId: record.recordId,
  };
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

async function fetchBranchAttendanceAudit(
  branch: Branch,
  date: string
): Promise<StaffAuditRecord[]> {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const records = await prisma.auditLogEntry.findMany({
    where: {
      branchCode: branch,
      action: { in: [...ATTENDANCE_ACTIONS] },
      OR: [
        { recordId: date },
        {
          timestamp: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      ],
    },
    orderBy: { timestamp: "asc" },
  });

  return records.map((record) =>
    mapAuditToStaffRecord({
      id: record.id,
      timestamp: record.timestamp.toISOString(),
      userId: record.userId,
      userName: record.userName,
      role: record.role,
      branch: record.branchCode as Branch,
      action: record.action,
      module: record.module as AuditLogRecord["module"],
      recordId: record.recordId ?? undefined,
    })
  );
}

async function assertBranchDayOpen(
  session: Awaited<ReturnType<typeof requireSession>>,
  branch: Branch,
  date: string
): Promise<void> {
  const branchId = await getBranchIdForSession(session, branch);
  const record = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date,
      },
    },
  });

  if (
    !record ||
    record.status !== "open" ||
    !(record.openedAt || record.reopenedAt)
  ) {
    throw new ApiError(
      "The branch must be open before you can clock in.",
      {
        status: 409,
        code: "branch_not_open",
      }
    );
  }
}

async function listOpenShiftStaffForBusinessDay(
  branch: Branch,
  date: string,
  options: { requireShopSessionOpen: boolean }
): Promise<Array<{ staffId: string; staffName: string }>> {
  const branchId = await getBranchIdByCode(branch);

  const dayClosing = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date,
      },
    },
  });

  const shopSessionOpen = Boolean(
    dayClosing &&
      (dayClosing.status === "open" || dayClosing.status === "close_requested") &&
      (dayClosing.openedAt || dayClosing.reopenedAt)
  );

  // Current UI/API SoT: closed shop ⇒ nobody on shift.
  if (options.requireShopSessionOpen && !shopSessionOpen) {
    return [];
  }

  const auditRecords = await fetchBranchAttendanceAudit(branch, date);

  const staffRows = await prisma.staff.findMany({
    where: {
      branchId,
      active: true,
    },
    include: {
      role: true,
      branch: true,
      user: true,
    },
  });

  const staff = staffRows.map(mapStaffToEntity);

  if (!options.requireShopSessionOpen) {
    // Closing path: end whatever attendance sessions are still open (audit SoT).
    return getActiveStaffAttendance(staff, branch, date, auditRecords).map(
      (status) => ({
        staffId: status.staffId,
        staffName: status.staffName,
      })
    );
  }

  const activeOnShift = getCurrentShopSessionStaff(
    staff,
    branch,
    date,
    auditRecords,
    true,
    dayClosing
      ? {
          openedBy: dayClosing.openedBy,
          openedByName: dayClosing.openedByName,
          openedAt: dayClosing.openedAt?.toISOString() ?? null,
          reopenedAt: dayClosing.reopenedAt?.toISOString() ?? null,
          date: dayClosing.date,
        }
      : null
  );

  return activeOnShift.map((status) => ({
    staffId: status.staffId,
    staffName: status.staffName,
  }));
}

export async function getStaffOnShiftAtBranch(
  branch: Branch,
  date: string
): Promise<Array<{ staffId: string; staffName: string }>> {
  return listOpenShiftStaffForBusinessDay(branch, date, {
    requireShopSessionOpen: true,
  });
}

export async function createStartShiftAudit(
  input: z.infer<typeof startShiftInputSchema>,
  tx?: Prisma.TransactionClient
): Promise<AuditLogRecord> {
  const parsed = startShiftInputSchema.parse(input);
  const data = {
    userId: parsed.staffId,
    userName: parsed.staffName,
    role: parsed.role,
    branchCode: parsed.branch,
    action: AUDIT_ACTIONS.START_SHIFT,
    module: "operations",
    recordId: parsed.date,
    detail: parsed.detail?.trim() || "Branch opened for the day",
  };

  if (tx) {
    const record = await tx.auditLogEntry.create({ data });
    return {
      id: record.id,
      timestamp: record.timestamp.toISOString(),
      userId: record.userId,
      userName: record.userName,
      role: record.role,
      branch: record.branchCode as Branch,
      action: record.action,
      module: record.module as AuditLogRecord["module"],
      recordId: record.recordId ?? undefined,
    };
  }

  return createAuditLogEntry({
    userId: parsed.staffId,
    userName: parsed.staffName,
    role: parsed.role,
    branch: parsed.branch,
    action: AUDIT_ACTIONS.START_SHIFT,
    module: "operations",
    recordId: parsed.date,
    detail: parsed.detail?.trim() || "Branch opened for the day",
  });
}

const endShiftInputSchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  staffId: z.string().trim().min(1),
  staffName: z.string().trim().min(1),
  role: z.string().trim().min(1),
  detail: z.string().trim().optional(),
});

export async function createEndShiftAudit(
  input: z.infer<typeof endShiftInputSchema>,
  tx?: Prisma.TransactionClient
): Promise<AuditLogRecord> {
  const parsed = endShiftInputSchema.parse(input);
  const data = {
    userId: parsed.staffId,
    userName: parsed.staffName,
    role: parsed.role,
    branchCode: parsed.branch,
    action: AUDIT_ACTIONS.END_SHIFT,
    module: "operations",
    recordId: parsed.date,
    detail: parsed.detail?.trim() || "Branch closed for the day",
  };

  if (tx) {
    const record = await tx.auditLogEntry.create({ data });
    return {
      id: record.id,
      timestamp: record.timestamp.toISOString(),
      userId: record.userId,
      userName: record.userName,
      role: record.role,
      branch: record.branchCode as Branch,
      action: record.action,
      module: record.module as AuditLogRecord["module"],
      recordId: record.recordId ?? undefined,
    };
  }

  return createAuditLogEntry({
    userId: parsed.staffId,
    userName: parsed.staffName,
    role: parsed.role,
    branch: parsed.branch,
    action: AUDIT_ACTIONS.END_SHIFT,
    module: "operations",
    recordId: parsed.date,
    detail: parsed.detail?.trim() || "Branch closed for the day",
  });
}

/**
 * End every open shift at the branch for the business day (shop-session SoT).
 * Never blocks closing — best-effort attendance completion.
 */
export async function endOpenShiftsAtBranch(
  branch: Branch,
  date: string,
  tx?: Prisma.TransactionClient
): Promise<AuditLogRecord[]> {
  // Do not require shop session still open — close may have already flipped status.
  const onShift = await listOpenShiftStaffForBusinessDay(branch, date, {
    requireShopSessionOpen: false,
  });
  if (onShift.length === 0) {
    return [];
  }

  const staffRows = await (tx ?? prisma).staff.findMany({
    where: {
      id: { in: onShift.map((member) => member.staffId) },
    },
    include: {
      role: true,
      branch: true,
      user: true,
    },
  });
  const byId = new Map(staffRows.map((row) => [row.id, mapStaffToEntity(row)]));

  const ended: AuditLogRecord[] = [];
  for (const member of onShift) {
    const staffEntity = byId.get(member.staffId);
    const record = await createEndShiftAudit(
      {
        branch,
        date,
        staffId: member.staffId,
        staffName: member.staffName,
        role: staffEntity?.role ?? "cashier",
        detail: "Branch closed for the day",
      },
      tx
    );
    ended.push(record);
  }

  return ended;
}

export async function recordAttendanceAction(
  input: unknown
): Promise<AuditLogRecord> {
  const parsed = attendanceActionSchema.parse(input);
  const date = parsed.date ?? getTodayISO();
  const branch = parsed.branch as Branch;
  const session = await requireSession();
  assertStaffOperationalRole(session);
  await getBranchIdForSession(session, branch);

  const linkedStaff = await getLinkedStaffForUser(session.userId);
  if (!linkedStaff) {
    throw new ApiError("No staff profile is linked to your account.", {
      status: 404,
      code: "staff_not_linked",
    });
  }

  const staffName = await resolveActorDisplayName(session, linkedStaff.name);
  const auditRecords = (
    await listStaffAttendanceEntries(linkedStaff.id, date)
  ).map(mapAuditToStaffRecord);

  if (parsed.action === "clock-in") {
    await assertBranchDayOpen(session, branch, date);

    if (isStaffOnShift(linkedStaff.id, branch, date, auditRecords)) {
      throw new ApiError("You are already on shift.", {
        status: 409,
        code: "already_on_shift",
      });
    }

    return createAuditLogEntry({
      userId: linkedStaff.id,
      userName: staffName,
      role: linkedStaff.role,
      branch,
      action: AUDIT_ACTIONS.CLOCK_IN,
      module: "operations",
    });
  }

  throw new ApiError("Unsupported attendance action.", {
    status: 400,
    code: "invalid_attendance_action",
  });
}
