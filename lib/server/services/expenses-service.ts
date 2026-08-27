import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/prisma";
import { getBranchIdForSession } from "@/lib/server/branch-lookup";
import { toJsonField } from "@/lib/server/json-fields";
import {
  mapExpenseCategoryToEntity,
  mapExpenseRecordToEntity,
} from "@/lib/server/mappers/entities";
import { requireSession } from "@/lib/server/session";
import {
  assertBranchDayOpenForWrite,
  assertStaffOperationalRole,
} from "@/lib/server/day-closing-guards";
import { getBranchCodeById } from "@/lib/server/branch-lookup";
import { recordDeleteAudit } from "@/lib/server/data-protection/audit";
import { assertDestructiveApiAllowed } from "@/lib/server/data-protection/guards";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import {
  STAFF_PAYMENT_CATEGORY_ID,
  isStaffPaymentCategory,
} from "@/lib/expenses-module/constants";
import { isStaffPaymentExpense } from "@/lib/staff-payments/calculations";
import {
  hasValidationErrors,
  validateExpenseRecordInput,
} from "@/lib/expenses-module/validation";
import type { AuthSession } from "@/types/auth";
import type {
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCategoryUpdateInput,
  ExpenseRecord,
  ExpenseRecordInput,
  ExpenseRecordUpdateInput,
} from "@/types/expenses-module";
import type { StaffActionRecord } from "@/types/staff-session";
import type { StaffRoleId } from "@/types/staff-role";

const expenseInclude = { branch: true } as const;

async function resolveExpenseStaff(
  tx: Prisma.TransactionClient,
  createdBy: StaffActionRecord | undefined,
  session: AuthSession
): Promise<{
  staffId: string | null;
  staffName: string | null;
  staffRole: StaffRoleId | null;
}> {
  let staffId = createdBy?.staffId ?? null;
  let staffName = createdBy?.staffName ?? null;
  let staffRole: StaffRoleId | null = createdBy?.role ?? null;

  if (!staffId) {
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      include: { staff: { include: { role: true } } },
    });
    if (user?.staffId) {
      staffId = user.staffId;
      staffName = user.staff?.name ?? null;
      staffRole = (user.staff?.role?.slug as StaffRoleId | undefined) ?? null;
    }
  }

  if (staffId && !staffName) {
    const staffMember = await tx.staff.findUnique({
      where: { id: staffId },
      select: { name: true, role: { select: { slug: true } } },
    });
    staffName = staffMember?.name ?? null;
    staffRole = staffRole ?? (staffMember?.role?.slug as StaffRoleId | undefined) ?? null;
  }

  return { staffId, staffName, staffRole };
}

function assertValidExpenseInput(
  input: ExpenseRecordInput | ExpenseRecordUpdateInput
): void {
  const errors = validateExpenseRecordInput(input);
  if (hasValidationErrors(errors)) {
    const message =
      Object.values(errors).find((value) => typeof value === "string" && value) ??
      "Invalid expense input.";
    throw new ApiError(message, {
      status: 400,
      code: "validation_error",
    });
  }
}

export async function listCategories(): Promise<ExpenseCategory[]> {
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });

  return categories.map(mapExpenseCategoryToEntity);
}

export async function createCategory(
  input: ExpenseCategoryInput
): Promise<ExpenseCategory> {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Category name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const duplicate = await prisma.expenseCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (duplicate) {
    throw new ApiError("A category with this name already exists.", {
      status: 409,
      code: "duplicate_category",
    });
  }

  const category = await prisma.expenseCategory.create({
    data: {
      id: randomUUID(),
      name,
      isDefault: false,
    },
  });

  return mapExpenseCategoryToEntity(category);
}

export async function updateCategory(
  id: string,
  input: ExpenseCategoryUpdateInput
): Promise<ExpenseCategory> {
  if (id === STAFF_PAYMENT_CATEGORY_ID) {
    throw new ApiError(
      "Staff Payment is a system category and cannot be edited.",
      { status: 400, code: "system_category" }
    );
  }

  const existing = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Category not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Category name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const duplicate = await prisma.expenseCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: { id },
    },
  });

  if (duplicate) {
    throw new ApiError("A category with this name already exists.", {
      status: 409,
      code: "duplicate_category",
    });
  }

  const category = await prisma.$transaction(async (tx) => {
    if (existing.name !== name) {
      await tx.expenseRecord.updateMany({
        where: { categoryId: id },
        data: { categoryName: name },
      });
    }

    return tx.expenseCategory.update({
      where: { id },
      data: { name },
    });
  });

  return mapExpenseCategoryToEntity(category);
}

export async function deleteCategory(id: string): Promise<void> {
  if (id === STAFF_PAYMENT_CATEGORY_ID) {
    throw new ApiError(
      "Staff Payment is a system category and cannot be deleted.",
      { status: 400, code: "system_category" }
    );
  }

  const existing = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Category not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const inUse = await prisma.expenseRecord.count({ where: { categoryId: id } });
  if (inUse > 0) {
    throw new ApiError("Cannot delete a category that is used by expenses.", {
      status: 409,
      code: "category_in_use",
    });
  }

  await prisma.expenseCategory.delete({ where: { id } });
}

