"use client";

import { Bar, BarChart, Rectangle, Tooltip } from "recharts";
import type { BarShapeProps } from "recharts";
import { ChartAnalyticsTooltip } from "@/components/charts/chart-analytics-tooltip";
import { ChartCartesianAxes } from "@/components/charts/chart-axes";
import { ChartContainer } from "@/components/charts/chart-container";
import { InteractiveChartLegend } from "@/components/charts/interactive-chart-legend";
import {
  useOptionalDashboardContext,
} from "@/context/dashboard-context";
import { useChartRefreshKey } from "@/hooks/use-chart-refresh-key";
import { useChartSeries } from "@/hooks/use-chart-series";
import type { BranchComparisonPoint } from "@/lib/chart-data";
import {
  CHART_ANIMATION_MS,
  CHART_SERIES,
  calculateChartProfitMargin,
} from "@/lib/chart-utils";

interface AnalyticsBarChartProps {
  data: BranchComparisonPoint[];
  className?: string;
}

const SERIES_COLORS = Object.fromEntries(
  CHART_SERIES.map((series) => [series.key, series.color])
) as Record<string, string>;

function createBarShape(selectedBranchName: string | null) {
  return function BranchBarShape(props: BarShapeProps) {
    const { payload, fill, ...rest } = props;
    const branchName =
      payload && typeof payload === "object" && "branch" in payload
        ? String((payload as BranchComparisonPoint).branch)
        : "";
    const isSelected =
      !selectedBranchName || branchName === selectedBranchName;

    return (
      <Rectangle
        {...rest}
        fill={fill}
        fillOpacity={isSelected ? 1 : 0.35}
        className="cursor-pointer transition-[fill-opacity] duration-200"
      />
    );
  };
}

export function AnalyticsBarChart({ data, className }: AnalyticsBarChartProps) {
  const context = useOptionalDashboardContext();
  const branchFilter = context?.branchFilter ?? null;
  const branchNames = context?.branchNames;
  const toggleBranchFilter = context?.toggleBranchFilter;
  const refreshKey = useChartRefreshKey();
  const { visibility, toggleSeries } = useChartSeries();

  const enrichedData = data.map((point) => ({
    ...point,
    profit: calculateChartProfitMargin(point.sales, point.savings),
  }));

  const selectedBranchName =
    branchFilter && branchNames ? branchNames[branchFilter] : null;
  const barShape = createBarShape(selectedBranchName);

  const handleBarClick = (barData: BranchComparisonPoint) => {
    if (barData?.branch) toggleBranchFilter?.(barData.branch);
  };

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
      <BarChart
        data={enrichedData}
        layout="vertical"
        barGap={4}
        barCategoryGap="20%"
      >
        <ChartCartesianAxes layout="vertical" categoryKey="branch" yWidth={72} />
        <Tooltip
          content={<ChartAnalyticsTooltip showProfit={visibility.profit} />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar
          dataKey="sales"
          name="Sales"
          fill={SERIES_COLORS.sales}
          radius={[0, 4, 4, 0]}
          shape={barShape}
          hide={!visibility.sales}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
          cursor="pointer"
          onClick={(barData) =>
            handleBarClick(barData as unknown as BranchComparisonPoint)
          }
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill={SERIES_COLORS.expenses}
          radius={[0, 4, 4, 0]}
          shape={barShape}
          hide={!visibility.expenses}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
          cursor="pointer"
          onClick={(barData) =>
            handleBarClick(barData as unknown as BranchComparisonPoint)
          }
        />
        <Bar
          dataKey="savings"
          name="Savings"
          fill={SERIES_COLORS.savings}
          radius={[0, 4, 4, 0]}
          shape={barShape}
          hide={!visibility.savings}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
          cursor="pointer"
          onClick={(barData) =>
            handleBarClick(barData as unknown as BranchComparisonPoint)
          }
        />
      </BarChart>
    </ChartContainer>
  );
}
