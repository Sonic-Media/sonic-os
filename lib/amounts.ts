import type { Entry, EntryFormData } from "@/types";

export function parseAmount(value: string | number | unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateExpenses(entry: Pick<Entry, "expenses">): number {
  return entry.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function calculateSavingsFromTotals(sales: number, expenses: number): number {
  return sales - expenses;
}

export function calculateFormSavings(form: EntryFormData): number {
  return calculateSavingsFromTotals(parseAmount(form.sales), calculateExpenses(form));
}
