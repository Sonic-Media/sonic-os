import { randomUUID } from "crypto";
import type { BranchIdFilter } from "@/lib/server/branch-scope";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { assertSessionCanAccessBranchCode } from "@/lib/server/branch-lookup";
import { assertDestructiveApiAllowed } from "@/lib/server/data-protection/guards";
import { recordDeleteAudit } from "@/lib/server/data-protection/audit";
import { toJsonField } from "@/lib/server/json-fields";
import { mapStaffPaymentToEntity } from "@/lib/server/mappers/entities";
import {
  assertBranchDayOpenForWrite,
  assertStaffOperationalRole,
} from "@/lib/server/day-closing-guards";
import { requireSession } from "@/lib/server/session";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import {
  STAFF_PAYMENT_CATEGORY_ID,
  STAFF_PAYMENT_CATEGORY_NAME,
  getStaffPaymentTypeLabel,
} from "@/lib/expenses-module/constants";
import type { AuthSession } from "@/types/auth";
import type { StaffPayment, StaffPaymentInput } from "@/types/staff-payment";
import type { StaffActionRecord } from "@/types/staff-session";
import type { Branch } from "@/types";

const paymentInclude = { branch: true, staff: { include: { branch: true } } } as const;

async function loadStaffPaymentRow(id: string) {
  const payment = await prisma.staffPayment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) {
    throw new ApiError("Staff payment not found.", {
      status: 404,
      code: "not_found",
    });
  }

  return payment;
}

function assertStaffPaymentBranchAccess(
  session: AuthSession,
  branchCode: string
): void {
  assertSessionCanAccessBranchCode(session, branchCode);
}

function assertStaffMemberMatchesPaymentBranch(input: {
  staffBranchCode: string;
  paymentBranchCode: string;
}): void {
  if (input.staffBranchCode !== input.paymentBranchCode) {
    throw new ApiError(
      "Staff member does not belong to the payment branch.",
      { status: 403, code: "branch_forbidden" }
    );
  }
}

