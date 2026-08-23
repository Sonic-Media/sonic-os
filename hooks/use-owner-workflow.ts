"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import type { ReportSummary } from "@/types";

export interface WorkflowStep {
  id: string;
  label: string;
  complete: boolean;
  pending?: boolean;
}

export function useOwnerWorkflow(summary: ReportSummary) {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { metrics: salesMetrics } = useSalesDashboard();
  const { expenses } = useExpensesModule();
  const { purchases } = usePurchasing();
  const { isBranchDayClosed, isBranchDayOpened } = useDayClosing();

  return useMemo(() => {
    const branchOpened =
      isBranchDayOpened(activeBranch, today) ||
      isBranchDayClosed(activeBranch, today);
    const hasRevenue =
      summary.totalSales > 0 || (salesMetrics.todayRevenue ?? 0) > 0;
    const hasAccessorySales = (salesMetrics.transactionsToday ?? 0) > 0;
    const hasExpenses =
      summary.totalExpenses > 0 ||
      expenses.some(
        (item) =>
          item.date === today &&
          branchCodesReferToSameInventory(item.branch, activeBranch)
      );
    const hasPurchases = purchases.some(
      (purchase) =>
        purchase.date === today &&
        branchCodesReferToSameInventory(purchase.branch, activeBranch)
    );
    const dayClosed = isBranchDayClosed(activeBranch, today);
    const dayOpen = isBranchDayOpened(activeBranch, today);

    const steps: WorkflowStep[] = [
      {
        id: "opened",
        label: "Branch Opened",
        complete: branchOpened,
      },
      {
        id: "revenue",
        label: "Revenue Recorded",
        complete: hasRevenue,
      },
      {
        id: "accessory",
        label: "Accessory Sale Recorded",
        complete: hasAccessorySales,
      },
      {
        id: "expenses",
        label: "Expenses Recorded",
        complete: hasExpenses,
      },
      {
        id: "purchases",
        label: "Purchases Recorded",
        complete: hasPurchases,
      },
      {
        id: "close-day",
        label: "Close Day",
        complete: dayClosed,
        pending: dayOpen && !dayClosed,
      },
    ];

    const completedCount = steps.filter((step) => step.complete).length;
    const nextStep = steps.find((step) => !step.complete && step.pending !== false);

    return {
      steps,
      completedCount,
      totalCount: steps.length,
      progressPercent: Math.round((completedCount / steps.length) * 100),
      nextStep,
    };
  }, [
    activeBranch,
    expenses,
    isBranchDayClosed,
    isBranchDayOpened,
    purchases,
    salesMetrics.todayRevenue,
    salesMetrics.transactionsToday,
    summary.totalExpenses,
    summary.totalSales,
    today,
  ]);
}
