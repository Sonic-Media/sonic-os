import type { SalePaymentMethod } from "@/types/sales";

export const SALES_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/sales", label: "Dashboard", exact: true },
  { href: "/sales/new", label: "New Accessory Sale" },
  { href: "/sales/history", label: "Accessory Sales History" },
  { href: "/sales/customers", label: "Customers" },
  { href: "/sales/reports", label: "Accessory Sales Reports" },
];

export const SALE_PAYMENT_METHODS: {
  id: SalePaymentMethod;
  label: string;
}[] = [
  { id: "cash", label: "Cash" },
  { id: "mobile-money", label: "Mobile Money" },
  { id: "card", label: "Card" },
  { id: "bank-transfer", label: "Bank Transfer" },
  { id: "other", label: "Other" },
];

export const SALE_PAYMENT_FILTER_OPTIONS: {
  id: SalePaymentMethod | "all";
  label: string;
}[] = [{ id: "all", label: "All" }, ...SALE_PAYMENT_METHODS];

export const SALE_DATE_FILTER_OPTIONS: {
  id: "all" | "today" | "week" | "month";
  label: string;
}[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export function getSalePaymentMethodLabel(method: SalePaymentMethod): string {
  return (
    SALE_PAYMENT_METHODS.find((item) => item.id === method)?.label ?? method
  );
}
