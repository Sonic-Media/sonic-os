"use client";

import { useMemo, useState } from "react";
import { usePurchasing } from "@/context/purchasing-context";
import {
  applyPurchaseFilters,
  createDefaultPurchaseFilterCriteria,
} from "@/lib/purchasing/filters";
import type { PurchaseFilterCriteria } from "@/types/purchasing";

export function usePurchaseHistory() {
  const { purchases } = usePurchasing();
  const [criteria, setCriteria] = useState<PurchaseFilterCriteria>(
    createDefaultPurchaseFilterCriteria
  );

  const filteredPurchases = useMemo(
    () => applyPurchaseFilters(purchases, criteria),
    [purchases, criteria]
  );

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
