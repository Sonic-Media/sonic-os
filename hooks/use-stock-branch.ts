"use client";

import { useBranch } from "@/context/branch-context";
import type { Branch } from "@/types";

/**
 * @deprecated Prefer `useBranch()` directly.
 * Stock modules use the global active branch; movement branch tracks last dialog selection.
 */
export function useStockBranch() {
  const {
    activeBranch,
    setActiveBranch,
    stockMovementBranch,
    setStockMovementBranch,
    isLoaded,
    loading,
  } = useBranch();

  return {
    activeBranch,
    setActiveBranch,
    lastMovementBranch: stockMovementBranch,
    setLastMovementBranch: setStockMovementBranch,
    isLoaded,
    loading,
  };
}
