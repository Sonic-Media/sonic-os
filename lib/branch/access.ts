import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export function canSwitchActiveBranch(role: AuthSession["role"]): boolean {
  return role === "owner";
}

export function resolveSaleBranch(
  session: AuthSession | null,
  activeBranch: Branch
): Branch {
  if (!session || session.role === "owner") {
    return resolveInventoryBranchCode(activeBranch);
  }

  return resolveInventoryBranchCode(session.branch);
}
