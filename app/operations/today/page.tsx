"use client";

import { Suspense, useMemo } from "react";
import { OperationsReadOnlyView } from "@/components/operations/operations-read-only-view";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
} from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";

function TodayOperationsContent() {
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const today = getTodayISO();
  const { entries, isLoaded } = useEntriesContext();
  const { isBranchDayClosed, getClosedRecord, isLoaded: closingLoaded } =
    useDayClosing();

  const { completedEntry, draftEntry } = useMemo(() => {
    if (!isLoaded) {
      return { completedEntry: undefined, draftEntry: undefined };
    }

    return {
      completedEntry: findCompletedEntryForBranchDate(entries, activeBranch, today),
      draftEntry: findDraftForBranchDate(entries, activeBranch, today),
    };
  }, [entries, activeBranch, today, isLoaded]);

  if (!isLoaded || !closingLoaded || !branchLoaded) {
    return <PageSkeleton />;
  }

  const activeEntry = completedEntry ?? draftEntry;
  const closedRecord = getClosedRecord(activeBranch, today);
  const isReadOnly =
    completedEntry?.status === "completed" ||
    isBranchDayClosed(activeBranch, today);

  return (
    <PageContainer>
      <PageHeader
        title="Today's Operations"
        subtitle="Record and close today's branch operations"
        showBranchBadge
      />

      <OperationsSubnav />

      {isReadOnly && (completedEntry || closedRecord) ? (
        <OperationsReadOnlyView entry={completedEntry ?? {
          id: closedRecord?.id ?? "closed-day",
          date: today,
          time: "",
          timestamp: 0,
          branch: activeBranch,
          sales: closedRecord?.summary.sales ?? 0,
          expenses: [],
          staffId: "",
          staffName: closedRecord?.closedByName ?? "",
          notes: closedRecord?.closingNotes ?? "Day closed",
          savingsAllocation: closedRecord?.summary.operatingFund,
          createdAt: closedRecord?.closedAt ?? today,
          status: "completed",
        }} />
      ) : (
        <OperationsWorkspace
          mode="today"
          branch={activeBranch}
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
