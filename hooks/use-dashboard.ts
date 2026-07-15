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
import type { DashboardSummary } from "@/types";

export function useDashboard() {
  const { entries, isLoaded } = useEntriesContext();
  const today = getTodayISO();

  const data = useMemo(() => {
    const todayEntries = filterEntriesByDate(entries, today);
    const summary = aggregateEntries(todayEntries);
    const progress = getTodayBranchProgress(entries, today);
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
      greeting: getGreeting(),
      date: formatDisplayDate(),
      ...dashboard,
    };
  }, [entries, today]);

  return { isLoaded, ...data };
}
