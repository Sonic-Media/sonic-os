"use client";

import { CartesianGrid, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "@/lib/chart-data";
import { formatChartAxisValue } from "@/lib/chart-utils";

interface ChartCartesianAxesProps {
  layout?: "horizontal" | "vertical";
  categoryKey?: string;
  yWidth?: number;
}

export function ChartCartesianAxes({
  layout = "horizontal",
  categoryKey = "label",
  yWidth = 40,
}: ChartCartesianAxesProps) {
  const isHorizontal = layout === "horizontal";

  return (
    <>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={CHART_COLORS.grid}
        vertical={!isHorizontal}
        horizontal={isHorizontal}
      />
      {isHorizontal ? (
        <>
          <XAxis
            dataKey={categoryKey}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatChartAxisValue}
            width={yWidth}
          />
        </>
      ) : (
        <>
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            tickFormatter={formatChartAxisValue}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={yWidth}
          />
        </>
      )}
    </>
  );
}
