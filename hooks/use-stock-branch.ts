"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BRANCH_CODE,
  STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY,
} from "@/lib/constants";
import {
  readLocalStorageItem,
  writeLocalStorageItem,
} from "@/lib/safe-storage";
import { useActiveBranch } from "@/context/active-branch-context";
import type { Branch } from "@/types";

function readStoredMovementBranch(fallback: Branch): Branch {
  if (typeof window === "undefined") return fallback;

  const value = readLocalStorageItem(STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY)?.trim();
  return value || fallback;
}

export function useStockBranch() {
  const {
    activeBranch,
    setActiveBranch,
    isLoaded: activeBranchLoaded,
  } = useActiveBranch();
  const [lastMovementBranch, setLastMovementBranchState] = useState<Branch>(
    DEFAULT_BRANCH_CODE
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setLastMovementBranchState(readStoredMovementBranch(activeBranch));
    setIsLoaded(activeBranchLoaded);
  }, [activeBranch, activeBranchLoaded]);

  const setLastMovementBranch = useCallback((branch: Branch) => {
    setLastMovementBranchState(branch);
    writeLocalStorageItem(STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY, branch);
  }, []);

  return {
    activeBranch,
    setActiveBranch,
    lastMovementBranch,
    setLastMovementBranch,
    isLoaded,
  };
}

