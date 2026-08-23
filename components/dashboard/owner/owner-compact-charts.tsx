"use client";

import { AnalyticsAreaChart } from "@/components/charts/area-chart";
import { AnalyticsBarChart } from "@/components/charts/bar-chart";
import { AnalyticsLineChart } from "@/components/charts/line-chart";
import { useDashboardContext } from "@/context/dashboard-context";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";

function CompactChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <OwnerCard className="p-5">
      <OwnerSectionTitle>{title}</OwnerSectionTitle>
      <div className="mt-4 h-44">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/20 px-4 text-center">
            <p className="text-sm font-medium text-zinc-400">Awaiting data</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Trends will appear once today&apos;s activity builds momentum.
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </OwnerCard>
  );
}

export function OwnerCompactCharts() {
  const { chartData, previousChartData } = useDashboardContext();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <CompactChartCard title="Revenue Trend" empty={!chartData.hasData}>
        <AnalyticsLineChart
          data={chartData.salesTrend}
          previousData={previousChartData.salesTrend}
        />
      </CompactChartCard>

      <CompactChartCard title="Expenses Trend" empty={!chartData.hasData}>
        <AnalyticsLineChart
          data={chartData.salesTrend}
          previousData={previousChartData.salesTrend}
        />
      </CompactChartCard>

      <CompactChartCard title="Profit Trend" empty={!chartData.hasData}>
        <AnalyticsAreaChart data={chartData.savingsTrend} />
      </CompactChartCard>

      <CompactChartCard
        title="Sales Breakdown"
        empty={chartData.branchComparison.length === 0}
      >
        <AnalyticsBarChart data={chartData.branchComparison} />
      </CompactChartCard>
    </div>
  );
}
