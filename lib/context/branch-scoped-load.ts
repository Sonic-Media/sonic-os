import type { MutableRefObject } from "react";
import type { Branch } from "@/types";

export function shouldSkipBranchScopedFetch(
  hasLoaded: MutableRefObject<boolean>,
  lastFetchedBranch: MutableRefObject<Branch | null>,
  activeBranch: Branch
): boolean {
  return (
    hasLoaded.current && lastFetchedBranch.current === activeBranch
  );
}

/** Returns true when the active branch changed since the last successful fetch. */
export function beginBranchScopedFetch(
  hasLoaded: MutableRefObject<boolean>,
  lastFetchedBranch: MutableRefObject<Branch | null>,
  activeBranch: Branch
): boolean {
  const branchChanged =
    hasLoaded.current &&
    lastFetchedBranch.current !== null &&
    lastFetchedBranch.current !== activeBranch;

  hasLoaded.current = true;
  lastFetchedBranch.current = activeBranch;
  return branchChanged;
}

export function resetBranchScopedFetchRefs(
  hasLoaded: MutableRefObject<boolean>,
  lastFetchedBranch: MutableRefObject<Branch | null>
): void {
  hasLoaded.current = false;
  lastFetchedBranch.current = null;
}
