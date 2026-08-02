import type {
  ExpenseCategoryInput,
  ExpenseCategoryUpdateInput,
  ExpenseRecordInput,
  ExpenseRecordUpdateInput,
} from "@/types/expenses-module";
import { isStaffPaymentCategory } from "@/lib/expenses-module/constants";

export function hasValidationErrors(
  errors: Record<string, string | undefined>
): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateExpenseRecordInput(
  input: ExpenseRecordInput | ExpenseRecordUpdateInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.date.trim()) {
    errors.date = "Date is required.";
  }

  if (!input.categoryId) {
    errors.categoryId = "Select a category.";
  } else if (isStaffPaymentCategory(input.categoryId)) {
    errors.categoryId = "Use Staff Payments to record staff payment expenses.";
  }

  if (!input.description.trim()) {
    errors.description = "Description is required.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!input.paymentMethod) {
    errors.paymentMethod = "Select a payment method.";
  }

  if (!input.branch) {
    errors.branch = "Select a branch.";
  }

  return errors;
}

export function validateExpenseCategoryInput(
  input: ExpenseCategoryInput | ExpenseCategoryUpdateInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.name.trim()) {
    errors.name = "Category name is required.";
  }

  return errors;
}
