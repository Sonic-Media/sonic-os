"use client";

import { Suspense, useMemo, useState } from "react";
import { DayClosedBanner } from "@/components/operations/day-closed-banner";
import { OpenShopPage } from "@/components/operations/open-shop-page";
import { OperationsReadOnlyView } from "@/components/operations/operations-read-only-view";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { ShiftCompletedPage } from "@/components/operations/shift-completed-page";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
} from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";

function TodayOperationsContent() {
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const { session } = useAuth();
  const today = getTodayISO();
  const { entries, isLoaded } = useEntriesContext();
  const {
    isBranchDayClosed,
    needsShopOpening,
    getClosedRecord,
    isLoaded: closingLoaded,
  } = useDayClosing();
  const [shiftFlowActive, setShiftFlowActive] = useState(false);

  const isOwner = session?.role === "owner";

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
  const isDayClosed = isBranchDayClosed(activeBranch, today);
  const shopNeedsOpening = needsShopOpening(activeBranch, today);

  if (!isOwner && isDayClosed) {
    return (
      <PageContainer>
        <ShiftCompletedPage />
      </PageContainer>
    );
  }

  if (!isOwner && (shopNeedsOpening || shiftFlowActive)) {
    return (
      <PageContainer>
        <OpenShopPage
          onShiftStarted={() => setShiftFlowActive(true)}
          onFlowComplete={() => setShiftFlowActive(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Today's Operations"
        subtitle={
          isDayClosed
            ? "Today's records are closed and read-only"
            : "Record movie revenue, accessory sales, expenses, staff payments, and close the day"
        }
        showBranchBadge
      />

      <OperationsSubnav />

      {isDayClosed && closedRecord ? (
        <>
          <DayClosedBanner branch={activeBranch} record={closedRecord} />
          {activeEntry ? (
            <OperationsReadOnlyView entry={activeEntry} />
          ) : null}
        </>
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
