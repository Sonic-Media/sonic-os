"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSales } from "@/context/sales-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { computeDashboardOperatingExpenses } from "@/lib/dashboard/operating-expenses";
import { getTodayISO } from "@/lib/dates";
import { computeSalesDashboardMetrics } from "@/lib/sales/calculations";
import type { Sale } from "@/types/sales";

export function useSalesPage() {
  const today = getTodayISO();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const { entries, isLoaded: entriesLoaded } = useEntriesContext();
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const {
    getOpenRecord,
    getClosedRecord,
    isLoaded: closingLoaded,
  } = useDayClosing();

  const branchSales = useMemo(
    () => filterByBranchField(sales, activeBranch),
    [sales, activeBranch]
  );

  const metrics = useMemo(
    () => computeSalesDashboardMetrics(branchSales, today),
    [branchSales, today]
  );

  const accessoryRevenue = metrics.todayRevenue ?? 0;
  const transactions = metrics.transactionsToday ?? 0;

  const movieRevenue = useMemo(() => {
    const branchEntries = filterByBranchField(entries, activeBranch).filter(
      (entry) => entry.date === today
    );
    const closedRecord = getClosedRecord(activeBranch, today);
    const completedEntry = branchEntries.find((entry) => entry.status === "completed");
    const draftEntry = branchEntries.find((entry) => entry.status === "draft");
    const activeEntry = completedEntry ?? draftEntry;

    if (closedRecord?.summary?.sales != null) {
      return Number(closedRecord.summary.sales);
    }

    return Number(activeEntry?.sales ?? 0);
  }, [activeBranch, entries, getClosedRecord, today]);

  const operatingExpenses = useMemo(
    () =>
      computeDashboardOperatingExpenses(activeBranch, today, expenses, entries),
    [activeBranch, entries, expenses, today]
  );

  const totalRevenue = accessoryRevenue + movieRevenue;
  const netSales = totalRevenue - operatingExpenses;

  const recentSales = useMemo((): Sale[] => {
    return branchSales
      .filter((sale) => sale.status === "completed" && sale.date === today)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
  }, [branchSales, today]);

  return {
    isLoaded:
      salesLoaded && branchLoaded && entriesLoaded && expensesLoaded && closingLoaded,
    metrics,
    kpis: {
      transactions,
      totalRevenue,
      accessoryRevenue,
      movieRevenue,
    },
    todaySummary: {
      transactions,
      totalRevenue,
      accessoryRevenue,
      movieRevenue,
      operatingExpenses,
      netSales,
    },
    recentSales,
    today,
  };
}
