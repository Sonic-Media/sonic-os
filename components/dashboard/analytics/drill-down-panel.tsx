"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnalyticsBarChart } from "@/components/charts/bar-chart";
import { AnalyticsDoughnutChart } from "@/components/charts/doughnut-chart";
import { AnalyticsLineChart } from "@/components/charts/line-chart";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatEntryDisplayDate } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  buildEntrySalesTrend,
  findPeakExpenseEntry,
  getEntriesForChartLabel,
  getTrendVsAverage,
} from "@/lib/insight-helpers";
import type { DrillDownView } from "@/lib/analytics-view";
import type { DashboardChartData } from "@/lib/chart-data";
import type {
  BestBranchResult,
  BestStaffResult,
  Branch,
  ChartDataPoint,
  DashboardQuickInsights,
  Entry,
} from "@/types";
import { TotalsGrid } from "@/components/shared/totals-grid";
import { cn } from "@/lib/utils";

interface DrillDownPanelProps {
  view: DrillDownView;
  onClose: () => void;
  entries: Entry[];
  bestBranch: BestBranchResult | null;
  bestStaff: BestStaffResult | null;
  quickInsights: DashboardQuickInsights;
  salesTrend: ChartDataPoint[];
  chartData: DashboardChartData;
  branchNames: Record<Branch, string>;
  expenseCategoryLabel?: string | null;
}

const VIEW_TITLES: Record<Exclude<DrillDownView, "none">, string> = {
  "expense-history": "Highest Expense",
  branch: "Best Branch",
  staff: "Best Staff",
  "sales-report": "Average Sales",
  "highest-sales-day": "Highest Sales Day",
  "highest-savings-day": "Highest Savings Day",
};

function DrawerSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      {children}
    </section>
  );
}

