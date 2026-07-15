import type { ChartDataPoint, Entry, ReportSummary } from "@/types";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatChartLabel } from "@/lib/dates";
import { filterCompletedEntries } from "@/lib/entry-helpers";

export function aggregateEntries(entries: Entry[]): ReportSummary {
  const byBranch: ReportSummary["byBranch"] = {
    kansanga: { sales: 0, expenses: 0, savings: 0 },
    salaama: { sales: 0, expenses: 0, savings: 0 },
  };

  let totalSales = 0;
  let totalExpenses = 0;

  const completedEntries = filterCompletedEntries(entries);

  for (const entry of completedEntries) {
    const expenses = calculateExpenses(entry);
    const savings = calculateSavingsFromTotals(entry.sales, expenses);

    totalSales += entry.sales;
    totalExpenses += expenses;

    byBranch[entry.branch].sales += entry.sales;
    byBranch[entry.branch].expenses += expenses;
    byBranch[entry.branch].savings += savings;
  }

  const chartData = buildChartData(completedEntries);

  return {
    totalSales,
    totalExpenses,
    totalSavings: calculateSavingsFromTotals(totalSales, totalExpenses),
    byBranch,
    chartData,
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
