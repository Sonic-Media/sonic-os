"use client";

import { useOptionalDashboardContext } from "@/context/dashboard-context";
import { buildChartRefreshKey } from "@/lib/chart-utils";

export function useChartRefreshKey() {
  const context = useOptionalDashboardContext();
  if (!context) return "default";

  const {
    timeFilter,
    customRange,
    activeMetric,
    branchFilter,
    staffFilter,
    expenseCategory,
    comparePrevious,
  } = context;

  return buildChartRefreshKey([
    timeFilter,
    customRange.start,
    customRange.end,
    activeMetric,
    branchFilter,
    staffFilter,
    expenseCategory,
    comparePrevious ? 1 : 0,
  ]);
}
