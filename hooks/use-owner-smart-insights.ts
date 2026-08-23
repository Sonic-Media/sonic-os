"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDashboardContext } from "@/context/dashboard-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import { useStock } from "@/context/stock-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { generateDashboardIntelligence } from "@/lib/dashboard-intelligence";
import {
  filterEntriesByDate,
  filterEntriesByPreviousPeriod,
} from "@/lib/entry-helpers";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";

function getYesterdayISO(reference = new Date()): string {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - 1);
  return copy.toISOString().slice(0, 10);
}

export interface SmartInsight {
  id: string;
  text: string;
  tone: "positive" | "neutral" | "warning";
}

function getHourFromTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getHours();
}

export function useOwnerSmartInsights() {
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  const { activeBranch } = useActiveBranch();
  const { entries } = useEntriesContext();
  const { settings } = useSettings();
  const { sales } = useSales();
  const { expenses } = useExpensesModule();
  const { metrics: salesMetrics } = useSalesDashboard();
  const { metrics: stockMetrics } = useStock();
  const { analytics, chartData } = useDashboardContext();

  return useMemo(() => {
    const insights: SmartInsight[] = [];
    const branchEntries = filterByBranchField(entries, activeBranch);
    const todayEntries = filterEntriesByDate(branchEntries, today);
    const previousEntries = filterEntriesByPreviousPeriod(branchEntries, "daily");

    const todayAccessoryRevenue = sales
      .filter(
        (sale) =>
          sale.date === today &&
          sale.status === "completed" &&
          branchCodesReferToSameInventory(sale.branch, activeBranch)
      )
      .reduce((sum, sale) => sum + sale.total, 0);

    const yesterdayAccessoryRevenue = sales
      .filter(
        (sale) =>
          sale.date === yesterday &&
          sale.status === "completed" &&
          branchCodesReferToSameInventory(sale.branch, activeBranch)
      )
      .reduce((sum, sale) => sum + sale.total, 0);

    if (todayAccessoryRevenue > 0 && yesterdayAccessoryRevenue > 0) {
      if (todayAccessoryRevenue > yesterdayAccessoryRevenue) {
        insights.push({
          id: "accessory-up",
          text: "Accessory sales are higher than yesterday.",
          tone: "positive",
        });
      } else if (todayAccessoryRevenue < yesterdayAccessoryRevenue) {
        insights.push({
          id: "accessory-down",
          text: "Accessory sales are lower than yesterday so far.",
          tone: "neutral",
        });
      }
    }

    const revenueHours = todayEntries
      .map((entry) => getHourFromTimestamp(entry.createdAt))
      .filter((hour): hour is number => hour !== null);

    if (revenueHours.length >= 2) {
      const eveningCount = revenueHours.filter((hour) => hour >= 17).length;
      const morningCount = revenueHours.filter((hour) => hour < 12).length;
      if (eveningCount > morningCount) {
        insights.push({
          id: "evening-peak",
          text: "Revenue usually peaks in the evening.",
          tone: "neutral",
        });
      }
    }

    const hasExpensesToday =
      todayEntries.some((entry) => entry.expenses.length > 0) ||
      expenses.some(
        (expense) =>
          expense.date === today &&
          branchCodesReferToSameInventory(expense.branch, activeBranch)
      );

    if (!hasExpensesToday) {
      insights.push({
        id: "no-expenses",
        text: "No expenses recorded today.",
        tone: "warning",
      });
    }

    if ((stockMetrics.lowStock ?? 0) > 0 || (stockMetrics.outOfStock ?? 0) > 0) {
      insights.push({
        id: "inventory-low",
        text: "Inventory is running low.",
        tone: "warning",
      });
    }

    if (analytics.bestStaff) {
      insights.push({
        id: "best-staff",
        text: `Today's best performing staff: ${analytics.bestStaff.staffName} (${formatCurrency(analytics.bestStaff.totalSales)}).`,
        tone: "positive",
      });
    }

    const intelligence = generateDashboardIntelligence({
      analytics,
      chartData,
      branchNames: settings.branchNames,
      currentEntries: todayEntries,
      previousEntries,
      todayProgress: [],
    });

    for (const item of intelligence.insights.slice(0, 3)) {
      if (insights.some((insight) => insight.text === item.text)) continue;
      insights.push({
        id: item.id,
        text: item.text,
        tone:
          item.tone === "positive"
            ? "positive"
            : item.tone === "warning" || item.tone === "negative"
              ? "warning"
              : "neutral",
      });
    }

    if ((salesMetrics.todayRevenue ?? 0) === 0 && todayEntries.length === 0) {
      insights.unshift({
        id: "start-day",
        text: "Record today's first sale to unlock deeper insights.",
        tone: "neutral",
      });
    }

    return insights.slice(0, 6);
  }, [
    activeBranch,
    analytics,
    chartData,
    entries,
    expenses,
    sales,
    salesMetrics.todayRevenue,
    settings.branchNames,
    stockMetrics.lowStock,
    stockMetrics.outOfStock,
    today,
    yesterday,
  ]);
}
