"use client";

import { Line, LineChart, Tooltip, YAxis } from "recharts";
import { ChartAnalyticsTooltip } from "@/components/charts/chart-analytics-tooltip";
import { ChartCartesianAxes } from "@/components/charts/chart-axes";
import { ChartContainer } from "@/components/charts/chart-container";
import { InteractiveChartLegend } from "@/components/charts/interactive-chart-legend";
import {
  useActiveMetric,
  useOptionalDashboardContext,
} from "@/context/dashboard-context";
import { useChartRefreshKey } from "@/hooks/use-chart-refresh-key";
import { useChartSeries } from "@/hooks/use-chart-series";
import { CHART_COLORS } from "@/lib/chart-data";
import {
  CHART_ANIMATION_MS,
  CHART_SERIES,
  enrichChartData,
  getMetricStrokeOpacity,
  getPrimaryMetricKey,
  mergeChartWithPrevious,
  type ChartLinePoint,
} from "@/lib/chart-utils";
import { formatPercent } from "@/lib/format";
import type { ChartDataPoint } from "@/types";

interface AnalyticsLineChartProps {
  data: ChartDataPoint[];
  previousData?: ChartDataPoint[];
  className?: string;
}

const SERIES_COLORS = Object.fromEntries(
  CHART_SERIES.map((series) => [series.key, series.color])
) as Record<string, string>;

export function AnalyticsLineChart({
  data,
  previousData,
  className,
}: AnalyticsLineChartProps) {
  const activeMetric = useActiveMetric();
  const context = useOptionalDashboardContext();
  const comparePrevious = context?.comparePrevious ?? false;
  const refreshKey = useChartRefreshKey();
  const { visibility, toggleSeries } = useChartSeries();

  const primaryKey = getPrimaryMetricKey(activeMetric);
  const enrichedData = enrichChartData(data);
  const chartData: ChartLinePoint[] = comparePrevious
    ? mergeChartWithPrevious(
        enrichedData,
        previousData ? enrichChartData(previousData) : undefined,
        activeMetric
      )
    : enrichedData;

  return (
    <ChartContainer
      className={className}
      refreshKey={refreshKey}
      footer={
        <InteractiveChartLegend
          visibility={visibility}
          onToggle={toggleSeries}
          className="mt-3"
        />
      }
    >
      <LineChart data={chartData}>
        <ChartCartesianAxes />
        <YAxis
          yAxisId="profit"
          orientation="right"
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatPercent(value)}
          width={40}
        />
        <Tooltip
          content={<ChartAnalyticsTooltip />}
          cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke={SERIES_COLORS.sales}
          strokeWidth={primaryKey === "sales" ? 2.5 : 1.5}
          strokeOpacity={getMetricStrokeOpacity(activeMetric, "sales")}
          dot={{ fill: SERIES_COLORS.sales, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: SERIES_COLORS.sales, strokeWidth: 0 }}
          hide={!visibility.sales}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke={SERIES_COLORS.expenses}
          strokeWidth={primaryKey === "expenses" ? 2.5 : 1.5}
          strokeOpacity={getMetricStrokeOpacity(activeMetric, "expenses")}
          dot={{ fill: SERIES_COLORS.expenses, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: SERIES_COLORS.expenses, strokeWidth: 0 }}
          hide={!visibility.expenses}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke={SERIES_COLORS.savings}
          strokeWidth={
            activeMetric === "savings" || activeMetric === "profit" ? 2.5 : 1.5
          }
          strokeOpacity={getMetricStrokeOpacity(activeMetric, "savings")}
          dot={{ fill: SERIES_COLORS.savings, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: SERIES_COLORS.savings, strokeWidth: 0 }}
          hide={!visibility.savings}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
        <Line
          yAxisId="profit"
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke={SERIES_COLORS.profit}
          strokeWidth={activeMetric === "profit" ? 2.5 : 1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={{ r: 4, fill: SERIES_COLORS.profit, strokeWidth: 0 }}
          hide={!visibility.profit}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
        {comparePrevious && previousData && previousData.length > 0 && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="previous"
            name="Previous period"
            stroke={CHART_COLORS.axis}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive
            animationDuration={CHART_ANIMATION_MS}
            animationEasing="ease-out"
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
