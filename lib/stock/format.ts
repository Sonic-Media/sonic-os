import { formatCurrency } from "@/lib/format";

export const STOCK_PLACEHOLDER = "—";

export function formatStockCurrency(value: number | null): string {
  if (value === null) return STOCK_PLACEHOLDER;
  return formatCurrency(value);
}

export function formatStockCount(value: number | null): string {
  if (value === null) return STOCK_PLACEHOLDER;
  return value.toLocaleString("en-UG");
}
