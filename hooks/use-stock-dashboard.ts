"use client";

import { useMemo } from "react";
import { useStock } from "@/context/stock-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { computeBranchDashboardMetrics } from "@/lib/stock/calculations";
import { getTodayISO } from "@/lib/dates";

export function useStockDashboard() {
  const { products, movements } = useStock();
  const { activeBranch } = useActiveBranch();

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
