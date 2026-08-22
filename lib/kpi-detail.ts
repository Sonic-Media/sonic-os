import { aggregateEntries } from "@/lib/aggregations";
import {
  filterEntriesByPeriod,
  filterEntriesByPreviousPeriod,
} from "@/lib/entry-helpers";
import { getTrend } from "@/lib/report-insights";
import { filterEntriesByStaff } from "@/lib/staff-reports";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  filterEntriesByBranch,
  resolvePeriodEntries,
  type AnalyticsTimeFilter,
  type CustomDateRange,
  type MetricFocus,
} from "@/lib/analytics-view";
import type {
  BestBranchResult,
  Branch,
  ChartDataPoint,
  DashboardAnalytics,
  DashboardQuickInsights,
  Entry,
  ReportDayInsight,
  TrendResult,
} from "@/types";

export interface KpiComparisonRow {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative" | "neutral";
}

export interface KpiDetailSnapshot {
  title: string;
  rows: KpiComparisonRow[];
  reportAction?: {
    label: string;
    view: "sales-report" | "expense-history";
  };
}

function calculateProfitMargin(sales: number, savings: number): number {
  if (sales === 0) return 0;
  return (savings / sales) * 100;
}

function trendTone(trend: TrendResult): "positive" | "negative" | "neutral" {
  return trend.isPositive ? "positive" : "negative";
}

function formatComparisonTrend(current: number, previous: number): KpiComparisonRow {
  const trend = getTrend(current, previous);
  return {
    label: "",
    value: trend.label,
    tone: trendTone(trend),
  };
}

function getMarginExtremes(chartData: ChartDataPoint[]) {
  if (chartData.length === 0) return { highest: null, lowest: null };

  const margins = chartData.map((point) => ({
    label: point.label,
    margin: calculateProfitMargin(point.sales, point.savings),
  }));

  const highest = margins.reduce((best, point) =>
    point.margin > best.margin ? point : best
  );
  const lowest = margins.reduce((best, point) =>
    point.margin < best.margin ? point : best
  );

  return { highest, lowest };
}

function getLargestSingleExpense(entries: Entry[]) {
  let label = "—";
  let amount = 0;

  for (const entry of entries) {
    for (const expense of entry.expenses) {
      if (expense.amount > amount) {
        amount = expense.amount;
        label = expense.name;
      }
    }
  }

  return amount > 0 ? { label, amount } : null;
}

function getBestSavingDay(chartData: ChartDataPoint[]): ReportDayInsight | null {
  if (chartData.length === 0) return null;
  const peak = chartData.reduce((best, point) =>
    point.savings > best.savings ? point : best
  );
  return { label: peak.label, value: peak.savings };
}

function applyDashboardFilters(
  entries: Entry[],
  options: {
    branchFilter: Branch | null;
    staffFilter: string | null;
  }
) {
  let filtered = entries;
  if (options.branchFilter) {
    filtered = filterEntriesByBranch(filtered, options.branchFilter);
  }
  if (options.staffFilter) {
    filtered = filterEntriesByStaff(filtered, options.staffFilter);
  }
  return filtered;
}

function currencyRow(label: string, value: number, detail?: string): KpiComparisonRow {
  return {
    label,
    value: formatCurrency(value),
    detail,
  };
}

function percentRow(label: string, value: number, detail?: string): KpiComparisonRow {
  return {
    label,
    value: formatPercent(value),
    detail,
  };
}

