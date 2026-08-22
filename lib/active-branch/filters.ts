import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import type { Branch } from "@/types";

function matchesActiveBranch(recordBranch: Branch | undefined, branch: Branch): boolean {
  if (!recordBranch) return false;
  return branchCodesReferToSameInventory(recordBranch, branch);
}

export function filterRecordsByBranch<T>(
  records: T[],
  branch: Branch,
  getBranch: (record: T) => Branch | undefined
): T[] {
  return records.filter((record) => matchesActiveBranch(getBranch(record), branch));
}

export function filterByBranchField<T extends { branch: Branch }>(
  records: T[],
  branch: Branch
): T[] {
  return records.filter((record) => matchesActiveBranch(record.branch, branch));
}
