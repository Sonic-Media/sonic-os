import { getTodayISO } from "@/lib/dates";
import type { Purchase, PurchaseFilterCriteria } from "@/types/purchasing";

export function createDefaultPurchaseFilterCriteria(): PurchaseFilterCriteria {
  return {
    search: "",
    date: "all",
    supplier: "all",
  };
}

function getWeekStartISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function matchesDateFilter(
  purchase: Purchase,
  filter: PurchaseFilterCriteria["date"]
): boolean {
  if (filter === "all") return true;
  if (filter === "today") return purchase.date === getTodayISO();
  if (filter === "week") return purchase.date >= getWeekStartISO();
  if (filter === "month") return purchase.date >= getMonthStartISO();
  return true;
}

export function applyPurchaseFilters(
  purchases: Purchase[],
  criteria: PurchaseFilterCriteria
): Purchase[] {
  const normalizedSearch = criteria.search.trim().toLowerCase();

  return purchases.filter((purchase) => {
    if (!matchesDateFilter(purchase, criteria.date)) return false;

    if (
      criteria.supplier !== "all" &&
      purchase.supplierId !== criteria.supplier
    ) {
      return false;
    }

    if (!normalizedSearch) return true;

    const itemNames = purchase.items.map((item) => item.productName).join(" ");

    return (
      purchase.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
      purchase.supplierName.toLowerCase().includes(normalizedSearch) ||
      itemNames.toLowerCase().includes(normalizedSearch) ||
      (purchase.staffName?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });
}
