"use client";

import { useParams } from "next/navigation";
import { EntryDetailCard } from "@/components/entry/entry-detail-card";
import { EntryNotFound } from "@/components/shared/entry-not-found";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { formatEntryDisplayDate } from "@/lib/dates";
import { useEntriesContext } from "@/context/entries-context";

export default function EntryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { entries, isLoaded } = useEntriesContext();
  const entry = entries.find((item) => item.id === id);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!entry) {
    return <EntryNotFound />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Entry Details"
        subtitle={`${formatEntryDisplayDate(entry.date)} · ${entry.time}`}
      />
      <EntryDetailCard entry={entry} />
    </PageContainer>
  );
}
