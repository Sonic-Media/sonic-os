import type { Branch } from "@/types";

function isKnownBranch(
  code: Branch,
  activeBranches: { code: Branch }[]
): boolean {
  return activeBranches.some((branch) => branch.code === code);
}

/**
 * Resolve the authoritative active branch from server preference.
 * localStorage must never override the server value.
 */
export function resolveAuthoritativeActiveBranch(input: {
  serverBranchCode: string | null | undefined;
  assignedBranch: Branch;
  canSwitchBranch: boolean;
  activeBranches: { code: Branch }[];
}): Branch {
  const { serverBranchCode, assignedBranch, canSwitchBranch, activeBranches } =
    input;

  let branch: Branch = assignedBranch;

  if (canSwitchBranch) {
    const preferred = serverBranchCode?.trim().toLowerCase();
    branch = preferred ? (preferred as Branch) : assignedBranch;
  }

  if (!isKnownBranch(branch, activeBranches) && activeBranches[0]) {
    branch = activeBranches[0].code;
  }

  if (!canSwitchBranch) {
    branch = assignedBranch;
  }

  return branch;
}
