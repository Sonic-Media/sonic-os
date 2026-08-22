import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatChartLabel } from "@/lib/dates";
import { classifyExpense } from "@/lib/report-insights";
import type { ChartDataPoint, Entry, ExpenseBreakdownKey } from "@/types";

export function getEntriesForChartLabel(
  entries: Entry[],
  chartLabel: string
): Entry[] {
  return entries.filter(
    (entry) => formatChartLabel(entry.date) === chartLabel
  );
}

export function buildEntrySalesTrend(entries: Entry[]): ChartDataPoint[] {
  const grouped = new Map<string, { sales: number; expenses: number }>();

  for (const entry of entries) {
    const existing = grouped.get(entry.date) ?? { sales: 0, expenses: 0 };
    existing.sales += entry.sales;
    existing.expenses += calculateExpenses(entry);
    grouped.set(entry.date, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      label: formatChartLabel(date),
      sales: data.sales,
      expenses: data.expenses,
      savings: calculateSavingsFromTotals(data.sales, data.expenses),
    }));
}

export function getTrendVsAverage(value: number, average: number): string {
  if (average <= 0) return "No comparison available";
  const delta = ((value - average) / average) * 100;
  const rounded = Math.round(Math.abs(delta));
  if (rounded === 0) return "Matches period average";
  const direction = delta > 0 ? "above" : "below";
  return `${rounded}% ${direction} period average`;
}

const EXPENSE_CATEGORY_KEYS: Record<string, ExpenseBreakdownKey> = {
  Rent: "rent",
  Staff: "staff-payments",
  Payroll: "staff-payments",
  "Staff Payments": "staff-payments",
  Lunch: "lunch",
  Electricity: "electricity",
  Internet: "internet",
  Transport: "transport",
  Repairs: "repairs",
  Inventory: "inventory",
  Other: "other",
};

export function findPeakExpenseEntry(
  entries: Entry[],
  categoryLabel: string,
  peakDayLabel?: string | null
): Entry | null {
  const categoryKey = EXPENSE_CATEGORY_KEYS[categoryLabel];
  if (!categoryKey) return null;

  const scopedEntries = peakDayLabel
    ? getEntriesForChartLabel(entries, peakDayLabel)
    : entries;

  let best: Entry | null = null;
  let bestAmount = 0;

  for (const entry of scopedEntries) {
    const amount = entry.expenses
      .filter((expense) => classifyExpense(expense) === categoryKey)
      .reduce((sum, expense) => sum + expense.amount, 0);

    if (amount > bestAmount) {
      bestAmount = amount;
      best = entry;
    }
  }

  return best;
}
