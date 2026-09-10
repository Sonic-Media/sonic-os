import type { MutableRefObject } from "react";
import type { Branch } from "@/types";

export type BranchScopedLoadRefs = {
  hasLoaded: MutableRefObject<boolean>;
  lastFetchedBranch: MutableRefObject<Branch | null>;
};

export function shouldSkipBranchScopedFetch(
  refs: BranchScopedLoadRefs,
  activeBranch: Branch
): boolean {
  return (
    refs.hasLoaded.current && refs.lastFetchedBranch.current === activeBranch
  );
}

/** Returns true when the active branch changed since the last successful fetch. */
export function beginBranchScopedFetch(
  refs: BranchScopedLoadRefs,
  activeBranch: Branch
): boolean {
  const branchChanged =
    refs.hasLoaded.current &&
    refs.lastFetchedBranch.current !== null &&
    refs.lastFetchedBranch.current !== activeBranch;

  refs.hasLoaded.current = true;
  refs.lastFetchedBranch.current = activeBranch;
  return branchChanged;
}

export function resetBranchScopedFetchRefs(refs: BranchScopedLoadRefs): void {
  refs.hasLoaded.current = false;
  refs.lastFetchedBranch.current = null;
}
