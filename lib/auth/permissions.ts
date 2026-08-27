import type { UserRole } from "@/types/auth";
import { isOwnerRole } from "@/lib/auth/validation";
import {
  getDefaultRouteForStaffRole,
  getModuleForPath,
  roleHasModuleAccess,
} from "@/lib/staff/permissions";
import {
  DEFAULT_STAFF_ROLES,
  getStaffRoleName,
  migrateLegacyAuthRole,
  STAFF_ROLE_OPTIONS,
} from "@/lib/staff/roles";

const CASHIER_BLOCKED_ROUTE_PREFIXES = [
  "/expenses",
  "/staff",
  "/sales/history",
  "/sales/reports",
  "/sales/customers",
];

export function isCashierRole(role: UserRole): boolean {
  return role !== "owner" && migrateLegacyAuthRole(role) === "cashier";
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  ...Object.fromEntries(
    DEFAULT_STAFF_ROLES.map((role) => [role.id, role.name])
  ) as Record<Exclude<UserRole, "owner">, string>,
};

export const USER_ROLE_OPTIONS = STAFF_ROLE_OPTIONS;

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (isOwnerRole(role)) return true;

  if (pathname === "/login" || pathname === "/lock") return true;

  if (pathname.startsWith("/settings")) return false;

  if (pathname.startsWith("/operations/close-day")) {
    return false;
  }

  const staffRole = migrateLegacyAuthRole(role);
  if (staffRole === "cashier") {
    if (
      CASHIER_BLOCKED_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return false;
    }
  }

  const module = getModuleForPath(pathname);
  if (!module) return false;

  return roleHasModuleAccess(role, module);
}

export function getDefaultRouteForRole(role: UserRole): string {
  return getDefaultRouteForStaffRole(role);
}

export function canManageUsers(role: UserRole): boolean {
  return isOwnerRole(role);
}

export function canImportHistoricalData(role: UserRole): boolean {
  return isOwnerRole(role);
}

export function canManageRoles(role: UserRole): boolean {
  return isOwnerRole(role);
}

export function canViewAuditLog(role: UserRole): boolean {
  return isOwnerRole(role);
}

export function getRoleLabel(role: UserRole): string {
  if (isOwnerRole(role)) return "Owner";
  return getStaffRoleName(migrateLegacyAuthRole(role));
}
