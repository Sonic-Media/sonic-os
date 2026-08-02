import type { UserRole } from "@/types/auth";

export function canAccessCloseDay(role: UserRole): boolean {
  return role === "owner" || role === "ceo" || role === "branch-manager";
}

export function canReopenDay(role: UserRole): boolean {
  return role === "owner" || role === "ceo";
}
