"use client";

import { Suspense, useMemo } from "react";
import { DayClosedBanner } from "@/components/operations/day-closed-banner";
import { OpenShopPage } from "@/components/operations/open-shop-page";
import { OperationsReadOnlyView } from "@/components/operations/operations-read-only-view";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { StaffDayClosedView } from "@/components/operations/staff/staff-day-closed-view";
import { StaffOperationsWorkspace } from "@/components/operations/staff/staff-operations-workspace";
import { Card } from "@/components/shared/ui/card";
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
import { useStaffAttendance } from "@/hooks/use-staff-attendance";

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
  const { currentAttendance } = useStaffAttendance(today);

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
  const staffOnShift = currentAttendance?.presence === "on-shift";

  if (isOwner) {
    return (
      <PageContainer>
        <PageHeader
          title="Today's Operations"
          subtitle="Read-only view — staff run daily operations from this workspace"
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
        ) : shopNeedsOpening ? (
          <Card className="mt-6 border-amber-500/15 bg-amber-500/[0.04] p-6">
            <p className="text-sm font-medium text-amber-200">Branch Waiting</p>
            <p className="mt-2 text-sm text-zinc-400">
              The branch has not been opened yet today. The first staff member on
              site will start the shift. Mission Control will update automatically.
            </p>
          </Card>
        ) : activeEntry ? (
          <OperationsReadOnlyView entry={activeEntry} />
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-sm text-zinc-400">
              Staff have opened the branch. Operational records will appear here as
              they are saved.
            </p>
          </Card>
        )}
      </PageContainer>
    );
  }

  if (isDayClosed) {
    return (
      <PageContainer className="lg:max-w-5xl">
        <StaffDayClosedView branch={activeBranch} date={today} />
      </PageContainer>
    );
  }

  if (shopNeedsOpening) {
    return (
      <PageContainer className="lg:max-w-5xl">
        <OpenShopPage mode="start-shift" />
      </PageContainer>
    );
  }

  if (!staffOnShift) {
    return (
      <PageContainer className="lg:max-w-5xl">
        <OpenShopPage mode="clock-in" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="lg:max-w-5xl">
      <StaffOperationsWorkspace branch={activeBranch} entry={activeEntry} />
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
