"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { useBranch } from "@/context/branch-context";
import type { Branch } from "@/types";

function isKnownBranch(
  code: Branch,
  activeBranches: { code: Branch }[]
): boolean {
  return activeBranches.some((branch) => branch.code === code);
}

/**
 * Form-scoped branch defaulting to the global active branch.
 * Used for entity assignment (staff/user home branch), not for switching shop context.
 */
export function useFormBranch(initial?: Branch) {
  const { activeBranch, activeBranches, isLoaded } = useBranch();
  const [branch, setBranch] = useState<Branch>(initial ?? DEFAULT_BRANCH_CODE);

  useEffect(() => {
    if (!isLoaded) return;

    setBranch((current) => {
      if (isKnownBranch(current, activeBranches)) {
        return current;
      }

      if (initial && isKnownBranch(initial, activeBranches)) {
        return initial;
      }

      return activeBranch;
    });
  }, [activeBranch, activeBranches, initial, isLoaded]);

  return {
    branch,
    setBranch,
    isReady: isLoaded,
  };
}
