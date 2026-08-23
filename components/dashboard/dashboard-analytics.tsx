"use client";

import dynamic from "next/dynamic";
import { DashboardFilterToolbar } from "@/components/dashboard/analytics/dashboard-filter-toolbar";
import { AnalyticsSkeleton } from "@/components/dashboard/analytics/analytics-skeleton";
import { InsightsSection } from "@/components/dashboard/analytics/insights-section";
import { MetricCard } from "@/components/dashboard/analytics/metric-card";
import { OwnerCompactCharts } from "@/components/dashboard/owner/owner-compact-charts";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import {
  DashboardProvider,
  useDashboardContext,
} from "@/context/dashboard-context";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { MetricFocus } from "@/lib/analytics-view";
import type { DashboardMetricWithTrend } from "@/types";

const InteractiveCharts = dynamic(
  () =>
    import("@/components/dashboard/analytics/interactive-charts").then(
      (module) => ({ default: module.InteractiveCharts })
    ),
  { loading: () => <AnalyticsSkeleton /> }
);

const KpiDetailDrawer = dynamic(
  () =>
    import("@/components/dashboard/analytics/kpi-detail-drawer").then(
      (module) => ({ default: module.KpiDetailDrawer })
    ),
  { ssr: false }
);

const DrillDownPanel = dynamic(
  () =>
    import("@/components/dashboard/analytics/drill-down-panel").then(
      (module) => ({ default: module.DrillDownPanel })
    ),
  { ssr: false }
);

const METRIC_CONFIG: {
  key: MetricFocus;
  label: string;
  getValue: (
    analytics: ReturnType<typeof useDashboardContext>["analytics"]
  ) => number;
  getMetric: (
    analytics: ReturnType<typeof useDashboardContext>["analytics"]
  ) => DashboardMetricWithTrend;
  formatValue?: (value: number) => string;
  variant?: (
    analytics: ReturnType<typeof useDashboardContext>["analytics"]
  ) => "default" | "accent";
  className?: string;
}[] = [
  {
    key: "sales",
    label: "Sales",
    getValue: (a) => a.sales.value,
    getMetric: (a) => a.sales,
  },
  {
    key: "expenses",
    label: "Expenses",
    getValue: (a) => a.expenses.value,
    getMetric: (a) => a.expenses,
  },
  {
    key: "savings",
    label: "Savings",
    getValue: (a) => a.savings.value,
    getMetric: (a) => a.savings,
    variant: (a) => (a.savings.value >= 0 ? "accent" : "default"),
  },
  {
    key: "profit",
    label: "Profit Margin %",
    getValue: (a) => a.profitMargin.value,
    getMetric: (a) => a.profitMargin,
    formatValue: formatPercent,
    className: "col-span-2 sm:col-span-1",
  },
];

function trendTone(metric: DashboardMetricWithTrend) {
  return metric.trend.isPositive ? "positive" : "negative";
}

interface DashboardAnalyticsContentProps {
  variant?: "default" | "owner";
}

export function DashboardAnalyticsContent({
  variant = "default",
}: DashboardAnalyticsContentProps) {
  const {
    analytics,
    chartData,
    entries,
    isLoaded,
    activeMetric,
    openKpiDrawer,
    closeKpiDrawer,
    kpiDrawer,
    openDrillDown,
    expenseCategory,
    drillDown,
    closeDrillDown,
    branchNames,
    filteredEntries,
    timeFilter,
    customRange,
    branchFilter,
    staffFilter,
  } = useDashboardContext();

  if (!isLoaded) {
    return <AnalyticsSkeleton />;
  }

  const handleMetricClick = (key: MetricFocus) => {
    openKpiDrawer(key);
  };

  const expenseCategoryLabel = expenseCategory
    ? chartData.expenseBreakdown.find((slice) => slice.key === expenseCategory)
        ?.label ?? null
    : analytics.quickInsights.highestExpenseCategory?.label ?? null;

  if (variant === "owner") {
    return (
      <OwnerCard className="space-y-6">
        <div>
          <OwnerSectionTitle>Analytics</OwnerSectionTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Trends and KPIs for the selected period.
          </p>
        </div>

        <DashboardFilterToolbar className="mb-0" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {METRIC_CONFIG.map((metric) => {
            const data = metric.getMetric(analytics);
            const isSelected = activeMetric === metric.key;

            return (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.getValue(analytics)}
                detail={data.trend.label}
                detailTone={trendTone(data)}
                formatValue={metric.formatValue ?? formatCurrency}
                variant={metric.variant?.(analytics)}
                isSelected={isSelected}
                onClick={() => handleMetricClick(metric.key)}
                className={`rounded-3xl ${metric.className ?? ""}`}
                animateFromZeroOnMount
              />
            );
          })}
        </div>

        <OwnerCompactCharts />

        <KpiDetailDrawer
          metric={kpiDrawer}
          onClose={closeKpiDrawer}
          onOpenReport={openDrillDown}
          entries={entries}
          analytics={analytics}
          quickInsights={analytics.quickInsights}
          salesTrend={chartData.salesTrend}
          chartData={chartData}
          bestBranch={analytics.bestBranch}
          branchNames={branchNames}
          timeFilter={timeFilter}
          customRange={customRange}
          branchFilter={branchFilter}
          staffFilter={staffFilter}
        />

        <DrillDownPanel
          view={drillDown}
          onClose={closeDrillDown}
          entries={filteredEntries}
          bestBranch={analytics.bestBranch}
          bestStaff={analytics.bestStaff}
          quickInsights={analytics.quickInsights}
          salesTrend={chartData.salesTrend}
          chartData={chartData}
          branchNames={branchNames}
          expenseCategoryLabel={expenseCategoryLabel}
        />
      </OwnerCard>
    );
  }

  return (
    <section className="mb-8">
      <DashboardFilterToolbar />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {METRIC_CONFIG.map((metric) => {
          const data = metric.getMetric(analytics);
          const isSelected = activeMetric === metric.key;

          return (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={metric.getValue(analytics)}
              detail={data.trend.label}
              detailTone={trendTone(data)}
              formatValue={metric.formatValue ?? formatCurrency}
              variant={metric.variant?.(analytics)}
              isSelected={isSelected}
              onClick={() => handleMetricClick(metric.key)}
              className={metric.className}
              animateFromZeroOnMount
            />
          );
        })}
      </div>

      <InteractiveCharts />

      <InsightsSection />

      <KpiDetailDrawer
        metric={kpiDrawer}
        onClose={closeKpiDrawer}
        onOpenReport={openDrillDown}
        entries={entries}
        analytics={analytics}
        quickInsights={analytics.quickInsights}
        salesTrend={chartData.salesTrend}
        chartData={chartData}
        bestBranch={analytics.bestBranch}
        branchNames={branchNames}
        timeFilter={timeFilter}
        customRange={customRange}
        branchFilter={branchFilter}
        staffFilter={staffFilter}
      />

      <DrillDownPanel
        view={drillDown}
        onClose={closeDrillDown}
        entries={filteredEntries}
        bestBranch={analytics.bestBranch}
        bestStaff={analytics.bestStaff}
        quickInsights={analytics.quickInsights}
        salesTrend={chartData.salesTrend}
        chartData={chartData}
        branchNames={branchNames}
        expenseCategoryLabel={expenseCategoryLabel}
      />
    </section>
  );
}

export function DashboardAnalyticsSection() {
  return (
    <DashboardProvider>
      <DashboardAnalyticsContent />
    </DashboardProvider>
  );
}
