import type { Branch, BranchTotals, ChartDataPoint, Entry, ReportSummary } from "@/types";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatChartLabel } from "@/lib/dates";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import { buildReportInsights } from "@/lib/report-insights";
import {
  createInitialByBranch,
  normalizeBranchId,
  resolveReportBranchIds,
} from "@/lib/reports/branch-totals";
import { BRANCH_IDS } from "@/lib/constants";

export interface AggregateEntriesOptions {
  branchIds?: Branch[];
}

export function aggregateEntries(
  entries: Entry[],
  options: AggregateEntriesOptions = {}
): ReportSummary {
  const completedEntries = filterCompletedEntries(entries);
  const branchIds = resolveReportBranchIds(
    options.branchIds ?? BRANCH_IDS,
    completedEntries
  );
  const byBranch = createInitialByBranch(branchIds);

  let totalSales = 0;
  let totalExpenses = 0;

  for (const entry of completedEntries) {
    const branch = normalizeBranchId(entry.branch);
    if (!branch) {
      continue;
    }

    const branchTotals = byBranch[branch];
    if (!branchTotals) {
      throw new Error(
        `Report aggregation encountered branch "${entry.branch}" before initialization.`
      );
    }

    const expenses = calculateExpenses(entry);
    const savings = calculateSavingsFromTotals(entry.sales, expenses);

    totalSales += entry.sales;
    totalExpenses += expenses;

    branchTotals.sales += entry.sales;
    branchTotals.expenses += expenses;
    branchTotals.savings += savings;
  }

  const chartData = buildChartData(completedEntries);

  const summary = {
    totalSales,
    totalExpenses,
    totalSavings: calculateSavingsFromTotals(totalSales, totalExpenses),
    byBranch,
    chartData,
  };

  return {
    ...summary,
    insights: buildReportInsights(completedEntries, summary),
  };
}

function buildChartData(entries: Entry[]): ChartDataPoint[] {
  const grouped = new Map<string, { sales: number; expenses: number }>();

  for (const entry of entries) {
    const existing = grouped.get(entry.date) ?? { sales: 0, expenses: 0 };
    existing.sales += entry.sales;
    existing.expenses += calculateExpenses(entry);
    grouped.set(entry.date, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({
      label: formatChartLabel(label),
      sales: data.sales,
      expenses: data.expenses,
      savings: calculateSavingsFromTotals(data.sales, data.expenses),
    }));
}

export function getBranchTotals(
  byBranch: Record<Branch, BranchTotals>,
  branchId: Branch
): BranchTotals {
  const normalized = normalizeBranchId(branchId);
  if (!normalized) {
    throw new Error(`Invalid branch id "${branchId}".`);
  }

  const totals = byBranch[normalized];
  if (!totals) {
    throw new Error(
      `Branch "${normalized}" is missing from report aggregation output.`
    );
  }

  return totals;
}
