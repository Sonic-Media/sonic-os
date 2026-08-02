import { formatCurrency } from "@/lib/format";
import type { PurchaseLineItem } from "@/types/purchasing";

export const PURCHASING_PLACEHOLDER = "—";

export function formatPurchasingCurrency(value: number | null): string {
  if (value === null) return PURCHASING_PLACEHOLDER;
  return formatCurrency(value);
}

export function formatPurchasingCount(value: number | null): string {
  if (value === null) return PURCHASING_PLACEHOLDER;
  return value.toLocaleString("en-UG");
}

export function formatPurchaseItemsSummary(items: PurchaseLineItem[]): string {
  if (items.length === 0) return PURCHASING_PLACEHOLDER;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 1) {
    const item = items[0];
    return `${item.productName} × ${item.quantity.toLocaleString("en-UG")}`;
  }

  return `${items.length} items (${totalQuantity.toLocaleString("en-UG")} units)`;
}
