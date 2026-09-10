"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReportSummary } from "@/lib/api/reports";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
} from "@/lib/data-source/context-api";
import { BRANCH_IDS } from "@/lib/constants";
import { getPeriodLabel } from "@/lib/format";
import { createInitialByBranch } from "@/lib/reports/branch-totals";
import type { ReportPeriod, ReportSummary } from "@/types";

function createEmptyReportSummary(): ReportSummary {
  return {
    totalSales: 0,
    totalExpenses: 0,
    totalSavings: 0,
    byBranch: createInitialByBranch(BRANCH_IDS),
    chartData: [],
    insights: {
      averageDailySales: 0,
      averageDailySavings: 0,
      bestPerformingBranchSavings: 0,
      expenseBreakdown: [],
    },
  };
}

export function useReports() {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [summary, setSummary] = useState<ReportSummary>(createEmptyReportSummary);
  const [isLoaded, setIsLoaded] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(createEmptyReportSummary());
      setIsLoaded(true);
      return;
    }

    const currentRequest = ++requestId.current;

    try {
      const remote = await loadFromApi(() => fetchReportSummary(period));
      if (currentRequest !== requestId.current) return;

      setSummary(remote);
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      setSummary(createEmptyReportSummary());
      console.error(getDataSourceErrorMessage(error));
    } finally {
      if (currentRequest === requestId.current) {
        setIsLoaded(true);
      }
    }
  }, [isAuthenticated, period]);

  useEffect(() => {
    if (!authLoaded || !branchLoaded) return;

    queueMicrotask(() => {
      void refresh();
    });
  }, [authLoaded, branchLoaded, activeBranch, refresh]);

  const periodLabel = useMemo(() => getPeriodLabel(period), [period]);

  return {
    isLoaded: isLoaded && authLoaded && branchLoaded,
    period,
    setPeriod,
    summary,
    periodLabel,
  };
}
