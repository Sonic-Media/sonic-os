import {
  STAFF_PAYMENT_CATEGORY_ID,
  STAFF_PAYMENT_CATEGORY_NAME,
  getStaffPaymentTypeLabel,
} from "@/lib/expenses-module/constants";
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Staff } from "@/types";
import type {
  StaffPaymentInput,
  StaffPaymentRecord,
} from "@/types/staff-payment";

export function buildLinkedStaffPaymentRecords(input: {
  staff: Staff;
  paymentInput: StaffPaymentInput;
}): { payment: StaffPaymentRecord; expense: ExpenseRecord } {
  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();
  const expenseId = crypto.randomUUID();
  const payer = resolveCurrentStaffAction(input.staff.branch);
  const paymentLabel = getStaffPaymentTypeLabel(input.paymentInput.paymentType);

  const payment: StaffPaymentRecord = {
    id: paymentId,
    staffId: input.staff.id,
    staffName: input.staff.name,
    staffRole: input.staff.role,
    amount: Math.abs(input.paymentInput.amount),
    paymentType: input.paymentInput.paymentType,
    paymentMethod: input.paymentInput.paymentMethod,
    branch: input.staff.branch,
    date: input.paymentInput.date,
    paidBy: payer,
    notes: input.paymentInput.notes?.trim() || undefined,
    expenseId,
    createdAt: now,
    updatedAt: now,
  };

  const expense: ExpenseRecord = {
    id: expenseId,
    date: input.paymentInput.date,
    categoryId: STAFF_PAYMENT_CATEGORY_ID,
    categoryName: STAFF_PAYMENT_CATEGORY_NAME,
    description: `${paymentLabel} - ${input.staff.name}`,
    amount: payment.amount,
    paymentMethod: input.paymentInput.paymentMethod,
    branch: input.staff.branch,
    staffPaymentId: paymentId,
    notes: input.paymentInput.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  return { payment, expense };
}
