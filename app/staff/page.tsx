"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StaffMemberCard } from "@/components/staff/staff-member-card";
import { StaffSubnav } from "@/components/staff/staff-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { useSettings } from "@/context/settings-context";
import { useStaffPayments } from "@/hooks/use-staff-payments";

export default function StaffPage() {
  const { todayStatuses, filterSummariesBySearch, isLoaded } = useStaffPayments();
  const { getBranchName } = useSettings();
  const [search, setSearch] = useState("");

  const filteredSummaries = useMemo(
    () =>
      [...filterSummariesBySearch(search)].sort((left, right) =>
        left.staffName.localeCompare(right.staffName)
      ),
    [filterSummariesBySearch, search]
  );

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="Team members, activity, and payment status"
        showBranchBadge
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, role, branch, or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:max-w-md"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/staff/payments" variant="secondary">
            View Payments
          </Button>
          <Button href="/staff/payments?record=1">Pay Staff</Button>
        </div>
      </div>

      <StaffSubnav />

      <div className="space-y-3">
        {filteredSummaries.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No staff members match your search. Add staff in{" "}
            <Link href="/settings" className="text-white underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          filteredSummaries.map((status) => (
            <StaffMemberCard
              key={status.staffId}
              status={status}
              branchName={getBranchName(status.branch)}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
