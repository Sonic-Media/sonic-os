import { BRANCH_IDS, EXPENSE_BREAKDOWN_ITEMS } from "@/lib/constants";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import type {
  Branch,
  BranchTotals,
  ChartDataPoint,
  Entry,
  Expense,
  ExpenseBreakdownKey,
  ReportDayInsight,
  ReportInsights,
  ReportSummary,
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

  for (const branch of BRANCH_IDS) {
    const savings = byBranch[branch].savings;
    if (bestPerformingBranch === undefined || savings > bestPerformingBranchSavings) {
      bestPerformingBranch = branch;
      bestPerformingBranchSavings = savings;
    }
  }

  return { bestPerformingBranch, bestPerformingBranchSavings };
}

export function classifyExpense(expense: Expense): ExpenseBreakdownKey {
  if (expense.id === "template-fuel") return "other";
  if (expense.id === "common-rent") return "rent";
  if (expense.id === "common-lunch") return "lunch";
  if (expense.id === "common-staff-payments") return "staff-payments";

  const name = expense.name.trim().toLowerCase();
  if (name === "rent") return "rent";
  if (name === "lunch") return "lunch";
  if (name === "staff payments") return "staff-payments";

  return "other";
}

export function buildExpenseBreakdown(entries: Entry[]) {
  const totals: Record<ExpenseBreakdownKey, number> = {
    rent: 0,
    lunch: 0,
    "staff-payments": 0,
    other: 0,
  };

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