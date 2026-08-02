"use client";

import { useMemo } from "react";
import { useBranches } from "@/context/branches-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useStock } from "@/context/stock-context";
import {
  buildBranchComparisonChartData,
  buildBranchTrendChartData,
  computeBranchAnalytics,
  getDefaultComparisonBranchCodes,
} from "@/lib/branch/analytics";

export function useBranchAnalytics(branchCode: string) {
  const { getBranchByCode } = useBranches();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { entries } = useEntriesContext();
  const { products, movements } = useStock();
  const { staff } = useStaff();

  const branch = getBranchByCode(branchCode);

  const analytics = useMemo(() => {
    if (!branch) return null;

    return computeBranchAnalytics(
      branch,
      sales,
      purchases,
      expenses,
      entries,
      products,
      movements,
      staff
    );
  }, [
    branch,
    sales,
    purchases,
    expenses,
    entries,
    products,
    movements,
    staff,
  ]);

  const trendChartData = useMemo(() => {
    if (!branch) return [];

    return buildBranchTrendChartData(branch.code, sales, entries);
  }, [branch, sales, entries]);

  return {
    branch,
    analytics,
    trendChartData,
  };
}

export function useBranchComparison() {
  const { branches, getBranchByCode } = useBranches();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { entries } = useEntriesContext();
  const { products, movements } = useStock();
  const { staff } = useStaff();

  const comparisonBranches = useMemo(() => {
    return getDefaultComparisonBranchCodes()
      .map((code) => getBranchByCode(code))
      .filter((branch): branch is NonNullable<typeof branch> => Boolean(branch));
  }, [getBranchByCode]);

  const snapshots = useMemo(
    () =>
      comparisonBranches.map((branch) =>
        computeBranchAnalytics(
          branch,
          sales,
          purchases,
          expenses,
          entries,
          products,
          movements,
          staff
        )
      ),
    [
      comparisonBranches,
      sales,
      purchases,
      expenses,
      entries,
      products,
      movements,
      staff,
    ]
  );

  const comparisonChartData = useMemo(
    () => buildBranchComparisonChartData(snapshots),
    [snapshots]
  );

  return {
    comparisonBranches,
    snapshots,
    comparisonChartData,
  };
}
