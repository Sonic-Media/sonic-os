"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyHistoryFilters,
  createDefaultHistoryFilterCriteria,
} from "@/lib/history-filters";
import { duplicateEntryAsTodayDraft, sortEntries } from "@/lib/entry-helpers";
import { useEntriesContext } from "@/context/entries-context";
import { useStaff } from "@/context/staff-context";
import type { Entry, HistoryFilter, HistorySortOrder } from "@/types";

export function useHistory() {
  const router = useRouter();
  const { entries, isLoaded, upsertEntry, deleteEntry } = useEntriesContext();
  const { isLoaded: staffLoaded } = useStaff();
  const [criteria, setCriteria] = useState(createDefaultHistoryFilterCriteria);
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>("newest");

  const filter: HistoryFilter = useMemo(
    () => ({
      ...criteria,
      sortOrder,
    }),
    [criteria, sortOrder]
  );

  const filteredEntries = useMemo(() => {
    const filtered = applyHistoryFilters(entries, criteria);
    return sortEntries(filtered, sortOrder);
  }, [entries, criteria, sortOrder]);

  function updateCriteria(patch: Partial<typeof criteria>) {
    setCriteria((prev) => ({ ...prev, ...patch }));
  }

  function duplicateEntry(source: Entry) {
    const draft = duplicateEntryAsTodayDraft(source);
    upsertEntry(draft);
    router.push(`/entry/${draft.id}/edit`);
  }

  return {
    isLoaded: isLoaded && staffLoaded,
    filter,
    criteria,
    sortOrder,
    filteredEntries,
    updateCriteria,
    setSortOrder,
    deleteEntry,
    duplicateEntry,
  };
}
