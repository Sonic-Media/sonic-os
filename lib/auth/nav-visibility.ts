import { canAccessRoute } from "@/lib/auth/permissions";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import type { UserRole } from "@/types/auth";

const CASHIER_NAV_PREFIXES = [
  "/operations/today",
  "/sales",
];

export function isNavVisibleForRole(role: UserRole, href: string): boolean {
  if (!canAccessRoute(role, href)) {
    return false;
  }

  if (role === "owner") {
    return true;
  }

  const staffRole = migrateLegacyAuthRole(role);
  if (staffRole !== "cashier") {
    return true;
  }

  return CASHIER_NAV_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`)
  );
}
