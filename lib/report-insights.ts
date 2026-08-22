import { aggregateEntries } from "@/lib/aggregations";
import { EXPENSE_BREAKDOWN_ITEMS } from "@/lib/constants";
import {
  filterCompletedEntries,
  filterEntriesByPeriod,
  filterEntriesByPreviousPeriod,
} from "@/lib/entry-helpers";
import { aggregateEntriesByStaff } from "@/lib/staff-reports";
import type {
  BestBranchResult,
  BestStaffResult,
  Branch,
  BranchTotals,
  ChartDataPoint,
  DashboardAnalytics,
  DashboardMetricWithTrend,
  DashboardPeriod,
  DashboardQuickInsights,
  Entry,
  Expense,
  ExpenseBreakdownItem,
  ExpenseBreakdownKey,
  ReportDayInsight,
  ReportInsights,
  ReportSummary,
  Staff,
  TrendResult,
} from "@/types";

function findPeakDay(
  chartData: ChartDataPoint[],
  field: "sales" | "expenses" | "savings"
): ReportDayInsight | undefined {
  if (chartData.length === 0) return undefined;

  const peak = chartData.reduce((best, point) =>
    point[field] > best[field] ? point : best
  );

  return { label: peak.label, value: peak[field] };
}

function findBestPerformingBranch(
  byBranch: Record<Branch, BranchTotals>
): Pick<ReportInsights, "bestPerformingBranch" | "bestPerformingBranchSavings"> {
  let bestPerformingBranch: Branch | undefined;
  let bestPerformingBranchSavings = 0;

  for (const [branch, totals] of Object.entries(byBranch) as Array<
    [Branch, BranchTotals]
  >) {
    const savings = totals.savings;
    if (bestPerformingBranch === undefined || savings > bestPerformingBranchSavings) {
      bestPerformingBranch = branch;
      bestPerformingBranchSavings = savings;
    }
  }

  return { bestPerformingBranch, bestPerformingBranchSavings };
}

const TEMPLATE_CATEGORY_MAP: Record<string, ExpenseBreakdownKey> = {
  "common-rent": "rent",
  "common-staff-payments": "staff-payments",
  "common-lunch": "lunch",
  "common-electricity": "electricity",
  "common-internet": "internet",
  "common-transport": "transport",
  "common-repairs": "repairs",
  "common-inventory": "inventory",
  "template-fuel": "transport",
};

const NAME_CATEGORY_MAP: Record<string, ExpenseBreakdownKey> = {
  rent: "rent",
  staff: "staff-payments",
  "staff payments": "staff-payments",
  lunch: "lunch",
  electricity: "electricity",
  internet: "internet",
  transport: "transport",
  fuel: "transport",
  repairs: "repairs",
  inventory: "inventory",
};

export function classifyExpense(expense: Expense): ExpenseBreakdownKey {
  if (TEMPLATE_CATEGORY_MAP[expense.id]) {
    return TEMPLATE_CATEGORY_MAP[expense.id];
  }

  const name = expense.name.trim().toLowerCase();
  return NAME_CATEGORY_MAP[name] ?? "other";
}

export function buildExpenseBreakdown(entries: Entry[]) {
  const totals = Object.fromEntries(
    EXPENSE_BREAKDOWN_ITEMS.map(({ key }) => [key, 0])
  ) as Record<ExpenseBreakdownKey, number>;

  for (const entry of filterCompletedEntries(entries)) {
    for (const expense of entry.expenses) {
      totals[classifyExpense(expense)] += expense.amount;
    }
  }

  return EXPENSE_BREAKDOWN_ITEMS.map(({ key, label }) => ({
    key,
    label,
    amount: totals[key],
  }));
}

export function getExpenseBreakdown(entries: Entry[]): ExpenseBreakdownItem[] {
  return buildExpenseBreakdown(entries);
}

export function getTrend(
  current: number,
  previous: number,
  options?: { invert?: boolean }
): TrendResult {
  const invert = options?.invert ?? false;
  let percent = 0;
  let direction: TrendResult["direction"] = "flat";

  if (previous === 0) {
    if (current > 0) {
      percent = 100;
      direction = "up";
    } else if (current < 0) {
      percent = 100;
      direction = "down";
    }
  } else {
    percent = ((current - previous) / Math.abs(previous)) * 100;
    if (percent > 0) direction = "up";
    else if (percent < 0) direction = "down";
  }

  const rounded = Math.round(Math.abs(percent));
  const arrow =
    direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const isPositive =
    direction === "flat"
      ? true
      : invert
        ? direction === "down"
        : direction === "up";

  return {
    percent: rounded,
    direction,
    isPositive,
    label: `${arrow} ${rounded}% vs previous period`,
  };
}

function calculateProfitMargin(sales: number, savings: number): number {
  if (sales === 0) return 0;
  return (savings / sales) * 100;
}

function withTrend(
  current: number,
  previous: number,
  options?: { invert?: boolean }
): DashboardMetricWithTrend {
  return {
    value: current,
    trend: getTrend(current, previous, options),
  };
}

