"use client";

import { useMemo } from "react";
import { StaffMemberCard } from "@/components/staff/staff-member-card";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { Button } from "@/components/shared/ui/button";
import { useSettings } from "@/context/settings-context";
import { useStaffPayments } from "@/hooks/use-staff-payments";
import Link from "next/link";

export default function StaffPage() {
  const { summaries, isLoaded } = useStaffPayments();
  const { getBranchName } = useSettings();

  const sortedSummaries = useMemo(
    () => [...summaries].sort((left, right) => left.staffName.localeCompare(right.staffName)),
    [summaries]
  );

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="Team members and daily payment status"
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button href="/staff/payments" variant="secondary">
          View Payments
        </Button>
        <Button href="/staff/payments?record=1">Record Payment</Button>
      </div>

      <StaffSubnav />

      <div className="space-y-3">
        {sortedSummaries.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No active staff members yet. Add staff in{" "}
            <Link href="/settings" className="text-white underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          sortedSummaries.map((summary) => (
            <StaffMemberCard
              key={summary.staffId}
              summary={summary}
              branchName={getBranchName(summary.branch)}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
