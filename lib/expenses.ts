import type { Expense } from "@/types";

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
  return expenses.filter((expense) => expense.amount > 0);
}
