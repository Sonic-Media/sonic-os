import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { prisma } from "@/lib/db";
import { isStaffPaymentCategory } from "@/lib/expenses-module/constants";
import { assertSessionCanAccessBranchCode } from "@/lib/server/branch-lookup";
import { isClosedBusinessDayStatus } from "@/lib/day-closing/status";
import { requireOwner } from "@/lib/server/security/authorization";
import { requireSession } from "@/lib/server/session";
import type { FinancialCorrectionRecord } from "@/types/financial-correction";
import type { Branch } from "@/types";

const correctionInputSchema = z.object({
  sourceType: z.enum(["expense_record", "daily_operation_expense"]),
  sourceId: z.string().trim().min(1),
  amount: z.number().int().positive().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().min(1, "A correction reason is required.").max(2000),
});

function mapCorrection(row: {
  id: string;
  kind: string;
  sourceType: string;
  sourceId: string;
  originalAmount: number | null;
  newAmount: number | null;
  originalDescription: string | null;
  newDescription: string | null;
  changedFields: string[];
  reason: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  branchCode: string;
  businessDate: string;
  metadata: unknown;
  createdAt: Date;
}): FinancialCorrectionRecord {
  return {
    id: row.id,
    kind: row.kind as FinancialCorrectionRecord["kind"],
    sourceType: row.sourceType as FinancialCorrectionRecord["sourceType"],
    sourceId: row.sourceId,
    originalAmount: row.originalAmount,
    newAmount: row.newAmount,
    originalDescription: row.originalDescription,
    newDescription: row.newDescription,
    changedFields: row.changedFields,
    reason: row.reason,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorRole: row.actorRole,
    branchCode: row.branchCode as Branch,
    businessDate: row.businessDate,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertDayClosed(branchCode: Branch, date: string): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { code: branchCode },
    select: { id: true },
  });
  if (!branch) {
    throw new ApiError("Branch not found.", { status: 404, code: "not_found" });
  }

  const closing = await prisma.dayClosing.findUnique({
    where: { branchId_date: { branchId: branch.id, date } },
  });

  if (!closing || !isClosedBusinessDayStatus(closing.status)) {
    throw new ApiError("Closed-day corrections are only allowed after the day is closed.", {
      status: 409,
      code: "day_not_closed",
    });
  }
}

