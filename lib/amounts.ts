import { isPayrollEntryExpense } from "@/lib/expenses";
import type { Entry, EntryFormData } from "@/types";

export function parseAmount(value: string | number | unknown): number {
  if (value === undefined || value === null || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value).trim().replace(/,/g, "");
  if (!normalized || normalized === "-" || normalized === "—" || normalized === "–") {
    return 0;
  }

  const accountingNegative = normalized.match(/^\((\d+)\)$/);
  const numeric = accountingNegative ? `-${accountingNegative[1]}` : normalized;
  const parsed = Number(numeric);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateExpenses(entry: Pick<Entry, "expenses">): number {
  return calculateOperatingExpenses(entry);
}

export function calculateOperatingExpenses(
  entry: Pick<Entry, "expenses">
): number {
  return entry.expenses
    .filter((expense) => !isPayrollEntryExpense(expense))
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function calculateSavingsFromTotals(sales: number, expenses: number): number {
  return sales - expenses;
}

export function calculateFormSavings(form: EntryFormData): number {
  return calculateSavingsFromTotals(parseAmount(form.sales), calculateExpenses(form));
}