export async function listExpenses(): Promise<ExpenseRecord[]> {
  const expenses = await prisma.expenseRecord.findMany({
    include: expenseInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return expenses.map(mapExpenseRecordToEntity);
}

export async function createExpense(
  input: ExpenseRecordInput,
  createdBy?: StaffActionRecord
): Promise<ExpenseRecord> {
  assertValidExpenseInput(input);

  if (isStaffPaymentCategory(input.categoryId)) {
    throw new ApiError(
      "Staff payment expenses are managed in Staff Payments.",
      { status: 400, code: "staff_payment_category" }
    );
  }

  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new ApiError("Category not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const session = await requireSession();
  assertStaffOperationalRole(session);
  await assertBranchDayOpenForWrite(input.branch, input.date);
  const branchId = await getBranchIdForSession(session, input.branch);

  const record = await prisma.$transaction(async (tx) => {
    const { staffId, staffName, staffRole } = await resolveExpenseStaff(
      tx,
      createdBy,
      session
    );

    const created = await tx.expenseRecord.create({
      data: {
        date: input.date,
        categoryId: category.id,
        categoryName: category.name,
        description: input.description.trim(),
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        branchId,
        staffId,
        staffName,
        staffRole,
        createdBy: toJsonField(createdBy),
        notes: input.notes?.trim() || null,
      },
      include: expenseInclude,
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.EXPENSE_ADDED,
        `${category.name}: ${input.description.trim()} (${input.amount}).`
      );
    }

    return created;
  });

  return mapExpenseRecordToEntity(record);
}

export async function updateExpense(
  id: string,
  input: ExpenseRecordUpdateInput
): Promise<ExpenseRecord> {
  const existing = await prisma.expenseRecord.findUnique({
    where: { id },
    include: expenseInclude,
  });

  if (!existing) {
    throw new ApiError("Expense not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const mapped = mapExpenseRecordToEntity(existing);
  if (existing.staffPaymentId || isStaffPaymentExpense(mapped)) {
    throw new ApiError(
      "Staff payment expenses are managed in Staff Payments.",
      { status: 400, code: "staff_payment_expense" }
    );
  }

  if (isStaffPaymentCategory(input.categoryId)) {
    throw new ApiError(
      "Staff payment expenses are managed in Staff Payments.",
      { status: 400, code: "staff_payment_category" }
    );
  }

  assertValidExpenseInput(input);

  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new ApiError("Category not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const session = await requireSession();
  assertStaffOperationalRole(session);
  await assertBranchDayOpenForWrite(input.branch, input.date);
  const branchId = await getBranchIdForSession(session, input.branch);

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.expenseRecord.update({
      where: { id },
      data: {
        date: input.date,
        categoryId: category.id,
        categoryName: category.name,
        description: input.description.trim(),
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        branchId,
        notes: input.notes?.trim() || null,
      },
      include: expenseInclude,
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.EXPENSE_EDITED,
        `${category.name}: ${input.description.trim()} (${input.amount}).`
      );
    }

    return updated;
  });

  return mapExpenseRecordToEntity(record);
}

export async function deleteExpense(id: string): Promise<void> {
  const existing = await prisma.expenseRecord.findUnique({ where: { id } });

  if (!existing) {
    throw new ApiError("Expense not found.", {
      status: 404,
      code: "not_found",
    });
  }

  if (existing.staffPaymentId || isStaffPaymentCategory(existing.categoryId)) {
    throw new ApiError(
      "Staff payment expenses are managed in Staff Payments.",
      { status: 400, code: "staff_payment_expense" }
    );
  }

  const session = await requireSession();
  assertStaffOperationalRole(session);
  assertDestructiveApiAllowed("Expense deletion");
  const branch = await getBranchCodeById(existing.branchId);
  await assertBranchDayOpenForWrite(branch, existing.date);

  await prisma.expenseRecord.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await recordDeleteAudit(
    session,
    "expenses",
    id,
    existing as Record<string, unknown>
  );
}

export async function upsertStaffPaymentExpense(
  expense: ExpenseRecord
): Promise<ExpenseRecord> {
  const session = await requireSession();
  const branchId = await getBranchIdForSession(session, expense.branch);

  const record = await prisma.expenseRecord.upsert({
    where: { id: expense.id },
    create: {
      id: expense.id,
      date: expense.date,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      branchId,
      staffPaymentId: expense.staffPaymentId ?? null,
      staffPaymentType: expense.staffPaymentType ?? null,
      paidBy: toJsonField(expense.paidBy),
      notes: expense.notes ?? null,
    },
    update: {
      date: expense.date,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      branchId,
      staffPaymentId: expense.staffPaymentId ?? null,
      staffPaymentType: expense.staffPaymentType ?? null,
      paidBy: toJsonField(expense.paidBy),
      notes: expense.notes ?? null,
    },
    include: expenseInclude,
  });

  return mapExpenseRecordToEntity(record);
}