export async function listFinancialCorrections(filters: {
  branch?: string | null;
  date?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
}): Promise<FinancialCorrectionRecord[]> {
  const session = await requireSession();
  requireOwner(session);

  const rows = await prisma.financialCorrection.findMany({
    where: {
      ...(filters.branch
        ? { branchCode: filters.branch }
        : {}),
      ...(filters.date ? { businessDate: filters.date } : {}),
      ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
      ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .filter((row) => {
      try {
        assertSessionCanAccessBranchCode(session, row.branchCode);
        return true;
      } catch {
        return false;
      }
    })
    .map(mapCorrection);
}

export async function correctClosedDayExpenditure(
  input: unknown
): Promise<{
  sourceType: "expense_record" | "daily_operation_expense";
  sourceId: string;
  amount: number;
  description: string;
  correction: FinancialCorrectionRecord;
  dayStatus: string;
  openedAt: string | null;
  closedAt: string | null;
}> {
  const parsed = correctionInputSchema.parse(input);
  const session = await requireSession();
  requireOwner(session);

  if (parsed.amount === undefined && parsed.description === undefined) {
    throw new ApiError("Provide a new amount or description to correct.", {
      status: 400,
      code: "validation_error",
    });
  }

  return prisma.$transaction(async (tx) => {
    let branchCode: Branch;
    let businessDate: string;
    let originalAmount: number;
    let originalDescription: string;
    let newAmount: number;
    let newDescription: string;
    let sourceId = parsed.sourceId;
    const changedFields: string[] = [];

    if (parsed.sourceType === "expense_record") {
      const existing = await tx.expenseRecord.findUnique({
        where: { id: parsed.sourceId },
        include: { branch: true },
      });
      if (!existing) {
        throw new ApiError("Expenditure not found.", {
          status: 404,
          code: "not_found",
        });
      }
      if (existing.staffPaymentId || isStaffPaymentCategory(existing.categoryId)) {
        throw new ApiError("Staff payment expenses cannot be corrected here.", {
          status: 400,
          code: "staff_payment_expense",
        });
      }

      assertSessionCanAccessBranchCode(session, existing.branch.code);
      branchCode = existing.branch.code as Branch;
      businessDate = existing.date;
      originalAmount = existing.amount;
      originalDescription = existing.description;
      newAmount = parsed.amount ?? existing.amount;
      newDescription = parsed.description ?? existing.description;

      await assertDayClosed(branchCode, businessDate);

      if (newAmount !== originalAmount) changedFields.push("amount");
      if (newDescription !== originalDescription) changedFields.push("description");
      if (changedFields.length === 0) {
        throw new ApiError("No changes were provided.", {
          status: 400,
          code: "validation_error",
        });
      }

      await tx.expenseRecord.update({
        where: { id: existing.id },
        data: {
          amount: newAmount,
          description: newDescription,
        },
      });

      const matchingOperation = await tx.dailyOperation.findUnique({
        where: {
          branchId_date: { branchId: existing.branchId, date: existing.date },
        },
        include: { expenses: true },
      });
      const matchingLine = matchingOperation?.expenses.find(
        (line) =>
          line.name.trim().toLowerCase() === originalDescription.trim().toLowerCase() &&
          line.amount === originalAmount
      );
      if (matchingLine) {
        await tx.dailyOperationExpense.update({
          where: { id: matchingLine.id },
          data: { amount: newAmount, name: newDescription },
        });
      }
    } else {
      const existing = await tx.dailyOperationExpense.findUnique({
        where: { id: parsed.sourceId },
        include: {
          dailyOperation: { include: { branch: true } },
        },
      });
      if (!existing) {
        throw new ApiError("Expenditure not found.", {
          status: 404,
          code: "not_found",
        });
      }

      assertSessionCanAccessBranchCode(session, existing.dailyOperation.branch.code);
      branchCode = existing.dailyOperation.branch.code as Branch;
      businessDate = existing.dailyOperation.date;
      originalAmount = existing.amount;
      originalDescription = existing.name;
      newAmount = parsed.amount ?? existing.amount;
      newDescription = parsed.description ?? existing.name;
      sourceId = existing.id;

      await assertDayClosed(branchCode, businessDate);

      if (newAmount !== originalAmount) changedFields.push("amount");
      if (newDescription !== originalDescription) changedFields.push("description");
      if (changedFields.length === 0) {
        throw new ApiError("No changes were provided.", {
          status: 400,
          code: "validation_error",
        });
      }

      await tx.dailyOperationExpense.update({
        where: { id: existing.id },
        data: { amount: newAmount, name: newDescription },
      });

      const matchingRecords = await tx.expenseRecord.findMany({
        where: {
          branchId: existing.dailyOperation.branchId,
          date: existing.dailyOperation.date,
          amount: originalAmount,
          deletedAt: null,
        },
      });
      const matchingRecord = matchingRecords.find(
        (record) =>
          record.description.trim().toLowerCase() ===
            originalDescription.trim().toLowerCase() &&
          !record.staffPaymentId
      );
      if (matchingRecord) {
        await tx.expenseRecord.update({
          where: { id: matchingRecord.id },
          data: { amount: newAmount, description: newDescription },
        });
      }
    }

    const closing = await tx.dayClosing.findFirst({
      where: {
        date: businessDate,
        branch: { code: branchCode },
      },
    });

    const branchRow = await tx.branch.findFirst({
      where: { code: branchCode },
      select: { id: true },
    });
    if (branchRow) {
      const operatingTotal = await tx.expenseRecord.aggregate({
        where: {
          branchId: branchRow.id,
          date: businessDate,
          staffPaymentId: null,
          deletedAt: null,
          NOT: { categoryId: "staff-payment" },
        },
        _sum: { amount: true },
      });
      const operation = await tx.dailyOperation.findUnique({
        where: {
          branchId_date: { branchId: branchRow.id, date: businessDate },
        },
        include: { expenses: true },
      });
      const summaryLine = operation?.expenses.find(
        (line) => line.name.trim().toLowerCase() === "operating expenses"
      );
      if (summaryLine && operatingTotal._sum.amount !== null) {
        await tx.dailyOperationExpense.update({
          where: { id: summaryLine.id },
          data: { amount: operatingTotal._sum.amount },
        });
      }
    }

    const created = await tx.financialCorrection.create({
      data: {
        kind: "expense_correction",
        sourceType: parsed.sourceType,
        sourceId,
        originalAmount,
        newAmount,
        originalDescription,
        newDescription,
        changedFields,
        reason: parsed.reason,
        actorUserId: session.userId,
        actorName: session.displayName,
        actorRole: session.role,
        branchCode,
        businessDate,
        metadata: {
          openedAt: closing?.openedAt?.toISOString() ?? null,
          closedAt: closing?.closedAt?.toISOString() ?? null,
          dayStatus: closing?.status ?? null,
        },
      },
    });

    await tx.auditLogEntry.create({
      data: {
        userId: session.userId,
        userName: session.displayName,
        role: session.role,
        branchCode,
        action: AUDIT_ACTIONS.EXPENSE_CORRECTED,
        module: "expenses",
        recordId: sourceId,
        detail: parsed.reason,
        oldValues: {
          amount: originalAmount,
          description: originalDescription,
        },
        newValues: {
          amount: newAmount,
          description: newDescription,
        },
      },
    });

    await tx.authAuditLog.create({
      data: {
        userId: session.userId,
        username: session.username,
        branchCode,
        action: AUDIT_ACTIONS.EXPENSE_CORRECTED,
        detail: `${businessDate} ${originalDescription}: ${originalAmount} → ${newAmount}`,
      },
    });

    return {
      sourceType: parsed.sourceType,
      sourceId,
      amount: newAmount,
      description: newDescription,
      correction: mapCorrection(created),
      dayStatus: closing?.status ?? "closed",
      openedAt: closing?.openedAt?.toISOString() ?? null,
      closedAt: closing?.closedAt?.toISOString() ?? null,
    };
  });
}
