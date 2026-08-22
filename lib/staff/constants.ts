export const DEFAULT_DAILY_WAGE = 10_000;

export const STAFF_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/staff", label: "Team", exact: true },
  { href: "/staff/payments", label: "Payments" },
  { href: "/staff/reports", label: "Reports" },
];
