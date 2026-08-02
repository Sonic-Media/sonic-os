export const OPERATIONS_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
  requiresCloseDayAccess?: boolean;
}[] = [
  { href: "/operations/today", label: "Today", exact: true },
  { href: "/operations/close-day", label: "Close Day", requiresCloseDayAccess: true },
  { href: "/operations/historical", label: "Historical" },
];
