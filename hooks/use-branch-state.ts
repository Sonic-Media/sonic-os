"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { computeDashboardOperatingExpenses } from "@/lib/dashboard/operating-expenses";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";

export function useBranchState() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { entries } = useEntriesContext();
  const { expenses } = useExpensesModule();
  const { purchases } = usePurchasing();
  const { payments } = useStaffPaymentsModule();
  const { sales } = useSales();
  const { metrics: salesMetrics } = useSalesDashboard();
  const { activeOnShift } = useStaffAttendance(today);
  const {
    getOpenRecord,
    getClosedRecord,
    getActiveOpenRecord,
    getCloseRequestedRecord,
    isBranchDayClosed,
    isBranchDayOpened,
    isLoaded,
  } = useDayClosing();

  return useMemo(() => {
    const activeRecord = getActiveOpenRecord(activeBranch);
    const businessDate = activeRecord?.date ?? today;
    const openRecord = getOpenRecord(activeBranch, businessDate);
    const closeRequestedRecord = getCloseRequestedRecord(activeBranch, businessDate);
    const closedRecord = getClosedRecord(activeBranch, businessDate);
    const isClosed = isBranchDayClosed(activeBranch, businessDate);
    const isOpen = isBranchDayOpened(activeBranch, businessDate);
    const status = isClosed
      ? "closed"
      : closeRequestedRecord || activeRecord?.status === "close_requested"
        ? "close_requested"
        : isOpen
          ? "open"
          : "waiting";

    const branchPurchases = filterByBranchField(purchases, activeBranch).filter(
      (purchase) => purchase.date === businessDate
    );
    const branchSales = filterByBranchField(sales, activeBranch).filter(
      (sale) => sale.date === businessDate && sale.status === "completed"
    );

    const branchEntries = filterByBranchField(entries, activeBranch).filter(
      (entry) => entry.date === businessDate
    );
    const completedEntry = branchEntries.find((entry) => entry.status === "completed");
    const draftEntry = branchEntries.find((entry) => entry.status === "draft");
    const activeEntry = completedEntry ?? draftEntry;

    const movieRevenue = isClosed
      ? closedRecord?.summary?.sales ?? Number(activeEntry?.sales ?? 0)
      : Number(activeEntry?.sales ?? 0);
    const accessoryRevenue =
      salesMetrics.todayRevenue ??
      branchSales.reduce((sum, sale) => sum + sale.total, 0);

    const operatingExpenses = computeDashboardOperatingExpenses(
      activeBranch,
      businessDate,
      expenses,
      entries
    );

    const staffWages = filterByBranchField(payments, activeBranch)
      .filter((payment) => payment.date === businessDate)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const totalExpenses = operatingExpenses + staffWages;
    const totalPurchases = branchPurchases.reduce(
      (sum, purchase) => sum + purchase.totalCost,
      0
    );
    const netCash = movieRevenue + accessoryRevenue - operatingExpenses - staffWages;
    const netCashFlow = movieRevenue + accessoryRevenue - totalExpenses - totalPurchases;

    return {
      branch: activeBranch,
      date: businessDate,
      status,
      openedByName: openRecord?.openedByName ?? null,
      openedAt: openRecord?.openedAt ?? openRecord?.reopenedAt ?? null,
      closedByName: closedRecord?.closedByName ?? null,
      closedAt: closedRecord?.closedAt ?? null,
      activeStaffCount: activeOnShift.length,
      activeStaff: activeOnShift,
      movieRevenue,
      accessoryRevenue,
      operatingExpenses,
      staffWages,
      expenses: totalExpenses,
      purchases: totalPurchases,
      netCash,
      netCashFlow,
      isLoaded,
    };
  }, [
    activeBranch,
    activeOnShift,
    entries,
    expenses,
    getActiveOpenRecord,
    getCloseRequestedRecord,
    getClosedRecord,
    getOpenRecord,
    isBranchDayClosed,
    isBranchDayOpened,
    isLoaded,
    payments,
    purchases,
    sales,
    salesMetrics.todayRevenue,
    today,
  ]);
}
