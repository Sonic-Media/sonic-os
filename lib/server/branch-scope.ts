import {
  getEquivalentBranchCodes,
  resolveInventoryBranchCode,
} from "@/lib/branch/codes";
import { isOwnerRole } from "@/lib/auth/validation";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { getActiveBranchPreference } from "@/lib/server/services/auth-service";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export type BranchIdFilter = { branchId: { in: string[] } };

/**
 * Resolves branch IDs for the active shop context.
 * Owners use their saved branch preference; staff use their assigned branch.
 */
export async function resolveActiveBranchIds(
  session: AuthSession
): Promise<string[]> {
  let branchCode: Branch | string = session.branch;

  if (isOwnerRole(session.role)) {
    const preferredBranch = await getActiveBranchPreference(session.userId);
    if (preferredBranch) {
      branchCode = preferredBranch;
    }
  }

  return resolveBranchIdsForCodes(branchCode);
}

export async function resolveBranchIdsForCodes(
  branchCode: Branch | string
): Promise<string[]> {
  const codes = getEquivalentBranchCodes(String(branchCode));
  const ids = await Promise.all(codes.map((code) => getBranchIdByCode(code)));
  return [...new Set(ids)];
}

/**
 * Returns a Prisma branch filter for list queries scoped to the active shop.
 */
export async function resolveBranchListFilter(
  session: AuthSession
): Promise<BranchIdFilter> {
  const branchIds = await resolveActiveBranchIds(session);
  return { branchId: { in: branchIds } };
}

/**
 * Operations visibility (day closings, live branch status).
 * Owners receive every branch; staff receive only their assigned branch.
 */
export async function resolveOperationsListFilter(
  session: AuthSession
): Promise<BranchIdFilter | undefined> {
  if (isOwnerRole(session.role)) {
    return undefined;
  }

  return resolveBranchListFilter(session);
}

export function assertOwnerCanSwitchBranch(session: AuthSession): void {
  if (!isOwnerRole(session.role)) {
    throw new Error("Only the owner can switch the active branch.");
  }
}

export type ReportsBranchScope = "all" | Branch;

/**
 * Server-authoritative branch filter for Reports.
 * Owners may request all branches or one branch code; staff always receive
 * their assigned branch regardless of client input.
 */
export async function resolveReportsBranchFilter(
  session: AuthSession,
  requestedScope?: string | null
): Promise<{ filter: BranchIdFilter | undefined; scope: ReportsBranchScope }> {
  if (!isOwnerRole(session.role)) {
    const filter = await resolveBranchListFilter(session);
    const scope = resolveInventoryBranchCode(session.branch) as Branch;
    return { filter, scope };
  }

  const normalized = requestedScope?.trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return { filter: undefined, scope: "all" };
  }

  const branchIds = await resolveBranchIdsForCodes(normalized);
  return {
    filter: { branchId: { in: branchIds } },
    scope: normalized as Branch,
  };
}
