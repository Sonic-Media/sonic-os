import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import {
  assertBusinessDayWipeConfirmation,
  assertIsoBusinessDate,
} from "@/lib/business-day-wipe/constants";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/server/stock-transactions";
import {
  assertSessionCanAccessBranchCode,
  getBranchIdByCode,
} from "@/lib/server/branch-lookup";
import { requireOwner } from "@/lib/server/security/authorization";
import { requireSession } from "@/lib/server/session";
import type { Branch } from "@/types";
import type {
  BusinessDayWipeCounts,
  BusinessDayWipePreview,
  BusinessDayWipeReport,
} from "@/types/financial-correction";

const wipeInputSchema = z.object({
  branch: z.string().trim().min(1),
  date: z.string().trim().min(1),
  confirmation: z.string().trim().min(1),
});

async function resolveNamedBranch(code: string): Promise<{
  id: string;
  code: Branch;
  name: string;
}> {
  const id = await getBranchIdByCode(code);
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id },
    select: { id: true, code: true, name: true },
  });
  return { id: branch.id, code: branch.code as Branch, name: branch.name };
}

async function countDayOwnedRecords(
  branchId: string,
  date: string
): Promise<BusinessDayWipeCounts> {
  const [dailyOperations, expenseRecords, sales, staffPayments, dayClosings] =
    await Promise.all([
      prisma.dailyOperation.findMany({
        where: { branchId, date },
        include: { expenses: true },
      }),
      prisma.expenseRecord.count({ where: { branchId, date } }),
      prisma.sale.findMany({
        where: { branchId, date },
        include: { items: true },
      }),
      prisma.staffPayment.count({ where: { branchId, date } }),
      prisma.dayClosing.count({ where: { branchId, date } }),
    ]);

  return {
    dailyOperations: dailyOperations.length,
    dailyOperationExpenses: dailyOperations.reduce(
      (sum, operation) => sum + operation.expenses.length,
      0
    ),
    expenseRecords,
    sales: sales.length,
    saleLineItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
    staffPayments,
    stockRestored: sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
      0
    ),
    dayClosings,
  };
}

export async function previewBusinessDayWipe(input: {
  branch?: string | null;
  date?: string | null;
}): Promise<BusinessDayWipePreview> {
  const session = await requireSession();
  requireOwner(session);
  const date = assertIsoBusinessDate(String(input.date ?? ""));
  const branch = await resolveNamedBranch(String(input.branch ?? ""));
  assertSessionCanAccessBranchCode(session, branch.code);

  return {
    branch: branch.code,
    branchName: branch.name,
    date,
    confirmationPhrase: `WIPE ${date}`,
    counts: await countDayOwnedRecords(branch.id, date),
  };
}

export async function wipeBusinessDay(input: unknown): Promise<BusinessDayWipeReport> {
  const parsed = wipeInputSchema.parse(input);
  const session = await requireSession();
  requireOwner(session);
  const date = assertIsoBusinessDate(parsed.date);
  assertBusinessDayWipeConfirmation(date, parsed.confirmation);

  const branch = await resolveNamedBranch(parsed.branch);
  assertSessionCanAccessBranchCode(session, branch.code);

  const before = await countDayOwnedRecords(branch.id, date);

  const correctionId = await prisma.$transaction(async (tx) => {
    const sales = await tx.sale.findMany({
      where: { branchId: branch.id, date },
      include: { items: true },
    });

    for (const sale of sales) {
      for (const item of sale.items) {
        await applyStockMovement(tx, {
          productId: item.productId,
          movement: "in",
          quantity: item.quantity,
          reason: "Business day wipe",
          branchId: branch.id,
          date,
          notes: `Restore stock after wiping ${date}`,
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { deletedAt: new Date(), status: "voided" },
      });
    }

    await tx.staffPayment.deleteMany({
      where: { branchId: branch.id, date },
    });

    await tx.expenseRecord.updateMany({
      where: { branchId: branch.id, date },
      data: { deletedAt: new Date() },
    });

    await tx.dailyOperation.deleteMany({
      where: { branchId: branch.id, date },
    });

    await tx.dayClosing.deleteMany({
      where: { branchId: branch.id, date },
    });

    const created = await tx.financialCorrection.create({
      data: {
        kind: "business_day_wipe",
        sourceType: "day_closing",
        sourceId: `${branch.code}:${date}`,
        reason: `Wiped operational records for ${branch.name} ${date}`,
        actorUserId: session.userId,
        actorName: session.displayName,
        actorRole: session.role,
        branchCode: branch.code,
        businessDate: date,
        metadata: { counts: before } as unknown as Prisma.InputJsonValue,
        changedFields: ["daily_operations", "expenses", "sales", "staff_payments", "day_closing"],
      },
    });

    await tx.auditLogEntry.create({
      data: {
        userId: session.userId,
        userName: session.displayName,
        role: session.role,
        branchCode: branch.code,
        action: AUDIT_ACTIONS.BUSINESS_DAY_WIPE,
        module: "operations",
        recordId: created.id,
        detail: `Wiped ${branch.name} ${date}`,
        oldValues: before as unknown as object,
        newValues: { reset: true },
      },
    });

    await tx.authAuditLog.create({
      data: {
        userId: session.userId,
        username: session.username,
        branchCode: branch.code,
        action: AUDIT_ACTIONS.BUSINESS_DAY_WIPE,
        detail: `${branch.code} ${date}`,
      },
    });

    return created.id;
  });

  return {
    branch: branch.code,
    branchName: branch.name,
    date,
    wiped: before,
    correctionId,
  };
}
