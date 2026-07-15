"use client";

import { useHistory } from "@/hooks/use-history";
import { HistoryEmptyState } from "@/components/history/history-empty-state";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryList } from "@/components/history/history-list";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function HistoryPage() {
  const {
    isLoaded,
    criteria,
    sortOrder,
    filteredEntries,
    updateCriteria,
    setSortOrder,
    deleteEntry,
    duplicateEntry,
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

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8 lg:items-start">
        <HistoryFilters
          criteria={criteria}
          sortOrder={sortOrder}
          onCriteriaChange={updateCriteria}
          onSortOrderChange={setSortOrder}
        />

        {filteredEntries.length === 0 ? (
          <HistoryEmptyState />
        ) : (
          <HistoryList
            entries={filteredEntries}
            onDelete={(entry) => deleteEntry(entry.id)}
            onDuplicate={duplicateEntry}
          />
        )}
      </div>
    </PageContainer>
  );
}
