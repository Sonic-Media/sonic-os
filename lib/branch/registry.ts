import {
  DEFAULT_BRANCH_CODE,
  DEFAULT_BRANCH_NAME,
  SALAAMA_BRANCH_CODE,
  SALAAMA_BRANCH_NAME,
} from "@/lib/constants";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";

/** Fallback branch codes when the branches API has not loaded yet. */
export const FALLBACK_BRANCH_CODES: Branch[] = [
  DEFAULT_BRANCH_CODE,
  SALAAMA_BRANCH_CODE,
];

export const FALLBACK_BRANCH_NAMES: Record<string, string> = {
  [DEFAULT_BRANCH_CODE]: DEFAULT_BRANCH_NAME,
  [SALAAMA_BRANCH_CODE]: SALAAMA_BRANCH_NAME,
};

export function getActiveBranchCodes(branches: BranchEntity[]): Branch[] {
  if (branches.length === 0) {
    return [...FALLBACK_BRANCH_CODES];
  }

  return branches.filter((branch) => branch.active).map((branch) => branch.code);
}

export function getDefaultComparisonBranchCodes(
  branches: BranchEntity[]
): Branch[] {
  const active = getActiveBranchCodes(branches);
  if (active.length >= 2) {
    return active;
  }

  return [...FALLBACK_BRANCH_CODES];
}
