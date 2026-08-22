"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import type { Branch } from "@/types";

function isKnownBranch(code: Branch, activeBranches: { code: Branch }[]): boolean {
  return activeBranches.some((branch) => branch.code === code);
}

export function useFormBranch(initial?: Branch) {
  const { activeBranch, isLoaded: activeBranchLoaded } = useActiveBranch();
  const { activeBranches, isLoaded: branchesLoaded } = useBranches();
  const [branch, setBranch] = useState<Branch>(initial ?? DEFAULT_BRANCH_CODE);
  const isReady = activeBranchLoaded && branchesLoaded;

  useEffect(() => {
    if (!isReady) return;

    setBranch((current) => {
      if (isKnownBranch(current, activeBranches)) {
        return current;
      }

      if (initial && isKnownBranch(initial, activeBranches)) {
        return initial;
      }

      return activeBranch;
    });
  }, [activeBranch, activeBranches, initial, isReady]);

  return {
    branch,
    setBranch,
    isReady,
  };
}
