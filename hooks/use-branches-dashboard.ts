"use client";

import { useMemo } from "react";
import { useBranches } from "@/context/branches-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSales } from "@/context/sales-context";
import { useStock } from "@/context/stock-context";
import {
  computeBranchDashboardMetrics,
  computeInventoryValueByBranch,
  computeTodayRevenueByBranch,
} from "@/lib/branch/calculations";

export function useBranchesDashboard() {
  const { branches } = useBranches();
  const { sales } = useSales();
  const { entries } = useEntriesContext();
  const { products, movements } = useStock();

  const metrics = useMemo(
    () => computeBranchDashboardMetrics(branches),
    [branches]
  );

  const revenueByBranch = useMemo(
    () =>
      branches.map((branch) => ({
        branchCode: branch.code,
        branchName: branch.name,
        revenue: computeTodayRevenueByBranch(branch, sales, entries),
      })),
    [branches, sales, entries]
  );

  const inventoryByBranch = useMemo(
    () =>
      branches.map((branch) => ({
        branchCode: branch.code,
        branchName: branch.name,
        inventoryValue: computeInventoryValueByBranch(
          branch,
          products,
          movements
        ),
      })),
    [branches, products, movements]
  );

  return {
    metrics,
    revenueByBranch,
    inventoryByBranch,
  };
}