export function buildKpiDetailSnapshot(
  metric: MetricFocus,
  options: {
    entries: Entry[];
    analytics: DashboardAnalytics;
    quickInsights: DashboardQuickInsights;
    salesTrend: ChartDataPoint[];
    bestBranch: BestBranchResult | null;
    branchNames: Record<Branch, string>;
    timeFilter: AnalyticsTimeFilter;
    customRange: CustomDateRange;
    branchFilter: Branch | null;
    staffFilter: string | null;
  }
): KpiDetailSnapshot | null {
  if (metric === "all") return null;

  const filteredEntries = applyDashboardFilters(options.entries, {
    branchFilter: options.branchFilter,
    staffFilter: options.staffFilter,
  });

  const branchIds = Object.keys(options.branchNames) as Branch[];
  const aggregateOptions = { branchIds };

  const { previousEntries } = resolvePeriodEntries(
    filteredEntries,
    options.timeFilter,
    options.customRange
  );
  const previousSummary = aggregateEntries(previousEntries, aggregateOptions);
  const previousMargin = calculateProfitMargin(
    previousSummary.totalSales,
    previousSummary.totalSavings
  );

  const todaySales = aggregateEntries(
    filterEntriesByPeriod(filteredEntries, "daily"),
    aggregateOptions
  ).totalSales;
  const yesterdaySales = aggregateEntries(
    filterEntriesByPreviousPeriod(filteredEntries, "daily"),
    aggregateOptions
  ).totalSales;
  const weekSales = aggregateEntries(
    filterEntriesByPeriod(filteredEntries, "weekly"),
    aggregateOptions
  ).totalSales;
  const lastWeekSales = aggregateEntries(
    filterEntriesByPreviousPeriod(filteredEntries, "weekly"),
    aggregateOptions
  ).totalSales;

  const bestPerformingBranch = aggregateEntries(
    filteredEntries,
    aggregateOptions
  ).insights.bestPerformingBranch;
  const bestPerformingBranchName = bestPerformingBranch
    ? options.branchNames[bestPerformingBranch]
    : null;

  const marginExtremes = getMarginExtremes(options.salesTrend);
  const largestExpense = getLargestSingleExpense(filteredEntries);
  const bestSavingDay = getBestSavingDay(options.salesTrend);

  switch (metric) {
    case "sales": {
      const vsYesterday = formatComparisonTrend(todaySales, yesterdaySales);
      const vsLastWeek = formatComparisonTrend(weekSales, lastWeekSales);

      return {
        title: "Sales",
        rows: [
          currencyRow("Total Sales", options.analytics.sales.value),
          {
            label: "Compared to Yesterday",
            value: vsYesterday.value,
            tone: vsYesterday.tone,
          },
          {
            label: "Compared to Last Week",
            value: vsLastWeek.value,
            tone: vsLastWeek.tone,
          },
          {
            label: "Top Branch",
            value: options.bestBranch?.name ?? "—",
            detail: options.bestBranch
              ? `${Math.round(options.bestBranch.revenuePercentage)}% of revenue`
              : undefined,
          },
          {
            label: "Top Selling Day",
            value: options.quickInsights.highestSalesDay?.label ?? "—",
            detail: options.quickInsights.highestSalesDay
              ? formatCurrency(options.quickInsights.highestSalesDay.value)
              : undefined,
          },
          currencyRow(
            "Average Daily Sales",
            options.quickInsights.averageDailySales
          ),
        ],
        reportAction: { label: "View Full Report", view: "sales-report" },
      };
    }

    case "expenses": {
      return {
        title: "Expenses",
        rows: [
          currencyRow("Total Expenses", options.analytics.expenses.value),
          {
            label: "Highest Expense Category",
            value: options.quickInsights.highestExpenseCategory?.label ?? "—",
            detail: options.quickInsights.highestExpenseCategory
              ? formatCurrency(options.quickInsights.highestExpenseCategory.amount)
              : undefined,
          },
          {
            label: "Highest Expense Day",
            value: options.quickInsights.mostExpensiveDay?.label ?? "—",
            detail: options.quickInsights.mostExpensiveDay
              ? formatCurrency(options.quickInsights.mostExpensiveDay.value)
              : undefined,
          },
          currencyRow(
            "Average Daily Expenses",
            options.quickInsights.averageDailyExpenses
          ),
          {
            label: "Largest Single Expense",
            value: largestExpense?.label ?? "—",
            detail: largestExpense
              ? formatCurrency(largestExpense.amount)
              : undefined,
          },
        ],
        reportAction: { label: "View Full Report", view: "expense-history" },
      };
    }

    case "savings": {
      const savingsRate = calculateProfitMargin(
        options.analytics.sales.value,
        options.analytics.savings.value
      );

      return {
        title: "Savings",
        rows: [
          currencyRow("Total Savings", options.analytics.savings.value),
          percentRow("Savings Rate", savingsRate),
          {
            label: "Best Saving Day",
            value: bestSavingDay?.label ?? "—",
            detail: bestSavingDay
              ? formatCurrency(bestSavingDay.value)
              : undefined,
          },
          currencyRow(
            "Average Daily Savings",
            options.quickInsights.averageDailySavings
          ),
          {
            label: "Best Performing Branch",
            value: bestPerformingBranchName ?? "—",
          },
        ],
      };
    }

    case "profit": {
      return {
        title: "Profit Margin",
        rows: [
          percentRow("Current Margin", options.analytics.profitMargin.value),
          percentRow("Previous Margin", previousMargin),
          {
            label: "Highest Margin Day",
            value: marginExtremes.highest?.label ?? "—",
            detail: marginExtremes.highest
              ? formatPercent(marginExtremes.highest.margin)
              : undefined,
          },
          {
            label: "Lowest Margin Day",
            value: marginExtremes.lowest?.label ?? "—",
            detail: marginExtremes.lowest
              ? formatPercent(marginExtremes.lowest.margin)
              : undefined,
          },
          {
            label: "Trend Indicator",
            value: options.analytics.profitMargin.trend.label,
            tone: trendTone(options.analytics.profitMargin.trend),
          },
        ],
      };
    }

    default:
      return null;
  }
}
