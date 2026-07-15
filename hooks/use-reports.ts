"use client";

import { useMemo, useState } from "react";
import { aggregateEntries } from "@/lib/aggregations";
import { filterEntriesByPeriod } from "@/lib/entry-helpers";
import { getPeriodLabel } from "@/lib/format";
import { useEntriesContext } from "@/context/entries-context";
import type { ReportPeriod } from "@/types";

export function useReports() {
  const { entries, isLoaded } = useEntriesContext();
  const [period, setPeriod] = useState<ReportPeriod>("daily");

  const data = useMemo(() => {
    const filtered = filterEntriesByPeriod(entries, period);
    const summary = aggregateEntries(filtered);
    return {
      summary,
      periodLabel: getPeriodLabel(period),
    };
  }, [entries, period]);

  return {
    isLoaded,
    period,
    setPeriod,
    ...data,
  };
}