function HistoryList({
  entries,
  branchNames,
  valueLabel,
  getValue,
}: {
  entries: Entry[];
  branchNames: Record<Branch, string>;
  valueLabel: string;
  getValue: (entry: Entry) => number;
}) {
  if (entries.length === 0) {
    return <EmptyDrillDown message="No related entries for this period." />;
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 12).map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition-colors duration-200 hover:bg-zinc-900/70"
        >
          <div>
            <p className="text-sm font-medium text-white">
              {formatEntryDisplayDate(entry.date)}
            </p>
            <p className="text-xs text-zinc-500">
              {branchNames[entry.branch]} · {entry.staffName || "Unassigned"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-300">
              {formatCurrency(getValue(entry))}
            </p>
            <p className="text-xs text-zinc-500">{valueLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DrillDownPanel({
  view,
  onClose,
  entries,
  bestBranch,
  bestStaff,
  quickInsights,
  salesTrend,
  chartData,
  branchNames,
  expenseCategoryLabel,
}: DrillDownPanelProps) {
  useEffect(() => {
    if (view === "none") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [view]);

  if (view === "none") return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close insight drawer"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={VIEW_TITLES[view]}
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800/80 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-200 ease-out"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-zinc-800/80 px-5 py-4">
          <div>
            <h3 className="text-sm font-medium tracking-wide text-white">
              {VIEW_TITLES[view]}
            </h3>
            {view === "expense-history" && expenseCategoryLabel && (
              <p className="mt-1 text-xs text-zinc-500">
                {expenseCategoryLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-white"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {view === "branch" && (
            <BranchDrawerContent
              bestBranch={bestBranch}
              entries={entries}
              chartData={chartData}
              branchNames={branchNames}
            />
          )}
          {view === "staff" && (
            <StaffDrawerContent
              bestStaff={bestStaff}
              entries={entries}
              branchNames={branchNames}
            />
          )}
          {view === "expense-history" && (
            <ExpenseDrawerContent
              entries={entries}
              branchNames={branchNames}
              quickInsights={quickInsights}
              chartData={chartData}
              salesTrend={salesTrend}
            />
          )}
          {view === "sales-report" && (
            <SalesReportDrawerContent
              salesTrend={salesTrend}
              quickInsights={quickInsights}
            />
          )}
          {view === "highest-sales-day" && (
            <HighestSalesDayDrawerContent
              entries={entries}
              branchNames={branchNames}
              quickInsights={quickInsights}
              salesTrend={salesTrend}
            />
          )}
          {view === "highest-savings-day" && (
            <HighestSavingsDayDrawerContent
              entries={entries}
              branchNames={branchNames}
              quickInsights={quickInsights}
              savingsTrend={chartData.savingsTrend}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function BranchDrawerContent({
  bestBranch,
  entries,
  chartData,
  branchNames,
}: {
  bestBranch: BestBranchResult | null;
  entries: Entry[];
  chartData: DashboardChartData;
  branchNames: Record<Branch, string>;
}) {
  if (!bestBranch) {
    return <EmptyDrillDown message="No branch data available." />;
  }

  const branchEntries = entries.filter(
    (entry) => entry.branch === bestBranch.branch
  );
  let sales = 0;
  let expenses = 0;

  for (const entry of branchEntries) {
    sales += entry.sales;
    expenses += calculateExpenses(entry);
  }

  const savings = calculateSavingsFromTotals(sales, expenses);
  const branchTrend = buildEntrySalesTrend(branchEntries);

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="space-y-3">
          <p className="text-2xl font-semibold text-white">{bestBranch.name}</p>
          <p className="text-sm text-zinc-500">
            {formatPercent(bestBranch.revenuePercentage)} of total revenue ·{" "}
            {formatCurrency(bestBranch.totalSales)} sales
          </p>
          <TotalsGrid sales={sales} expenses={expenses} savings={savings} size="lg" />
        </div>
      </DrawerSection>

      <DrawerSection title="Trend">
        {branchTrend.length > 0 ? (
          <AnalyticsLineChart data={branchTrend} className="h-44 sm:h-48" />
        ) : (
          <EmptyDrillDown message="No trend data for this branch." />
        )}
      </DrawerSection>

      <DrawerSection title="Comparison">
        <AnalyticsBarChart
          data={chartData.branchComparison}
          className="h-44 sm:h-48"
        />
      </DrawerSection>

      <DrawerSection title="Related History">
        <HistoryList
          entries={branchEntries}
          branchNames={branchNames}
          valueLabel="Sales"
          getValue={(entry) => entry.sales}
        />
      </DrawerSection>
    </div>
  );
}

function StaffDrawerContent({
  bestStaff,
  entries,
  branchNames,
}: {
  bestStaff: BestStaffResult | null;
  entries: Entry[];
  branchNames: Record<Branch, string>;
}) {
  if (!bestStaff) {
    return <EmptyDrillDown message="No staff data available." />;
  }

  const staffEntries = entries.filter(
    (entry) => entry.staffName === bestStaff.staffName
  );
  let sales = 0;
  let expenses = 0;

  for (const entry of staffEntries) {
    sales += entry.sales;
    expenses += calculateExpenses(entry);
  }

  const staffTrend = buildEntrySalesTrend(staffEntries);
  const avgPerEntry =
    staffEntries.length > 0 ? sales / staffEntries.length : 0;

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="space-y-3">
          <p className="text-2xl font-semibold text-white">{bestStaff.staffName}</p>
          <p className="text-sm text-zinc-500">{bestStaff.branchName}</p>
          <TotalsGrid
            sales={sales}
            expenses={expenses}
            savings={calculateSavingsFromTotals(sales, expenses)}
            size="lg"
          />
          <p className="text-sm text-zinc-500">
            {formatCurrency(avgPerEntry)} average per entry · {staffEntries.length}{" "}
            {staffEntries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </DrawerSection>

      <DrawerSection title="Trend">
        {staffTrend.length > 0 ? (
          <AnalyticsLineChart data={staffTrend} className="h-44 sm:h-48" />
        ) : (
          <EmptyDrillDown message="No trend data for this staff member." />
        )}
      </DrawerSection>

      <DrawerSection title="Related History">
        <HistoryList
          entries={staffEntries}
          branchNames={branchNames}
          valueLabel="Sales"
          getValue={(entry) => entry.sales}
        />
      </DrawerSection>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/60 py-2.5 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function ExpenseDrawerContent({
  entries,
  branchNames,
  quickInsights,
  chartData,
  salesTrend,
}: {
  entries: Entry[];
  branchNames: Record<Branch, string>;
  quickInsights: DashboardQuickInsights;
  chartData: DashboardChartData;
  salesTrend: ChartDataPoint[];
}) {
  const category = quickInsights.highestExpenseCategory;
  const peakEntry = findPeakExpenseEntry(
    entries,
    category?.label ?? "",
    quickInsights.mostExpensiveDay?.label
  );

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {category?.label ?? "Highest category"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatCurrency(category?.amount ?? 0)}
          </p>
        </div>
      </DrawerSection>

      <DrawerSection title="Details">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4">
          <MetadataRow
            label="Occurred"
            value={quickInsights.mostExpensiveDay?.label ?? "—"}
          />
          <MetadataRow
            label="Branch"
            value={
              peakEntry ? branchNames[peakEntry.branch] : "—"
            }
          />
          <MetadataRow
            label="Recorded By"
            value={peakEntry?.staffName || "—"}
          />
        </div>
      </DrawerSection>

      <DrawerSection title="Breakdown">
        {chartData.expenseBreakdown.length > 0 ? (
          <AnalyticsDoughnutChart
            data={chartData.expenseBreakdown}
            className="h-44 sm:h-48"
          />
        ) : (
          <EmptyDrillDown message="No expense breakdown for this period." />
        )}
      </DrawerSection>

      <DrawerSection title="Trend">
        {salesTrend.length > 0 ? (
          <AnalyticsLineChart data={salesTrend} className="h-44 sm:h-48" />
        ) : (
          <EmptyDrillDown message="No expense trend for this period." />
        )}
      </DrawerSection>

      <DrawerSection title="Related Entries">
        <HistoryList
          entries={entries}
          branchNames={branchNames}
          valueLabel="Expenses"
          getValue={(entry) => calculateExpenses(entry)}
        />
        <Link
          href="/history"
          className="mt-3 inline-flex text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          View History →
        </Link>
      </DrawerSection>
    </div>
  );
}

function SalesReportDrawerContent({
  salesTrend,
  quickInsights,
}: {
  salesTrend: ChartDataPoint[];
  quickInsights: DashboardQuickInsights;
}) {
  const peak = salesTrend.reduce<ChartDataPoint | null>(
    (best, point) =>
      !best || point.sales > best.sales ? point : best,
    null
  );

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Average Daily Sales
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatCurrency(quickInsights.averageDailySales)}
          </p>
          {peak && (
            <p className="mt-2 text-sm text-zinc-500">
              Peak day: {peak.label} ({formatCurrency(peak.sales)})
            </p>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title="Trend">
        {salesTrend.length > 0 ? (
          <AnalyticsLineChart data={salesTrend} className="h-44 sm:h-48" />
        ) : (
          <EmptyDrillDown message="No sales data for this period." />
        )}
      </DrawerSection>

      <DrawerSection title="Daily Breakdown">
        <div className="space-y-2">
          {salesTrend.map((point) => (
            <div
              key={point.label}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 px-4 py-3 transition-colors duration-200 hover:bg-zinc-900/50"
            >
              <span className="text-sm text-zinc-400">{point.label}</span>
              <div className="text-right">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(point.sales)}
                </span>
                <p className="text-xs text-zinc-500">
                  {getTrendVsAverage(
                    point.sales,
                    quickInsights.averageDailySales
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DrawerSection>
    </div>
  );
}

function HighestSalesDayDrawerContent({
  entries,
  branchNames,
  quickInsights,
  salesTrend,
}: {
  entries: Entry[];
  branchNames: Record<Branch, string>;
  quickInsights: DashboardQuickInsights;
  salesTrend: ChartDataPoint[];
}) {
  const peak = quickInsights.highestSalesDay;

  if (!peak) {
    return <EmptyDrillDown message="No sales data for this period." />;
  }

  const dayEntries = getEntriesForChartLabel(entries, peak.label);

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {peak.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatCurrency(peak.value)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {getTrendVsAverage(peak.value, quickInsights.averageDailySales)}
          </p>
        </div>
      </DrawerSection>

      <DrawerSection title="Trend">
        <AnalyticsLineChart data={salesTrend} className="h-44 sm:h-48" />
      </DrawerSection>

      <DrawerSection title="Related Entries">
        <HistoryList
          entries={dayEntries}
          branchNames={branchNames}
          valueLabel="Sales"
          getValue={(entry) => entry.sales}
        />
        <Link
          href="/history"
          className="mt-3 inline-flex text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          View History →
        </Link>
      </DrawerSection>
    </div>
  );
}

function HighestSavingsDayDrawerContent({
  entries,
  branchNames,
  quickInsights,
  savingsTrend,
}: {
  entries: Entry[];
  branchNames: Record<Branch, string>;
  quickInsights: DashboardQuickInsights;
  savingsTrend: ChartDataPoint[];
}) {
  const peak = quickInsights.highestSavingsDay;

  if (!peak) {
    return <EmptyDrillDown message="No savings data for this period." />;
  }

  const dayEntries = getEntriesForChartLabel(entries, peak.label);

  return (
    <div className="space-y-6">
      <DrawerSection title="Summary">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {peak.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatCurrency(peak.value)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {getTrendVsAverage(peak.value, quickInsights.averageDailySavings)}
          </p>
        </div>
      </DrawerSection>

      <DrawerSection title="Trend">
        <AnalyticsLineChart data={savingsTrend} className="h-44 sm:h-48" />
      </DrawerSection>

      <DrawerSection title="Related Entries">
        <HistoryList
          entries={dayEntries}
          branchNames={branchNames}
          valueLabel="Savings"
          getValue={(entry) =>
            calculateSavingsFromTotals(entry.sales, calculateExpenses(entry))
          }
        />
        <Link
          href="/history"
          className="mt-3 inline-flex text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          View History →
        </Link>
      </DrawerSection>
    </div>
  );
}

function EmptyDrillDown({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-zinc-500">{message}</p>
  );
}
