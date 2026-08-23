"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import type { ReportSummary } from "@/types";

export interface BusinessHealthCheck {
  id: string;
  label: string;
  complete: boolean;
}

export interface BusinessHealthState {
  checks: BusinessHealthCheck[];
  completedCount: number;
  totalCount: number;
  percent: number;
  label: "Healthy" | "In Progress" | "Needs Attention";
}

export function useBusinessHealth(summary: ReportSummary): BusinessHealthState {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { metrics: salesMetrics } = useSalesDashboard();
  const { expenses } = useExpensesModule();
  const { payments } = useStaffPaymentsModule();
  const { isBranchDayClosed, isBranchDayOpened } = useDayClosing();

  return useMemo(() => {
    const branchOpened = isBranchDayOpened(activeBranch, today);
    const branchClosed = isBranchDayClosed(activeBranch, today);
    const hasRevenue =
      summary.totalSales > 0 || (salesMetrics.todayRevenue ?? 0) > 0;
    const hasExpenses =
      summary.totalExpenses > 0 ||
      expenses.some(
        (item) =>
          item.date === today &&
          branchCodesReferToSameInventory(item.branch, activeBranch)
      );
    const hasAccessorySales = (salesMetrics.transactionsToday ?? 0) > 0;
    const hasStaffPayments = payments.some(
      (payment) =>
        payment.date === today &&
        branchCodesReferToSameInventory(payment.branch, activeBranch)
    );

    const checks: BusinessHealthCheck[] = [
      { id: "opened", label: "Branch opened", complete: branchOpened || branchClosed },
      { id: "revenue", label: "Revenue entered", complete: hasRevenue },
      { id: "expenses", label: "Expenses entered", complete: hasExpenses },
      {
        id: "accessory-sales",
        label: "Accessory sales entered",
        complete: hasAccessorySales,
      },
      {
        id: "staff-payments",
        label: "Staff payments recorded",
        complete: hasStaffPayments,
      },
      { id: "closed", label: "Branch closed", complete: branchClosed },
    ];

    const completedCount = checks.filter((check) => check.complete).length;
    const totalCount = checks.length;
    const percent = Math.round((completedCount / totalCount) * 100);

    let label: BusinessHealthState["label"] = "Needs Attention";
    if (percent >= 85) label = "Healthy";
    else if (percent >= 45) label = "In Progress";

    return {
      checks,
      completedCount,
      totalCount,
      percent,
      label,
    };
  }, [
    activeBranch,
    expenses,
    isBranchDayClosed,
    isBranchDayOpened,
    payments,
    salesMetrics.transactionsToday,
    salesMetrics.todayRevenue,
    summary.totalExpenses,
    summary.totalSales,
    today,
  ]);
}
