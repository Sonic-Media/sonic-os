"use client";

import { useMemo, useState } from "react";
import { usePurchasing } from "@/context/purchasing-context";
import { useActiveBranch } from "@/context/active-branch-context";
import {
  applyPurchaseFilters,
  createDefaultPurchaseFilterCriteria,
} from "@/lib/purchasing/filters";
import { filterByBranchField } from "@/lib/active-branch/filters";
import type { PurchaseFilterCriteria } from "@/types/purchasing";

export function usePurchaseHistory() {
  const { purchases } = usePurchasing();
  const { activeBranch } = useActiveBranch();
  const [criteria, setCriteria] = useState<PurchaseFilterCriteria>(
    createDefaultPurchaseFilterCriteria
  );

  const filteredPurchases = useMemo(() => {
    const branchPurchases = filterByBranchField(purchases, activeBranch);
    return applyPurchaseFilters(branchPurchases, criteria);
  }, [purchases, activeBranch, criteria]);

  function updateCriteria(patch: Partial<PurchaseFilterCriteria>) {
    setCriteria((current) => ({ ...current, ...patch }));
  }

  return {
    criteria,
    purchases: filteredPurchases,
    allPurchases: purchases,
    updateCriteria,
  };
}
