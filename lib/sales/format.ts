import { formatCurrency } from "@/lib/format";
import type { SaleLineItem } from "@/types/sales";

export const SALES_PLACEHOLDER = "—";

export function formatSalesCurrency(value: number | null): string {
  if (value === null) return SALES_PLACEHOLDER;
  return formatCurrency(value);
}

export function formatSalesCount(value: number | null): string {
  if (value === null) return SALES_PLACEHOLDER;
  return value.toLocaleString("en-UG");
}

export function formatSaleItemsSummary(items: SaleLineItem[]): string {
  if (items.length === 0) return SALES_PLACEHOLDER;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 1) {
    const item = items[0];
    return `${item.productName} × ${item.quantity.toLocaleString("en-UG")}`;
  }

  return `${items.length} items (${totalQuantity.toLocaleString("en-UG")} units)`;
}
