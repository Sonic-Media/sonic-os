"use client";

import { useMemo, useState } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import { useActiveBranch } from "@/context/active-branch-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { filterEntriesByPeriod } from "@/lib/entry-helpers";
import { getPeriodLabel } from "@/lib/format";
import { filterByBranchField } from "@/lib/active-branch/filters";
import type { ReportPeriod } from "@/types";

export function useReports() {
  const { entries, isLoaded } = useEntriesContext();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const { branches, isLoaded: settingsLoaded } = useSettings();
  const [period, setPeriod] = useState<ReportPeriod>("daily");

  const data = useMemo(() => {
    const branchIds = branches.map((branch) => branch.id);
    const branchEntries = filterByBranchField(entries, activeBranch);
    const filtered = filterEntriesByPeriod(branchEntries, period);
    const summary = aggregateEntries(filtered, { branchIds });
    return {
      summary,
      periodLabel: getPeriodLabel(period),
    };
  }, [entries, activeBranch, branches, period]);

  return {
    isLoaded: isLoaded && branchLoaded && settingsLoaded,
    period,
    setPeriod,
    ...data,
  };
}
