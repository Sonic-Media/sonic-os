"use client";

import { useMemo } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import {
  filterEntriesByDate,
  findMostRecentEntryForDate,
  getTodayBranchProgress,
} from "@/lib/entry-helpers";
import { formatDisplayDate, getTodayISO } from "@/lib/dates";
import { getGreeting } from "@/lib/format";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import type { DashboardSummary } from "@/types";

export function useDashboard() {
  const { entries, isLoaded } = useEntriesContext();
  const { settings, branches, isLoaded: settingsLoaded } = useSettings();
  const today = getTodayISO();

  const data = useMemo(() => {
    const todayEntries = filterEntriesByDate(entries, today);
    const summary = aggregateEntries(todayEntries);
    const progress = getTodayBranchProgress(entries, today, branches);
    const draftEntry = findMostRecentEntryForDate(entries, today, "draft");
    const completedEntry = findMostRecentEntryForDate(entries, today, "completed");
    const allEntriesCompleted =
      progress.length > 0 && progress.every((item) => item.completed);

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
      ...dashboard,
    };
  }, [entries, today, branches, settings.ownerName]);

  return { isLoaded: isLoaded && settingsLoaded, ...data };
}
