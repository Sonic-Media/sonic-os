"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveMetric } from "@/context/dashboard-context";
import {
  getDefaultSeriesVisibility,
  type ChartSeriesKey,
} from "@/lib/chart-utils";
import type { MetricFocus } from "@/lib/analytics-view";

interface LegendState {
  metric: MetricFocus;
  overrides: Partial<Record<ChartSeriesKey, boolean>>;
}

export function useChartSeries() {
  const activeMetric = useActiveMetric();
  const [legendState, setLegendState] = useState<LegendState>({
    metric: activeMetric,
    overrides: {},
  });

  const visibility = useMemo(() => {
    const defaults = getDefaultSeriesVisibility(activeMetric);
    if (legendState.metric !== activeMetric) return defaults;
    return { ...defaults, ...legendState.overrides };
  }, [activeMetric, legendState]);

  const toggleSeries = useCallback(
    (key: ChartSeriesKey) => {
      setLegendState((current) => {
        const defaults = getDefaultSeriesVisibility(activeMetric);
        const merged =
          current.metric === activeMetric
            ? { ...defaults, ...current.overrides }
            : defaults;

        return {
          metric: activeMetric,
          overrides: {
            ...(current.metric === activeMetric ? current.overrides : {}),
            [key]: !merged[key],
          },
        };
      });
    },
    [activeMetric]
  );

  return { visibility, toggleSeries };
}