export async function listStaffPayments(
  branchFilter?: BranchIdFilter
): Promise<StaffPayment[]> {
  const payments = await prisma.staffPayment.findMany({
    where: branchFilter ? { branchId: branchFilter.branchId } : undefined,
    include: paymentInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return payments.map(mapStaffPaymentToEntity);
}

export async function getStaffPaymentByExpenseId(
  expenseId: string
): Promise<StaffPayment | null> {
  const session = await requireSession();
  const payment = await prisma.staffPayment.findFirst({
    where: { expenseId },
    include: paymentInclude,
  });

  if (!payment) {
    return null;
  }

  assertStaffPaymentBranchAccess(session, payment.branch.code);
  return mapStaffPaymentToEntity(payment);
}

export async function createStaffPayment(
  input: StaffPaymentInput,
  paidBy?: StaffActionRecord
): Promise<StaffPayment> {
  if (input.amount <= 0) {
    throw new ApiError("Amount must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    include: {
      branch: true,
      role: true,
    },
  });

  if (!staff) {
    throw new ApiError("Staff member not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const session = await requireSession();
  assertStaffOperationalRole(session);

  if (
    session.staffId &&
    session.staffId !== input.staffId &&
    session.role !== "branch-manager"
  ) {
    throw new ApiError("You can only record your own daily wage.", {
      status: 403,
      code: "forbidden",
    });
  }

  const branchCode = staff.branch.code as Branch;
  assertStaffPaymentBranchAccess(session, branchCode);
  assertStaffMemberMatchesPaymentBranch({
    staffBranchCode: staff.branch.code,
    paymentBranchCode: branchCode,
  });
  await assertBranchDayOpenForWrite(branchCode, input.date);

  const branchId = staff.branchId;

  const duplicatePayment = await prisma.staffPayment.findFirst({
    where: {
      staffId: staff.id,
      branchId,
      date: input.date,
      paymentType: { not: "deduction" },
    },
  });

  if (duplicatePayment) {
    throw new ApiError("Daily wage already recorded for this date.", {
      status: 409,
      code: "duplicate_payment",
    });
  }

  const paymentId = randomUUID();
  const expenseId = randomUUID();
  const paymentLabel = getStaffPaymentTypeLabel(input.paymentType);
  const amount = Math.abs(input.amount);

  await prisma.$transaction(async (tx) => {
    await tx.expenseCategory.upsert({
      where: { id: STAFF_PAYMENT_CATEGORY_ID },
      create: {
        id: STAFF_PAYMENT_CATEGORY_ID,
        name: STAFF_PAYMENT_CATEGORY_NAME,
        isDefault: true,
      },
      update: {},
    });

    await tx.expenseRecord.create({
      data: {
        id: expenseId,
        date: input.date,
        categoryId: STAFF_PAYMENT_CATEGORY_ID,
        categoryName: STAFF_PAYMENT_CATEGORY_NAME,
        description: `${paymentLabel} - ${staff.name}`,
        amount,
        paymentMethod: input.paymentMethod,
        branchId,
        staffPaymentId: paymentId,
        staffPaymentType: input.paymentType,
        paidBy: toJsonField(paidBy),
        notes: input.notes?.trim() || null,
      },
    });

    await tx.staffPayment.create({
      data: {
        id: paymentId,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role.slug,
        amount,
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        branchId,
        date: input.date,
        expenseId,
        paidBy: toJsonField(paidBy),
        notes: input.notes?.trim() || null,
      },
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.STAFF_PAYMENT,
        `${paymentLabel} of ${amount} recorded for ${staff.name} on ${input.date}.`
      );
    }
  });

  const payment = await prisma.staffPayment.findUniqueOrThrow({
    where: { id: paymentId },
    include: paymentInclude,
  });

  return mapStaffPaymentToEntity(payment);
}

export async function getStaffPaymentById(
  id: string
): Promise<StaffPayment | null> {
  const session = await requireSession();
  const payment = await prisma.staffPayment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) {
    return null;
  }

  assertStaffPaymentBranchAccess(session, payment.branch.code);
  return mapStaffPaymentToEntity(payment);
}

export async function updateStaffPayment(
  id: string,
  input: { notes?: string; amount?: number }
): Promise<StaffPayment> {
  const session = await requireSession();
  assertStaffOperationalRole(session);

  const existing = await loadStaffPaymentRow(id);
  const branchCode = existing.branch.code as Branch;
  assertStaffPaymentBranchAccess(session, branchCode);
  assertStaffMemberMatchesPaymentBranch({
    staffBranchCode: existing.staff.branch.code,
    paymentBranchCode: existing.branch.code,
  });
  await assertBranchDayOpenForWrite(branchCode, existing.date);

  if (input.amount !== undefined && input.amount <= 0) {
    throw new ApiError("Amount must be greater than zero.", {
      status: 400,
      code: "validation_error",
    });
  }

  const amount =
    input.amount !== undefined ? Math.abs(input.amount) : existing.amount;

  await prisma.$transaction(async (tx) => {
    await tx.staffPayment.update({
      where: { id },
      data: {
        amount,
        notes: input.notes?.trim() ?? existing.notes,
      },
    });

    await tx.expenseRecord.update({
      where: { id: existing.expenseId },
      data: {
        amount,
        notes: input.notes?.trim() ?? existing.notes,
        description: `${getStaffPaymentTypeLabel(existing.paymentType as StaffPayment["paymentType"])} - ${existing.staffName}`,
      },
    });

    await recordTransactionAudit(
      tx,
      session,
      AUDIT_ACTIONS.STAFF_PAYMENT,
      `Updated staff payment for ${existing.staffName} on ${existing.date}.`
    );
  });

  return mapStaffPaymentToEntity(await loadStaffPaymentRow(id));
}

export async function deleteStaffPayment(id: string): Promise<void> {
  const session = await requireSession();
  assertStaffOperationalRole(session);
  assertDestructiveApiAllowed("Staff payment deletion");

  const existing = await loadStaffPaymentRow(id);
  const branchCode = existing.branch.code as Branch;
  assertStaffPaymentBranchAccess(session, branchCode);
  assertStaffMemberMatchesPaymentBranch({
    staffBranchCode: existing.staff.branch.code,
    paymentBranchCode: existing.branch.code,
  });
  await assertBranchDayOpenForWrite(branchCode, existing.date);

  await prisma.$transaction(async (tx) => {
    await tx.staffPayment.delete({ where: { id } });
    await tx.expenseRecord.update({
      where: { id: existing.expenseId },
      data: { deletedAt: new Date() },
    });
  });

  await recordDeleteAudit(
    session,
    "staff-payments",
    id,
    existing as unknown as Record<string, unknown>
  );
}
