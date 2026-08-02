"use client";

import { useMemo, useState } from "react";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import {
  applySaleFilters,
  createDefaultSaleFilterCriteria,
} from "@/lib/sales/filters";
import { filterByBranchField } from "@/lib/active-branch/filters";
import type { SaleFilterCriteria } from "@/types/sales";

export function useSalesHistory() {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const [criteria, setCriteria] = useState<SaleFilterCriteria>(
    createDefaultSaleFilterCriteria
  );

  const filteredSales = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch);
    return applySaleFilters(branchSales, criteria);
  }, [sales, activeBranch, criteria]);

  function updateCriteria(patch: Partial<SaleFilterCriteria>) {
    setCriteria((current) => ({ ...current, ...patch }));
  }

  return {
    criteria,
    sales: filteredSales,
    allSales: sales,
    updateCriteria,
  };
}
