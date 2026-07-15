"use client";

import { AnalyticsAreaChart } from "@/components/charts/area-chart";
import { AnalyticsBarChart } from "@/components/charts/bar-chart";
import { ChartCard, ChartsEmptyState } from "@/components/charts/chart-card";
import { AnalyticsDoughnutChart } from "@/components/charts/doughnut-chart";
import { AnalyticsLineChart } from "@/components/charts/line-chart";
import type { DashboardChartData } from "@/lib/chart-data";

interface DashboardChartsProps {
  chartData: DashboardChartData;
}

export function DashboardCharts({ chartData }: DashboardChartsProps) {
  if (!chartData.hasData) {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
          Charts
        </h2>
        <ChartsEmptyState />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Charts
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="Sales Trend">
          <AnalyticsLineChart data={chartData.salesTrend} />
        </ChartCard>

        <ChartCard title="Expenses Breakdown">
          {chartData.expenseBreakdown.length > 0 ? (
            <AnalyticsDoughnutChart data={chartData.expenseBreakdown} />
          ) : (
            <p className="py-16 text-center text-sm text-zinc-500">
              No expense data for this period
            </p>
          )}
        </ChartCard>

        <ChartCard title="Savings Trend">
          <AnalyticsAreaChart data={chartData.savingsTrend} />
        </ChartCard>

        <ChartCard title="Branch Comparison">
          <AnalyticsBarChart data={chartData.branchComparison} />
        </ChartCard>
      </div>
    </div>
  );
}
