import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import type { Branch } from "@/types";

/**
 * Legacy branch codes that refer to the same physical branch as the canonical code.
 * Stock movements and the default branch record use `main` (display name: Kansanga).
 */
const INVENTORY_BRANCH_ALIASES: Record<string, Branch> = {
  kansanga: DEFAULT_BRANCH_CODE,
};

export function resolveInventoryBranchCode(branchCode: string): Branch {
  const normalized = branchCode.trim().toLowerCase() as Branch;
  return INVENTORY_BRANCH_ALIASES[normalized] ?? normalized;
}

export function getEquivalentBranchCodes(branchCode: string): Branch[] {
  const normalized = branchCode.trim().toLowerCase() as Branch;
  const canonical = resolveInventoryBranchCode(normalized);
  const codes = new Set<Branch>([normalized, canonical]);

  for (const [alias, target] of Object.entries(INVENTORY_BRANCH_ALIASES)) {
    if (target === canonical || alias === normalized) {
      codes.add(alias as Branch);
      codes.add(target);
    }
  }

  return [...codes];
}

export function branchCodesReferToSameInventory(
  left: string,
  right: string
): boolean {
  return (
    resolveInventoryBranchCode(left) === resolveInventoryBranchCode(right)
  );
}
