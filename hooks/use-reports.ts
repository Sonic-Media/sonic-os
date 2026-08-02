"use client";

import { useMemo, useState } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import { filterEntriesByPeriod } from "@/lib/entry-helpers";
import { getPeriodLabel } from "@/lib/format";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { useActiveBranch } from "@/context/active-branch-context";
import { useEntriesContext } from "@/context/entries-context";
import type { ReportPeriod } from "@/types";

export function useReports() {
  const { entries, isLoaded } = useEntriesContext();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const [period, setPeriod] = useState<ReportPeriod>("daily");

  const data = useMemo(() => {
    const branchEntries = filterByBranchField(entries, activeBranch);
    const filtered = filterEntriesByPeriod(branchEntries, period);
    const summary = aggregateEntries(filtered);
    return {
      summary,
      periodLabel: getPeriodLabel(period),
    };
  }, [entries, activeBranch, period]);

  return {
    isLoaded: isLoaded && branchLoaded,
    period,
    setPeriod,
    ...data,
  };
}
