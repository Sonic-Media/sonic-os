import {
  DEFAULT_BRANCH_CODE,
  SALAAMA_BRANCH_CODE,
} from "@/lib/constants";
import type { Branch } from "@/types";

const BRANCH_SHORT_CODES: Record<string, string> = {
  [DEFAULT_BRANCH_CODE]: "KANS",
  kansanga: "KANS",
  [SALAAMA_BRANCH_CODE]: "SALA",
};

export function formatBranchShortCode(branchCode: string): string {
  const normalized = branchCode.trim().toLowerCase();
  return (
    BRANCH_SHORT_CODES[normalized] ??
    normalized.slice(0, 4).toUpperCase()
  );
}

export function formatBranchShortCodeFromBranch(branch: Branch): string {
  return formatBranchShortCode(branch);
}
