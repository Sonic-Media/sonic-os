"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OperationsReadOnlyView } from "@/components/operations/operations-read-only-view";
import { OperationsSubnav } from "@/components/operations/operations-subnav";
import { OperationsWorkspace } from "@/components/operations/operations-workspace";
import { Card } from "@/components/shared/ui/card";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import {
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
} from "@/lib/entry-helpers";
import { formatEntryDisplayDate } from "@/lib/dates";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useEntriesContext } from "@/context/entries-context";

function HistoricalOperationsContent() {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const { entries, isLoaded } = useEntriesContext();
  const isOwner = session?.role === "owner";

  const activeEntry = useMemo(() => {
    if (!isLoaded) return undefined;
    return (
      findCompletedEntryForBranchDate(entries, activeBranch, date) ??
      findDraftForBranchDate(entries, activeBranch, date)
    );
  }, [entries, activeBranch, date, isLoaded]);

  if (!isLoaded || !branchLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Historical Operations"
        subtitle={
          isOwner
            ? "Record or update past daily operations"
            : "Previous days are read only"
        }
        showBranchBadge
      />
      <OperationsSubnav />

      {isOwner ? (
        <OperationsWorkspace
          mode="historical"
          branch={activeBranch}
          entry={activeEntry}
          initialDate={date}
          lockDate={false}
        />
      ) : activeEntry ? (
        <OperationsReadOnlyView entry={activeEntry} />
      ) : (
        <Card className="mt-6 p-6">
          <p className="text-sm text-zinc-400">
            No operations record for {formatEntryDisplayDate(date)}.
          </p>
        </Card>
      )}
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
