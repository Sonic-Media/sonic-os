import { BRANCH_IDS } from "@/lib/constants";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import type { Branch, BranchTotals, Entry } from "@/types";

export function createEmptyBranchTotals(): BranchTotals {
  return {
    sales: 0,
    expenses: 0,
    savings: 0,
  };
}

export function normalizeBranchId(branchId: Branch): Branch | null {
  if (typeof branchId !== "string") {
    return null;
  }

  const normalized = branchId.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveReportBranchIds(
  configuredBranchIds: Branch[],
  entries: Entry[]
): Branch[] {
  const branchIds = new Set<Branch>();

  for (const branchId of configuredBranchIds) {
    const normalized = normalizeBranchId(branchId);
    if (normalized) {
      branchIds.add(normalized);
    }
  }

  for (const entry of filterCompletedEntries(entries)) {
    const normalized = normalizeBranchId(entry.branch);
    if (normalized) {
      branchIds.add(normalized);
    }
  }

  if (branchIds.size === 0) {
    for (const branchId of BRANCH_IDS) {
      branchIds.add(branchId);
    }
  }

  return [...branchIds].sort();
}

export function createInitialByBranch(branchIds: Branch[]): Record<Branch, BranchTotals> {
  const byBranch: Record<Branch, BranchTotals> = {};

  for (const branchId of branchIds) {
    byBranch[branchId] = createEmptyBranchTotals();
  }

  return byBranch;
}
