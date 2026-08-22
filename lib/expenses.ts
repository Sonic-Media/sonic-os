import type { Expense } from "@/types";

export const STAFF_PAYMENT_TEMPLATE_ID = "common-staff-payments";

const MANUAL_PAYROLL_ENTRY_NAMES = new Set(["staff"]);

export function isManualPayrollEntryExpense(expense: Expense): boolean {
  if (expense.id === STAFF_PAYMENT_TEMPLATE_ID) {
    return true;
  }

  return MANUAL_PAYROLL_ENTRY_NAMES.has(expense.name.trim().toLowerCase());
}

export function isPayrollEntryExpense(expense: Expense): boolean {
  const name = expense.name.trim().toLowerCase();
  return isManualPayrollEntryExpense(expense) || name === "staff payments";
}

export function createDefaultExpenses(template: Expense[]): Expense[] {
  return template.map((expense) => ({ ...expense }));
}

export function upsertExpense(expenses: Expense[], expense: Expense): Expense[] {
  const index = expenses.findIndex((item) => item.id === expense.id);
  if (index === -1) {
    return [...expenses, expense];
  }
  return expenses.map((item) => (item.id === expense.id ? expense : item));
}

export function removeExpense(expenses: Expense[], id: string): Expense[] {
  return expenses.filter((expense) => expense.id !== id);
}

export function prepareExpensesForSave(expenses: Expense[]): Expense[] {
  return expenses.filter(
    (expense) => expense.amount > 0 && !isManualPayrollEntryExpense(expense)
  );
}
