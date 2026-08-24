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
  if (!/^-?\d*(\.\d+)?$/.test(numeric)) {
    return 0;
  }

  const parsed = Number(numeric);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateMoneyInput(
  value: string | number | unknown,
  options: { allowZero?: boolean; fieldLabel?: string } = {}
): { valid: true; amount: number } | { valid: false; amount: number; message: string } {
  const label = options.fieldLabel ?? "Amount";
  const amount = parseAmount(value);
  const raw = String(value ?? "").trim();

  if (raw && amount === 0 && raw !== "0" && raw !== "0.0") {
    return {
      valid: false,
      amount: 0,
      message: `${label} must be a valid number.`,
    };
  }

  if (!Number.isFinite(amount)) {
    return {
      valid: false,
      amount: 0,
      message: `${label} must be a valid number.`,
    };
  }

  if (amount < 0) {
    return {
      valid: false,
      amount,
      message: `${label} cannot be negative.`,
    };
  }

  if (!options.allowZero && amount <= 0) {
    return {
      valid: false,
      amount,
      message: `${label} must be greater than zero.`,
    };
  }

  return { valid: true, amount };
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
