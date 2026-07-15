"use client";

import { useMemo, useState } from "react";
import { filterHistoryEntries, sortEntries } from "@/lib/entry-helpers";
import { useEntriesContext } from "@/context/entries-context";
import type { HistoryBranchFilter, HistoryFilter, HistorySortOrder } from "@/types";

export function useHistory() {
  const { entries, isLoaded, deleteEntry } = useEntriesContext();
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState<HistoryBranchFilter>("all");
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>("newest");

  const filter: HistoryFilter = useMemo(
    () => ({
      date: date || undefined,
      branch,
      sortOrder,
    }),
    [date, branch, sortOrder]
  );

  const filteredEntries = useMemo(() => {
    const filtered = filterHistoryEntries(entries, {
      date: filter.date,
      branch: filter.branch,
    });
    return sortEntries(filtered, filter.sortOrder);
  }, [entries, filter]);

  return {
    isLoaded,
    filter,
    date,
    branch,
    sortOrder,
    filteredEntries,
    setDate,
    setBranch,
    setSortOrder,
    deleteEntry,
  };
}
