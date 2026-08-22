import type { UserRole } from "@/types/auth";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";

export function canAccessCloseDay(role: UserRole): boolean {
  if (role === "owner") return true;

  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" || staffRole === "cashier";
}

export function canReopenDay(role: UserRole): boolean {
  if (role === "owner") return true;
  return migrateLegacyAuthRole(role) === "branch-manager";
}

export function canOpenShop(role: UserRole): boolean {
  if (role === "owner") return true;
  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" || staffRole === "cashier";
}
