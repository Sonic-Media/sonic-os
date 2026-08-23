"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStock } from "@/context/stock-context";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import type { ReportSummary } from "@/types";

export interface DashboardAlert {
  id: string;
  tone: "warning" | "info";
  message: string;
}

export function useOwnerDashboardAlerts(summary: ReportSummary) {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { activeBranches } = useBranches();
  const { metrics: salesMetrics } = useSalesDashboard();
  const { expenses } = useExpensesModule();
  const { payments } = useStaffPaymentsModule();
  const { metrics: stockMetrics } = useStock();
  const {
    isBranchDayClosed,
    isBranchDayOpened,
    isLoaded,
  } = useDayClosing();

  return useMemo(() => {
    if (!isLoaded) return [];

    const alerts: DashboardAlert[] = [];
    const branchEntity = activeBranches.find(
      (branch) => branch.code === activeBranch
    );
    const hasRevenue =
      summary.totalSales > 0 || (salesMetrics.todayRevenue ?? 0) > 0;
    const hasExpenses =
      summary.totalExpenses > 0 ||
      expenses.some(
        (expense) =>
          expense.date === today &&
          branchCodesReferToSameInventory(expense.branch, activeBranch)
      );
    const hasStaffPayments = payments.some(
      (payment) =>
        payment.date === today &&
        branchCodesReferToSameInventory(payment.branch, activeBranch)
    );
    const isOpen = isBranchDayOpened(activeBranch, today);
    const isClosed = isBranchDayClosed(activeBranch, today);

    if (!isOpen && !isClosed) {
      alerts.push({
        id: "branch-not-opened",
        tone: "warning",
        message: "Branch not opened — start today's shift to begin tracking.",
      });
    }

    if (isOpen && !isClosed) {
      alerts.push({
        id: "pending-day-closure",
        tone: "warning",
        message: "Pending day closure — close the branch when operations finish.",
      });
    }

    if ((stockMetrics.lowStock ?? 0) > 0 || (stockMetrics.outOfStock ?? 0) > 0) {
      alerts.push({
        id: "low-stock",
        tone: "warning",
        message: "Low stock detected — review inventory before the next sales push.",
      });
    }

    if (!hasRevenue && (isOpen || isClosed)) {
      alerts.push({
        id: "no-revenue",
        tone: "info",
        message: "No revenue recorded today — start with movie revenue or an accessory sale.",
      });
    }

    if (hasRevenue && !hasExpenses && isOpen) {
      alerts.push({
        id: "no-expenses",
        tone: "info",
        message: "Revenue is in, but no expenses recorded yet for today.",
      });
    }

    if (hasRevenue && !hasStaffPayments && isOpen) {
      alerts.push({
        id: "no-staff-payments",
        tone: "info",
        message: "Staff payments have not been recorded yet today.",
      });
    }

    if (!branchEntity) {
      alerts.push({
        id: "branch-config",
        tone: "info",
        message: "Active branch configuration is unavailable.",
      });
    }

    return alerts;
  }, [
    activeBranch,
    activeBranches,
    expenses,
    isBranchDayClosed,
    isBranchDayOpened,
    isLoaded,
    payments,
    salesMetrics.todayRevenue,
    stockMetrics.lowStock,
    stockMetrics.outOfStock,
    summary.totalExpenses,
    summary.totalSales,
    today,
  ]);
}
