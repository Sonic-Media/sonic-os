"use client";

import {
  Area,
  ComposedChart,
  Line,
  Tooltip,
  YAxis,
} from "recharts";
import { ChartAnalyticsTooltip } from "@/components/charts/chart-analytics-tooltip";
import { ChartCartesianAxes } from "@/components/charts/chart-axes";
import { ChartContainer } from "@/components/charts/chart-container";
import { InteractiveChartLegend } from "@/components/charts/interactive-chart-legend";
import { useActiveMetric } from "@/context/dashboard-context";
import { useChartRefreshKey } from "@/hooks/use-chart-refresh-key";
import { useChartSeries } from "@/hooks/use-chart-series";
import { CHART_COLORS } from "@/lib/chart-data";
import {
  CHART_ANIMATION_MS,
  CHART_SERIES,
  enrichChartData,
  getMetricStrokeOpacity,
} from "@/lib/chart-utils";
import { formatPercent } from "@/lib/format";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";

interface AnalyticsAreaChartProps {
  data: ChartDataPoint[];
  className?: string;
}

const SERIES_COLORS = Object.fromEntries(
  CHART_SERIES.map((series) => [series.key, series.color])
) as Record<string, string>;

export function AnalyticsAreaChart({
  data,
  className,
}: AnalyticsAreaChartProps) {
  const activeMetric = useActiveMetric();
  const refreshKey = useChartRefreshKey();
  const { visibility, toggleSeries } = useChartSeries();
  const enrichedData = enrichChartData(data);

  const isFocused =
    activeMetric === "all" ||
    activeMetric === "savings" ||
    activeMetric === "profit";

  return (
    <ChartContainer
      className={cn(!isFocused && "opacity-40", className)}
      refreshKey={refreshKey}
      footer={
        <InteractiveChartLegend
          visibility={visibility}
          onToggle={toggleSeries}
          className="mt-3"
        />
      }
    >
      <ComposedChart data={enrichedData}>
        <defs>
          <linearGradient id="savingsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={SERIES_COLORS.savings}
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor={SERIES_COLORS.savings}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
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
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke={SERIES_COLORS.savings}
          strokeWidth={isFocused ? 2.5 : 1.5}
          fill="url(#savingsAreaGradient)"
          dot={{ fill: SERIES_COLORS.savings, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: SERIES_COLORS.savings, strokeWidth: 0 }}
          hide={!visibility.savings}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke={SERIES_COLORS.sales}
          strokeWidth={1.5}
          strokeOpacity={getMetricStrokeOpacity(activeMetric, "sales")}
          dot={false}
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
          strokeWidth={1.5}
          strokeOpacity={getMetricStrokeOpacity(activeMetric, "expenses")}
          dot={false}
          hide={!visibility.expenses}
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
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          hide={!visibility.profit}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ChartContainer>
  );
}
