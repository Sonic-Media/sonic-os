"use client";

import { useMemo } from "react";
import { OwnerDashboardLayout } from "@/components/dashboard/owner/owner-dashboard-layout";
import {
  StaffDashboardLayout,
  useDashboardLastUpdated,
} from "@/components/dashboard/staff-dashboard-layout";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DashboardProvider } from "@/context/dashboard-context";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { useDashboard } from "@/hooks/use-dashboard";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";

export default function DashboardPage() {
  const {
    isLoaded,
    greeting,
    subtitle,
    date,
    summary,
    progress,
    draftEntry,
    completedEntry,
    allEntriesCompleted,
    activeBranch,
  } = useDashboard();
  const { session } = useAuth();
  const { staff } = useStaff();
  const lastUpdatedAt = useDashboardLastUpdated(activeBranch);

  const displayName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );

  const isOwner = session?.role === "owner";

  if (!isLoaded) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (!isOwner) {
    return (
      <StaffDashboardLayout
        greeting={greeting}
        subtitle={subtitle}
        date={date}
        summary={summary}
        progress={progress}
        draftEntry={draftEntry}
        completedEntry={completedEntry}
        allEntriesCompleted={allEntriesCompleted}
        activeBranch={activeBranch}
        lastUpdatedAt={lastUpdatedAt}
      />
    );
  }

  return (
    <DashboardProvider>
      <OwnerDashboardLayout displayName={displayName} />
    </DashboardProvider>
  );
}
