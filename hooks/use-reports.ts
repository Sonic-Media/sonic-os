"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReportSummary } from "@/lib/api/reports";
import { useBranch } from "@/context/branch-context";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
} from "@/lib/data-source/context-api";
import { getReportsSubtitle } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import type { ReportPeriod, ReportSummary } from "@/types";

export type ReportsBranchScope = "all" | string;

function createEmptyReportSummary(): ReportSummary {
  return {
    totalSales: 0,
    totalExpenses: 0,
    totalSavings: 0,
    byBranch: {},
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
  const { isAuthenticated, isLoaded: authLoaded, session } = useAuth();
  const { activeBranch, isLoaded: branchLoaded, canSwitchBranch } = useBranch();
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [referenceDate, setReferenceDate] = useState(getTodayISO);
  const [branchScope, setBranchScope] = useState<ReportsBranchScope>("all");
  const [summary, setSummary] = useState<ReportSummary>(createEmptyReportSummary);
  const [isLoaded, setIsLoaded] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!canSwitchBranch && session?.branch) {
      setBranchScope(session.branch);
    } else if (canSwitchBranch) {
      setBranchScope("all");
    }
  }, [canSwitchBranch, session?.branch]);

  const effectiveBranchScope = canSwitchBranch ? branchScope : activeBranch;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(createEmptyReportSummary());
      setIsLoaded(true);
      return;
    }

    const currentRequest = ++requestId.current;

    try {
      const remote = await loadFromApi(() =>
        fetchReportSummary({
          period,
          branchScope: effectiveBranchScope,
          referenceDate: period === "daily" ? referenceDate : undefined,
        })
      );
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
  }, [effectiveBranchScope, isAuthenticated, period, referenceDate]);

  useEffect(() => {
    if (!authLoaded || !branchLoaded) return;

    queueMicrotask(() => {
      void refresh();
    });
  }, [authLoaded, branchLoaded, refresh]);

  const periodLabel = useMemo(
    () =>
      getReportsSubtitle(
        period,
        period === "daily" ? referenceDate : undefined
      ),
    [period, referenceDate]
  );

  return {
    isLoaded: isLoaded && authLoaded && branchLoaded,
    period,
    setPeriod,
    referenceDate,
    setReferenceDate,
    branchScope: effectiveBranchScope,
    setBranchScope,
    canSelectBranch: canSwitchBranch,
    summary,
    periodLabel,
  };
}
