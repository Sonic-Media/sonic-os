"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import {
  useActiveMetric,
  useOptionalDashboardContext,
} from "@/context/dashboard-context";
import { useChartRefreshKey } from "@/hooks/use-chart-refresh-key";
import type { ChartExpenseSlice } from "@/lib/chart-data";
import { CHART_ANIMATION_MS, enrichExpenseSlices } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

interface AnalyticsDoughnutChartProps {
  data: ChartExpenseSlice[];
  className?: string;
}

export function AnalyticsDoughnutChart({
  data,
  className,
}: AnalyticsDoughnutChartProps) {
  const activeMetric = useActiveMetric();
  const context = useOptionalDashboardContext();
  const expenseCategory = context?.expenseCategory ?? null;
  const toggleExpenseCategory = context?.toggleExpenseCategory;
  const refreshKey = useChartRefreshKey();
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>();

  const enrichedData = enrichExpenseSlices(data);
  const isFocused = activeMetric === "all" || activeMetric === "expenses";

  return (
    <ChartContainer
      className={cn(!isFocused && "opacity-40", className)}
      refreshKey={refreshKey}
    >
      <PieChart>
        <Pie
          data={enrichedData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          isAnimationActive
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-out"
          onClick={(_, index) => {
            const slice = enrichedData[index];
            if (slice) toggleExpenseCategory?.(slice.key);
          }}
        >
          {enrichedData.map((slice, index) => {
            const isSelected = expenseCategory === slice.key;
            const isDimmed =
              expenseCategory !== null && expenseCategory !== slice.key;
            const isHovered = hoveredIndex === index;

            return (
              <Cell
                key={slice.key}
                fill={slice.color}
                stroke={
                  isSelected
                    ? "#ffffff"
                    : isHovered
                      ? "rgba(255,255,255,0.35)"
                      : "transparent"
                }
                strokeWidth={isSelected || isHovered ? 2 : 0}
                fillOpacity={isDimmed ? 0.35 : isHovered ? 1 : 0.9}
                className="cursor-pointer transition-[fill-opacity] duration-200"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(undefined)}
              />
            );
          })}
        </Pie>
        <Tooltip content={<ChartTooltip showPercent />} />
      </PieChart>
    </ChartContainer>
  );
}
