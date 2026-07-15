"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
  parseBranch,
} from "@/lib/entry-helpers";
import { useEntriesContext } from "@/context/entries-context";

function HistoricalOperationsContent() {
  const searchParams = useSearchParams();
  const branch = parseBranch(searchParams.get("branch"));
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const { entries, isLoaded } = useEntriesContext();

  const activeEntry = useMemo(() => {
    if (!isLoaded) return undefined;
    return (
      findDraftForBranchDate(entries, branch, date) ??
      findCompletedEntryForBranchDate(entries, branch, date)
    );
  }, [entries, branch, date, isLoaded]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Historical Operations"
        subtitle="Record or update past daily operations"
      />
      <OperationsWorkspace
        mode="historical"
        branch={branch}
        entry={activeEntry}
        initialDate={date}
        lockDate={false}
      />
    </PageContainer>
  );
}

export default function HistoricalOperationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HistoricalOperationsContent />
    </Suspense>
  );
}
