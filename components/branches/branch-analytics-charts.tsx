"use client";

import dynamic from "next/dynamic";
import { AnalyticsBarChart } from "@/components/charts/bar-chart";
import { Card } from "@/components/shared/ui/card";
import type { BranchComparisonPoint } from "@/lib/chart-data";
import type { ChartDataPoint } from "@/types";

const ReportsChart = dynamic(
  () => import("@/components/reports/reports-chart"),
  { ssr: false }
);

interface BranchAnalyticsChartsProps {
  comparisonChartData?: BranchComparisonPoint[];
  trendChartData?: ChartDataPoint[];
}

export function BranchAnalyticsCharts({
  comparisonChartData,
  trendChartData,
}: BranchAnalyticsChartsProps) {
  return (
    <section className="space-y-8">
      {comparisonChartData && comparisonChartData.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
            Branch Comparison
          </h2>
          <Card className="!p-4">
            <AnalyticsBarChart data={comparisonChartData} />
          </Card>
        </div>
      )}

      {trendChartData && trendChartData.length > 0 && (
        <ReportsChart data={trendChartData} />
      )}
    </section>
  );
}
