export const PURCHASING_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/purchasing", label: "Dashboard", exact: true },
  { href: "/purchasing/history", label: "History" },
  { href: "/purchasing/suppliers", label: "Suppliers" },
];

export const PURCHASE_DATE_FILTER_OPTIONS: {
  id: "all" | "today" | "week" | "month";
  label: string;
}[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];
