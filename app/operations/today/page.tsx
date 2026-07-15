"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OperationsReadOnlyView } from "@/components/operations/operations-read-only-view";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
  parseBranch,
} from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { useEntriesContext } from "@/context/entries-context";

function TodayOperationsContent() {
  const searchParams = useSearchParams();
  const branch = parseBranch(searchParams.get("branch"));
  const today = getTodayISO();
  const { entries, isLoaded } = useEntriesContext();

  const { completedEntry, draftEntry } = useMemo(() => {
    if (!isLoaded) {
      return { completedEntry: undefined, draftEntry: undefined };
    }

    return {
      completedEntry: findCompletedEntryForBranchDate(entries, branch, today),
      draftEntry: findDraftForBranchDate(entries, branch, today),
    };
  }, [entries, branch, today, isLoaded]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  const activeEntry = completedEntry ?? draftEntry;
  const isReadOnly = completedEntry?.status === "completed";

  return (
    <PageContainer>
      <PageHeader
        title="Today's Operations"
        subtitle="Record and close today's branch operations"
      />

      {isReadOnly && completedEntry ? (
        <OperationsReadOnlyView entry={completedEntry} />
      ) : (
        <OperationsWorkspace
          mode="today"
          branch={branch}
          entry={activeEntry}
          lockDate
        />
      )}
    </PageContainer>
  );
}

export default function TodayOperationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TodayOperationsContent />
    </Suspense>
  );
}
