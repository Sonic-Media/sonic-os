"use client";

import { useMemo, useState } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import {
  filterEntriesByDate,
  findMostRecentEntryForDate,
  getTodayBranchProgress,
} from "@/lib/entry-helpers";
import { formatDisplayDate, getTodayISO } from "@/lib/dates";
import { getGreeting } from "@/lib/format";
import { getDashboardChartData } from "@/lib/chart-data";
import { getDashboardAnalytics } from "@/lib/report-insights";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import type { DashboardPeriod, DashboardSummary } from "@/types";

export function useDashboard() {
  const { entries, isLoaded } = useEntriesContext();
  const { settings, branches, isLoaded: settingsLoaded } = useSettings();
  const { staff, isLoaded: staffLoaded } = useStaff();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const today = getTodayISO();

  const data = useMemo(() => {
    const todayEntries = filterEntriesByDate(entries, today);
    const summary = aggregateEntries(todayEntries);
    const progress = getTodayBranchProgress(entries, today, branches);
    const draftEntry = findMostRecentEntryForDate(entries, today, "draft");
    const completedEntry = findMostRecentEntryForDate(entries, today, "completed");
    const allEntriesCompleted =
      progress.length > 0 && progress.every((item) => item.completed);
    const analytics = getDashboardAnalytics(entries, period, {
      branchNames: settings.branchNames,
      staff,
    });
    const chartData = getDashboardChartData(
      entries,
      period,
      settings.branchNames
    );

    const dashboard: DashboardSummary = {
      summary,
      progress,
      draftEntry,
      completedEntry,
      allEntriesCompleted,
    };

    return {
      greeting: getGreeting(settings.ownerName),
      date: formatDisplayDate(),
      analytics,
      chartData,
      ...dashboard,
    };
  }, [entries, today, branches, settings.ownerName, settings.branchNames, staff, period]);

  return {
    isLoaded: isLoaded && settingsLoaded && staffLoaded,
    period,
    setPeriod,
    ...data,
  };
}
