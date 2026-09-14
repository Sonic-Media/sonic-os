import type { UserRole } from "@/types/auth";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";

/** @deprecated Use canSubmitCloseRequest or canApproveAndClose. */
export function canAccessCloseDay(role: UserRole): boolean {
  return canSubmitCloseRequest(role) || canApproveAndClose(role);
}

export function canSubmitCloseRequest(role: UserRole): boolean {
  if (role === "owner") return false;

  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" || staffRole === "cashier";
}

export function canApproveAndClose(role: UserRole): boolean {
  if (role === "owner") return true;
  return migrateLegacyAuthRole(role) === "branch-manager";
}

export function canReopenDay(role: UserRole): boolean {
  if (role === "owner") return false;
  return migrateLegacyAuthRole(role) === "branch-manager";
}

export function canOpenShop(role: UserRole): boolean {
  if (role === "owner") return false;
  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" || staffRole === "cashier";
}
