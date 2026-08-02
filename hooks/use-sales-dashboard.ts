"use client";

import { useMemo } from "react";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { computeSalesDashboardMetrics } from "@/lib/sales/calculations";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";

export function useSalesDashboard() {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();

  const metrics = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch);
    return computeSalesDashboardMetrics(branchSales, getTodayISO());
  }, [sales, activeBranch]);

  return { metrics };
}
