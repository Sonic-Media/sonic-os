import type { UserRole } from "@/types/auth";
import { getDefaultRouteForStaffRole, getModuleForPath, roleHasModuleAccess } from "@/lib/staff/permissions";
import { STAFF_ROLE_OPTIONS } from "@/lib/staff/roles";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  ceo: "CEO",
  manager: "Manager",
  cashier: "Cashier",
  salesperson: "Salesperson",
  technician: "Technician",
  "store-attendant": "Store Attendant",
  accountant: "Accountant",
};

export const USER_ROLE_OPTIONS = STAFF_ROLE_OPTIONS;

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === "owner") return true;

  if (pathname === "/login" || pathname === "/lock") return true;

  if (pathname.startsWith("/settings/users")) return false;
  if (pathname.startsWith("/settings/import")) return false;
  if (pathname.startsWith("/settings/roles")) return false;

  const module = getModuleForPath(pathname);
  if (!module) return false;

  return roleHasModuleAccess(role, module);
}

export function getDefaultRouteForRole(role: UserRole): string {
  return getDefaultRouteForStaffRole(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === "owner";
}

export function canImportHistoricalData(role: UserRole): boolean {
  return role === "owner";
}

export function canManageRoles(role: UserRole): boolean {
  return role === "owner";
}

export function getRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}
