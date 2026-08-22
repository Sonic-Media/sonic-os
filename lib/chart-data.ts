import { aggregateEntries, getBranchTotals } from "@/lib/aggregations";
import {
  filterCompletedEntries,
  filterEntriesByPeriod,
} from "@/lib/entry-helpers";
import type {
  Branch,
  ChartDataPoint,
  DashboardPeriod,
  Entry,
  Expense,
} from "@/types";

export type ChartExpenseCategory = "rent" | "lunch" | "staff" | "fuel" | "other";

export interface ChartExpenseSlice {
  key: ChartExpenseCategory;
  label: string;
  value: number;
  color: string;
}

export interface BranchComparisonPoint {
  branch: string;
  sales: number;
  expenses: number;
  savings: number;
}

export interface DashboardChartData {
  hasData: boolean;
  salesTrend: ChartDataPoint[];
  savingsTrend: ChartDataPoint[];
  expenseBreakdown: ChartExpenseSlice[];
  branchComparison: BranchComparisonPoint[];
}

export const CHART_EXPENSE_CATEGORIES: {
  key: ChartExpenseCategory;
  label: string;
  color: string;
}[] = [
  { key: "rent", label: "Rent", color: "#ffffff" },
  { key: "lunch", label: "Lunch", color: "#d4d4d8" },
  { key: "staff", label: "Staff", color: "#a1a1aa" },
  { key: "fuel", label: "Fuel", color: "#71717a" },
  { key: "other", label: "Other", color: "#52525b" },
];

export const CHART_COLORS = {
  sales: "#ffffff",
  expenses: "#52525b",
  savings: "#d4d4d8",
  grid: "#27272a",
  axis: "#71717a",
} as const;

export function classifyChartExpense(expense: Expense): ChartExpenseCategory {
  if (
    expense.id === "template-fuel" ||
    expense.id === "common-transport"
  ) {
    return "fuel";
  }
  if (expense.id === "common-rent") return "rent";
  if (expense.id === "common-lunch") return "lunch";
  if (expense.id === "common-staff-payments") return "staff";

  const name = expense.name.trim().toLowerCase();
  if (name === "fuel" || name === "transport") return "fuel";
  if (name === "rent") return "rent";
  if (name === "lunch") return "lunch";
  if (name === "staff" || name === "staff payments") return "staff";

  return "other";
}

function buildChartExpenseBreakdown(entries: Entry[]): ChartExpenseSlice[] {
  const totals: Record<ChartExpenseCategory, number> = {
    rent: 0,
    lunch: 0,
    staff: 0,
    fuel: 0,
    other: 0,
  };

  for (const entry of filterCompletedEntries(entries)) {
    for (const expense of entry.expenses) {
      totals[classifyChartExpense(expense)] += expense.amount;
    }
  }

  return CHART_EXPENSE_CATEGORIES.map(({ key, label, color }) => ({
    key,
    label,
    value: totals[key],
    color,
  })).filter((slice) => slice.value > 0);
}

function buildBranchComparison(
  byBranch: ReturnType<typeof aggregateEntries>["byBranch"],
  branchNames: Record<Branch, string>,
  branchIds: Branch[]
): BranchComparisonPoint[] {
  return branchIds.map((branch) => {
    const totals = getBranchTotals(byBranch, branch);

    return {
      branch: branchNames[branch] ?? branch,
      sales: totals.sales,
      expenses: totals.expenses,
      savings: totals.savings,
    };
  });
}

export function getDashboardChartDataFromEntries(
  entries: Entry[],
  branchNames: Record<Branch, string>,
  branchIds: Branch[]
): DashboardChartData {
  const completedEntries = filterCompletedEntries(entries);
  const summary = aggregateEntries(entries, { branchIds });

  return {
    hasData: completedEntries.length > 0,
    salesTrend: summary.chartData,
    savingsTrend: summary.chartData,
    expenseBreakdown: buildChartExpenseBreakdown(entries),
    branchComparison: buildBranchComparison(
      summary.byBranch,
      branchNames,
      branchIds
    ),
  };
}

export function getDashboardChartData(
  entries: Entry[],
  period: DashboardPeriod,
  branchNames: Record<Branch, string>,
  branchIds: Branch[]
): DashboardChartData {
  const filteredEntries = filterEntriesByPeriod(entries, period);
  return getDashboardChartDataFromEntries(
    filteredEntries,
    branchNames,
    branchIds
  );
}