export function getBestBranch(
  byBranch: Record<Branch, BranchTotals>,
  branchNames: Record<Branch, string>,
  totalSales: number
): BestBranchResult | null {
  if (totalSales === 0) return null;

  let bestBranch: Branch | undefined;
  let bestSales = 0;

  for (const [branch, totals] of Object.entries(byBranch) as Array<
    [Branch, BranchTotals]
  >) {
    if (totals.sales > bestSales) {
      bestBranch = branch;
      bestSales = totals.sales;
    }
  }

  if (!bestBranch || bestSales === 0) return null;

  return {
    branch: bestBranch,
    name: branchNames[bestBranch] ?? bestBranch,
    totalSales: bestSales,
    revenuePercentage: (bestSales / totalSales) * 100,
  };
}

export function getBestStaff(
  entries: Entry[],
  staff: Staff[],
  branchNames: Record<Branch, string>
): BestStaffResult | null {
  const summaries = aggregateEntriesByStaff(entries, staff);
  if (summaries.length === 0) return null;

  const best = summaries.reduce((current, candidate) =>
    candidate.totalSales > current.totalSales ? candidate : current
  );

  if (best.totalSales === 0) return null;

  return {
    staffName: best.staffName,
    totalSales: best.totalSales,
    branch: best.branch,
    branchName: branchNames[best.branch],
  };
}

function getHighestExpenseCategory(
  breakdown: ExpenseBreakdownItem[]
): DashboardQuickInsights["highestExpenseCategory"] {
  const withAmount = breakdown.filter((item) => item.amount > 0);
  if (withAmount.length === 0) return null;

  const highest = withAmount.reduce((current, candidate) =>
    candidate.amount > current.amount ? candidate : current
  );

  return { label: highest.label, amount: highest.amount };
}

function buildQuickInsights(
  entries: Entry[],
  summary: ReportSummary
): DashboardQuickInsights {
  const dayCount = summary.chartData.length;
  const expenseBreakdown = getExpenseBreakdown(entries);

  return {
    highestExpenseCategory: getHighestExpenseCategory(expenseBreakdown),
    mostExpensiveDay: summary.insights.highestExpenseDay ?? null,
    highestSalesDay: summary.insights.highestSalesDay ?? null,
    highestSavingsDay: summary.insights.highestSavingsDay ?? null,
    averageDailySales:
      dayCount > 0 ? summary.totalSales / dayCount : 0,
    averageDailyExpenses:
      dayCount > 0 ? summary.totalExpenses / dayCount : 0,
    averageDailySavings:
      dayCount > 0 ? summary.totalSavings / dayCount : 0,
  };
}

export function getDashboardAnalyticsFromEntries(
  currentEntries: Entry[],
  previousEntries: Entry[],
  period: DashboardPeriod,
  options: {
    branchIds: Branch[];
    branchNames: Record<Branch, string>;
    staff: Staff[];
  }
): DashboardAnalytics {
  const current = aggregateEntries(currentEntries, {
    branchIds: options.branchIds,
  });
  const previous = aggregateEntries(previousEntries, {
    branchIds: options.branchIds,
  });

  const currentMargin = calculateProfitMargin(
    current.totalSales,
    current.totalSavings
  );
  const previousMargin = calculateProfitMargin(
    previous.totalSales,
    previous.totalSavings
  );

  return {
    period,
    sales: withTrend(current.totalSales, previous.totalSales),
    expenses: withTrend(current.totalExpenses, previous.totalExpenses, {
      invert: true,
    }),
    savings: withTrend(current.totalSavings, previous.totalSavings),
    profitMargin: withTrend(currentMargin, previousMargin),
    bestBranch: getBestBranch(
      current.byBranch,
      options.branchNames,
      current.totalSales
    ),
    bestStaff: getBestStaff(currentEntries, options.staff, options.branchNames),
    quickInsights: buildQuickInsights(currentEntries, current),
  };
}

export function getDashboardAnalytics(
  entries: Entry[],
  period: DashboardPeriod,
  options: {
    branchIds: Branch[];
    branchNames: Record<Branch, string>;
    staff: Staff[];
    ref?: Date;
  }
): DashboardAnalytics {
  const ref = options.ref ?? new Date();
  const currentEntries = filterEntriesByPeriod(entries, period, ref);
  const previousEntries = filterEntriesByPreviousPeriod(entries, period, ref);

  return getDashboardAnalyticsFromEntries(
    currentEntries,
    previousEntries,
    period,
    {
      branchIds: options.branchIds,
      branchNames: options.branchNames,
      staff: options.staff,
    }
  );
}

export function buildReportInsights(
  entries: Entry[],
  summary: Pick<
    ReportSummary,
    | "chartData"
    | "byBranch"
    | "totalSales"
    | "totalSavings"
  >
): ReportInsights {
  const dayCount = summary.chartData.length;

  return {
    highestSalesDay: findPeakDay(summary.chartData, "sales"),
    highestSavingsDay: findPeakDay(summary.chartData, "savings"),
    highestExpenseDay: findPeakDay(summary.chartData, "expenses"),
    averageDailySales: dayCount > 0 ? summary.totalSales / dayCount : 0,
    averageDailySavings: dayCount > 0 ? summary.totalSavings / dayCount : 0,
    ...findBestPerformingBranch(summary.byBranch),
    expenseBreakdown: buildExpenseBreakdown(entries),
  };
}
