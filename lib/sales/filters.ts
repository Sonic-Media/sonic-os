import { getTodayISO } from "@/lib/dates";
import { getSalePaymentMethodLabel } from "@/lib/sales/constants";
import type { Sale, SaleFilterCriteria } from "@/types/sales";

export function createDefaultSaleFilterCriteria(): SaleFilterCriteria {
  return {
    search: "",
    date: "all",
    customer: "all",
    paymentMethod: "all",
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

function matchesDateFilter(sale: Sale, filter: SaleFilterCriteria["date"]): boolean {
  if (filter === "all") return true;
  if (filter === "today") return sale.date === getTodayISO();
  if (filter === "week") return sale.date >= getWeekStartISO();
  if (filter === "month") return sale.date >= getMonthStartISO();
  return true;
}

export function applySaleFilters(
  sales: Sale[],
  criteria: SaleFilterCriteria
): Sale[] {
  const normalizedSearch = criteria.search.trim().toLowerCase();

  return sales.filter((sale) => {
    if (!matchesDateFilter(sale, criteria.date)) return false;

    if (
      criteria.customer !== "all" &&
      sale.customerId !== criteria.customer
    ) {
      return false;
    }

    if (
      criteria.paymentMethod !== "all" &&
      sale.paymentMethod !== criteria.paymentMethod
    ) {
      return false;
    }

    if (!normalizedSearch) return true;

    const itemNames = sale.items.map((item) => item.productName).join(" ");

    return (
      sale.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
      (sale.customerName?.toLowerCase().includes(normalizedSearch) ?? false) ||
      itemNames.toLowerCase().includes(normalizedSearch) ||
      getSalePaymentMethodLabel(sale.paymentMethod)
        .toLowerCase()
        .includes(normalizedSearch) ||
      (sale.staffName?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });
}
