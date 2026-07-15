"use client";

import { CHART_SERIES, type ChartSeriesKey } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

interface InteractiveChartLegendProps {
  visibility: Record<ChartSeriesKey, boolean>;
  onToggle: (key: ChartSeriesKey) => void;
  className?: string;
}

export function InteractiveChartLegend({
  visibility,
  onToggle,
  className,
}: InteractiveChartLegendProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
      role="group"
      aria-label="Chart series legend"
    >
      {CHART_SERIES.map((series) => {
        const isActive = visibility[series.key];

        return (
          <button
            key={series.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(series.key)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium tracking-wide transition-[border-color,background-color,opacity,transform] duration-200",
              isActive
                ? "border-zinc-700 bg-zinc-900/80 text-zinc-200"
                : "border-zinc-800/80 bg-zinc-950/60 text-zinc-500 opacity-60"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-transform duration-200",
                isActive ? "scale-100" : "scale-75"
              )}
              style={{ backgroundColor: series.color }}
            />
            {series.label}
          </button>
        );
      })}
    </div>
  );
}
