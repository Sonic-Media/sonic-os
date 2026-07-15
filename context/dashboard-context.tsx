"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useInteractiveAnalytics } from "@/hooks/use-interactive-analytics";
import type { MetricFocus } from "@/lib/analytics-view";

type DashboardContextValue = ReturnType<typeof useInteractiveAnalytics> & {
  activeMetric: MetricFocus;
  setActiveMetric: (metric: MetricFocus) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const analytics = useInteractiveAnalytics();
  const { metricFocus, setMetricFocus } = analytics;

  const setActiveMetric = useCallback(
    (metric: MetricFocus) => {
      setMetricFocus(metric);
    },
    [setMetricFocus]
  );

  const value = useMemo(
    () => ({
      ...analytics,
      activeMetric: metricFocus,
      setActiveMetric,
    }),
    [analytics, metricFocus, setActiveMetric]
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used within DashboardProvider"
    );
  }
  return context;
}

export function useOptionalDashboardContext() {
  return useContext(DashboardContext);
}

export function useActiveMetric(): MetricFocus {
  const context = useContext(DashboardContext);
  return context?.activeMetric ?? "all";
}
