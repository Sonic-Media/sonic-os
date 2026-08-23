"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranchState } from "@/hooks/use-branch-state";
import { useBusinessTransactions } from "@/hooks/use-business-transactions";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSales } from "@/context/sales-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { findCompletedEntryForBranchDate } from "@/lib/entry-helpers";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import { getTopAccessoryProduct } from "@/lib/operations/staff-day-insights";

export interface MissionControlInsight {
  id: string;
  text: string;
}

function getYesterdayISO(reference = new Date()): string {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - 1);
  return copy.toISOString().slice(0, 10);
}

export function useMissionControlInsights() {
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  const { activeBranch } = useActiveBranch();
  const branchState = useBranchState();
  const { sales } = useSales();
  const { expenses } = useExpensesModule();
  const { entries } = useEntriesContext();

  return useMemo(() => {
    const insights: MissionControlInsight[] = [];

    const branchSales = filterByBranchField(sales, activeBranch).filter(
      (sale) => sale.date === today && sale.status === "completed"
    );
    const yesterdaySales = filterByBranchField(sales, activeBranch).filter(
      (sale) => sale.date === yesterday && sale.status === "completed"
    );

    const todayAccessory = branchState.accessoryRevenue;
    const yesterdayAccessory = yesterdaySales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );

    if (todayAccessory > 0 && yesterdayAccessory > 0) {
      const diff = todayAccessory - yesterdayAccessory;
      if (diff > 0) {
        insights.push({
          id: "accessory-ahead",
          text: `Accessory sales already exceed yesterday by ${formatCurrency(diff)}.`,
        });
      } else if (diff < 0) {
        insights.push({
          id: "accessory-behind",
          text: `Accessory sales are ${formatCurrency(Math.abs(diff))} below yesterday so far.`,
        });
      }
    }

    if (branchState.status !== "closed" && branchState.movieRevenue <= 0) {
      insights.push({
        id: "movie-pending",
        text: "Movie revenue has not been submitted yet.",
      });
    }

    const hasOperatingExpenses =
      branchState.operatingExpenses > 0 ||
      expenses.some(
        (expense) =>
          expense.date === today &&
          branchCodesReferToSameInventory(expense.branch, activeBranch) &&
          !expense.staffPaymentId
      );

    if (!hasOperatingExpenses && branchState.status === "open") {
      insights.push({
        id: "no-expenses",
        text: "No expenses have been recorded today.",
      });
    }

    const topProduct = getTopAccessoryProduct(branchSales);
    if (topProduct) {
      insights.push({
        id: "top-product",
        text: `Highest selling accessory: ${topProduct}.`,
      });
    }

    if (branchSales.length > 0) {
      const averageSale = Math.round(
        todayAccessory / Math.max(branchSales.length, 1)
      );
      insights.push({
        id: "average-sale",
        text: `Average sale: ${formatCurrency(averageSale)}.`,
      });
    }

    if (branchState.staffWages <= 0 && branchState.status === "open") {
      insights.push({
        id: "wage-pending",
        text: "Staff daily wages have not been recorded yet.",
      });
    }

    const yesterdayEntry = findCompletedEntryForBranchDate(
      entries,
      activeBranch,
      yesterday
    );
    if (
      yesterdayEntry &&
      branchState.movieRevenue > 0 &&
      branchState.movieRevenue !== yesterdayEntry.sales
    ) {
      const diff = branchState.movieRevenue - yesterdayEntry.sales;
      if (diff > 0) {
        insights.push({
          id: "movie-up",
          text: `Movie revenue is up ${formatCurrency(diff)} compared to yesterday.`,
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        id: "steady",
        text:
          branchState.status === "closed"
            ? "Today's operations are complete."
            : "Business activity is flowing normally.",
      });
    }

    return insights.slice(0, 5);
  }, [
    activeBranch,
    branchState.accessoryRevenue,
    branchState.movieRevenue,
    branchState.operatingExpenses,
    branchState.staffWages,
    branchState.status,
    entries,
    expenses,
    sales,
    today,
    yesterday,
  ]);
}
