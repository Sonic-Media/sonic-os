"use client";

import { HistoryEmptyState } from "@/components/history/history-empty-state";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryList } from "@/components/history/history-list";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useHistory } from "@/hooks/use-history";

export default function HistoryPage() {
  const {
    isLoaded,
    date,
    branch,
    sortOrder,
    filteredEntries,
    setDate,
    setBranch,
    setSortOrder,
    deleteEntry,
  } = useHistory();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="History"
        subtitle={`${filteredEntries.length} ${filteredEntries.length === 1 ? "entry" : "entries"}`}
      />

      <HistoryFilters
        date={date}
        branch={branch}
        sortOrder={sortOrder}
        onDateChange={setDate}
        onBranchChange={setBranch}
        onSortOrderChange={setSortOrder}
      />

      {filteredEntries.length === 0 ? (
        <HistoryEmptyState />
      ) : (
        <HistoryList
          entries={filteredEntries}
          onDelete={(entry) => deleteEntry(entry.id)}
        />
      )}
    </PageContainer>
  );
}
