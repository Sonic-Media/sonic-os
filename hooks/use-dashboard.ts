"use client";

import { useMemo, useState } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import {
  filterEntriesByDate,
  findMostRecentEntryForDate,
  getTodayBranchProgress,
} from "@/lib/entry-helpers";
import { formatDisplayDate, getTodayISO } from "@/lib/dates";
import { getPersonalizedGreetingLine, getRandomRoleSubtitle } from "@/lib/ux/greeting";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import { getDashboardChartData } from "@/lib/chart-data";
import { getDashboardAnalytics } from "@/lib/report-insights";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import type { DashboardPeriod, DashboardSummary } from "@/types";

export function useDashboard() {
  const { entries, isLoaded } = useEntriesContext();
  const { settings, branches, isLoaded: settingsLoaded } = useSettings();
  const { staff, isLoaded: staffLoaded } = useStaff();
  const { session } = useAuth();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [ownerSubtitle] = useState(() => getRandomRoleSubtitle("owner"));
  const today = getTodayISO();
  const displayName = resolveStaffDisplayName(session, staff);

  const data = useMemo(() => {
    const branchEntries = filterByBranchField(entries, activeBranch);
    const activeBranchConfig = branches.find((branch) => branch.id === activeBranch);
    const scopedBranches = activeBranchConfig ? [activeBranchConfig] : branches;
    const branchIds = scopedBranches.map((branch) => branch.id);
    const todayEntries = filterEntriesByDate(branchEntries, today);
    const summary = aggregateEntries(todayEntries, { branchIds });
    const progress = getTodayBranchProgress(branchEntries, today, scopedBranches);
    const draftEntry = findMostRecentEntryForDate(
      branchEntries,
      today,
      "draft",
      activeBranch
    );
    const completedEntry = findMostRecentEntryForDate(
      branchEntries,
      today,
      "completed",
      activeBranch
    );
    const allEntriesCompleted =
      progress.length > 0 && progress.every((item) => item.completed);
    const analytics = getDashboardAnalytics(branchEntries, period, {
      branchIds,
      branchNames: settings.branchNames,
      staff: staff.filter((member) =>
        branchCodesReferToSameInventory(member.branch, activeBranch)
      ),
    });
    const chartData = getDashboardChartData(
      branchEntries,
      period,
      settings.branchNames,
      branchIds
    );

    const dashboard: DashboardSummary = {
      summary,
      progress,
      draftEntry,
      completedEntry,
      allEntriesCompleted,
    };

    return {
      greeting: getPersonalizedGreetingLine(displayName),
      subtitle: ownerSubtitle,
      date: formatDisplayDate(),
      analytics,
      chartData,
      activeBranch,
      ...dashboard,
    };
  }, [
    entries,
    today,
    branches,
    activeBranch,
    displayName,
    ownerSubtitle,
    settings.branchNames,
    staff,
    period,
  ]);

  return {
    isLoaded: isLoaded && settingsLoaded && staffLoaded && branchLoaded,
    period,
    setPeriod,
    ...data,
  };
}
