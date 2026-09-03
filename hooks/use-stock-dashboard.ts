"use client";

import { useMemo } from "react";
import { useStock } from "@/context/stock-context";
import { useBranch } from "@/context/branch-context";
import { computeBranchDashboardMetrics } from "@/lib/stock/calculations";
import { getTodayISO } from "@/lib/dates";

export function useStockDashboard() {
  const { products, movements } = useStock();
  const { activeBranch } = useBranch();

  const metrics = useMemo(
    () =>
      computeBranchDashboardMetrics(
        products,
        movements,
        activeBranch,
        getTodayISO()
      ),
    [products, movements, activeBranch]
  );

  return {
    metrics,
  };
}
