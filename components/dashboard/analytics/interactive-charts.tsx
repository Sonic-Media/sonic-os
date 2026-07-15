"use client";

import { AnalyticsAreaChart } from "@/components/charts/area-chart";
import { AnalyticsBarChart } from "@/components/charts/bar-chart";
import { ChartCard, ChartsEmptyState } from "@/components/charts/chart-card";
import { AnalyticsDoughnutChart } from "@/components/charts/doughnut-chart";
import { AnalyticsLineChart } from "@/components/charts/line-chart";
import { MetricFilterChips } from "@/components/dashboard/analytics/metric-filter-chips";
import { useDashboardContext } from "@/context/dashboard-context";
import { getChartVisibility } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

export function InteractiveCharts() {
  const { chartData, previousChartData, activeMetric } = useDashboardContext();

  if (!chartData.hasData) {
    return (
      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-medium text-zinc-500 tracking-wide uppercase">
            Charts
          </h2>
          <MetricFilterChips />
        </div>
        <ChartsEmptyState />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-sm font-medium text-zinc-500 tracking-wide uppercase">
          Charts
        </h2>
        <MetricFilterChips />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 animate-in fade-in duration-300">
        {getChartVisibility(activeMetric, "sales") && (
          <ChartCard
            title="Sales Trend"
            className={cn(
              "transition-[box-shadow] duration-200",
              activeMetric === "sales" && "ring-1 ring-white/15"
            )}
          >
            <AnalyticsLineChart
              data={chartData.salesTrend}
              previousData={previousChartData.salesTrend}
            />
          </ChartCard>
        )}

        {getChartVisibility(activeMetric, "expenses") && (
          <ChartCard
            title="Expenses Breakdown"
            className={cn(
              "transition-[box-shadow] duration-200",
              activeMetric === "expenses" && "ring-1 ring-white/15"
            )}
          >
            {chartData.expenseBreakdown.length > 0 ? (
              <AnalyticsDoughnutChart data={chartData.expenseBreakdown} />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">
                No expense data for this period
              </p>
            )}
          </ChartCard>
        )}

        {getChartVisibility(activeMetric, "savings") && (
          <ChartCard
            title="Savings Trend"
            className={cn(
              "transition-[box-shadow] duration-200",
              (activeMetric === "savings" || activeMetric === "profit") &&
                "ring-1 ring-white/15"
            )}
          >
            <AnalyticsAreaChart data={chartData.savingsTrend} />
          </ChartCard>
        )}

        {getChartVisibility(activeMetric, "branch") && (
          <ChartCard title="Branch Comparison">
            <AnalyticsBarChart data={chartData.branchComparison} />
          </ChartCard>
        )}
      </div>
    </div>
  );
}
