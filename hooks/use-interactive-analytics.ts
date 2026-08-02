"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  computeFilteredAnalytics,
  getBranchIdFromName,
  type AnalyticsTimeFilter,
  type CustomDateRange,
  type DrillDownView,
  type MetricFocus,
} from "@/lib/analytics-view";
import type { ChartExpenseCategory } from "@/lib/chart-data";
import { getTodayISO } from "@/lib/dates";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import type { Branch, DashboardPeriod } from "@/types";

function getDefaultCustomRange(): CustomDateRange {
  const today = getTodayISO();
  const start = new Date(today + "T12:00:00");
  start.setDate(start.getDate() - 29);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return { start: `${y}-${m}-${d}`, end: today };
}

export function useInteractiveAnalytics() {
  const { entries, isLoaded: entriesLoaded } = useEntriesContext();
  const { settings, isLoaded: settingsLoaded } = useSettings();
  const { staff, isLoaded: staffLoaded } = useStaff();

  const [timeFilter, setTimeFilter] = useState<AnalyticsTimeFilter>("daily");
  const [customRange, setCustomRange] = useState<CustomDateRange>(
    getDefaultCustomRange
  );
  const [metricFocus, setMetricFocus] = useState<MetricFocus>("all");
  const [branchFilter, setBranchFilter] = useState<Branch | null>(null);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [expenseCategory, setExpenseCategory] =
    useState<ChartExpenseCategory | null>(null);
  const [comparePrevious, setComparePrevious] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownView>("none");
  const [kpiDrawer, setKpiDrawer] = useState<MetricFocus | "none">("none");
  const [isTransitioning, startTransition] = useTransition();

  const computed = useMemo(
    () =>
      computeFilteredAnalytics(entries, {
        timeFilter,
        customRange,
        branchFilter,
        staffFilter,
        expenseCategory,
        branchNames: settings.branchNames,
        staff,
      }),
    [
      entries,
      timeFilter,
      customRange,
      branchFilter,
      staffFilter,
      expenseCategory,
      settings.branchNames,
      staff,
    ]
  );

  const setMetricFocusWithTransition = useCallback((focus: MetricFocus) => {
    startTransition(() => setMetricFocus(focus));
  }, []);

  const setPeriod = useCallback((period: DashboardPeriod) => {
    setTimeFilter(period);
  }, []);

  const toggleBranchFilter = useCallback(
    (branchName: string) => {
      const branchId = getBranchIdFromName(branchName, settings.branchNames);
      if (!branchId) return;
      setBranchFilter((current) => (current === branchId ? null : branchId));
    },
    [settings.branchNames]
  );

  const toggleExpenseCategory = useCallback((category: ChartExpenseCategory) => {
    setExpenseCategory((current) =>
      current === category ? null : category
    );
  }, []);

  const resetFilters = useCallback(() => {
    setTimeFilter("daily");
    setMetricFocus("all");
    setBranchFilter(null);
    setStaffFilter(null);
    setExpenseCategory(null);
    setComparePrevious(false);
  }, []);

  const clearFilters = resetFilters;

  const openDrillDown = useCallback((view: DrillDownView) => {
    setKpiDrawer("none");
    setDrillDown(view);
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDown("none");
  }, []);

  const openKpiDrawer = useCallback(
    (metric: MetricFocus) => {
      setDrillDown("none");
      setKpiDrawer(metric);
      setMetricFocusWithTransition(metric);
    },
    [setMetricFocusWithTransition]
  );

  const closeKpiDrawer = useCallback(() => {
    setKpiDrawer("none");
  }, []);

  useEffect(() => {
    if (drillDown === "none" && kpiDrawer === "none") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrillDown();
        closeKpiDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drillDown, kpiDrawer, closeDrillDown, closeKpiDrawer]);

  const activePeriod =
    timeFilter === "custom" ? computed.period : (timeFilter as DashboardPeriod);

  const hasActiveFilters =
    timeFilter !== "daily" ||
    comparePrevious ||
    metricFocus !== "all" ||
    branchFilter !== null ||
    staffFilter !== null ||
    expenseCategory !== null;

  const computedData = useMemo(
    () => ({
      analytics: computed.analytics,
      chartData: computed.chartData,
      previousChartData: computed.previousChartData,
      filteredEntries: computed.filteredEntries,
      previousFilteredEntries: computed.previousFilteredEntries,
    }),
    [computed]
  );

  return useMemo(
    () => ({
      isLoaded: entriesLoaded && settingsLoaded && staffLoaded,
      isTransitioning,
      timeFilter,
      setTimeFilter,
      customRange,
      setCustomRange,
      period: activePeriod,
      setPeriod,
      metricFocus,
      setMetricFocus: setMetricFocusWithTransition,
      branchFilter,
      setBranchFilter,
      staffFilter,
      setStaffFilter,
      staff,
      expenseCategory,
      comparePrevious,
      setComparePrevious,
      drillDown,
      openDrillDown,
      closeDrillDown,
      kpiDrawer,
      openKpiDrawer,
      closeKpiDrawer,
      toggleBranchFilter,
      toggleExpenseCategory,
      clearFilters,
      resetFilters,
      hasActiveFilters,
      branchNames: settings.branchNames,
      entries,
      ...computedData,
    }),
    [
      entriesLoaded,
      settingsLoaded,
      staffLoaded,
      isTransitioning,
      timeFilter,
      customRange,
      activePeriod,
      metricFocus,
      branchFilter,
      staffFilter,
      staff,
      expenseCategory,
      comparePrevious,
      drillDown,
      kpiDrawer,
      hasActiveFilters,
      settings.branchNames,
      entries,
      computedData,
      setPeriod,
      setMetricFocusWithTransition,
      openDrillDown,
      closeDrillDown,
      openKpiDrawer,
      closeKpiDrawer,
      toggleBranchFilter,
      toggleExpenseCategory,
      clearFilters,
      resetFilters,
    ]
  );
}
