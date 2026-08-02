"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
} from "@/lib/entry-helpers";
import { useActiveBranch } from "@/context/active-branch-context";
import { useEntriesContext } from "@/context/entries-context";

function HistoricalOperationsContent() {
  const searchParams = useSearchParams();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const { entries, isLoaded } = useEntriesContext();

  const activeEntry = useMemo(() => {
    if (!isLoaded) return undefined;
    return (
      findDraftForBranchDate(entries, activeBranch, date) ??
      findCompletedEntryForBranchDate(entries, activeBranch, date)
    );
  }, [entries, activeBranch, date, isLoaded]);

  if (!isLoaded || !branchLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Historical Operations"
        subtitle="Record or update past daily operations"
        showBranchBadge
      />
      <OperationsSubnav />
      <OperationsWorkspace
        mode="historical"
        branch={activeBranch}
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
