import { formatCurrency } from "@/lib/format";

export const EXPENSES_PLACEHOLDER = "—";

export function formatExpensesCurrency(value: number | null): string {
  if (value === null) return EXPENSES_PLACEHOLDER;
  return formatCurrency(value);
}

export function formatExpensesCount(value: number | null): string {
  if (value === null) return EXPENSES_PLACEHOLDER;
  return value.toLocaleString("en-UG");
}
