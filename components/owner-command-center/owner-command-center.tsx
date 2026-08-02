"use client";

import { DashboardGreeting } from "@/components/dashboard/branch-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OwnerBranchComparison } from "@/components/owner-command-center/owner-branch-comparison";
import { OwnerCommandCenterSummary } from "@/components/owner-command-center/owner-command-center-summary";
import { OwnerLowStockAlerts } from "@/components/owner-command-center/owner-low-stock-alerts";
import { OwnerPendingPurchases } from "@/components/owner-command-center/owner-pending-purchases";
import { OwnerRecentExpenses } from "@/components/owner-command-center/owner-recent-expenses";
import { OwnerStaffWorkingTodayList } from "@/components/owner-command-center/owner-staff-working-today";
import { SalesRecentSales } from "@/components/sales/sales-recent-sales";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useBranches } from "@/context/branches-context";
import { useDashboard } from "@/hooks/use-dashboard";
import { useOwnerCommandCenter } from "@/hooks/use-owner-command-center";

export function OwnerCommandCenter() {
  const { metrics, isLoaded, sales, expenses } = useOwnerCommandCenter();
  const { getBranchName } = useBranches();
  const {
    isLoaded: dashboardLoaded,
    greeting,
    date,
    progress,
    draftEntry,
    completedEntry,
    allEntriesCompleted,
  } = useDashboard();

  if (!isLoaded || !dashboardLoaded) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <PageContainer>
      <DashboardGreeting greeting={greeting} date={date} className="mb-8" />

      <OwnerCommandCenterSummary metrics={metrics} />

      <OwnerBranchComparison branches={metrics.branchComparison} />

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <OwnerStaffWorkingTodayList
          staff={metrics.staffWorkingToday}
          getBranchName={getBranchName}
        />
        <OwnerLowStockAlerts products={metrics.lowStockProducts} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <OwnerPendingPurchases purchases={metrics.pendingPurchases} />
        <SalesRecentSales sales={sales} />
      </div>

      <div className="mb-8">
        <OwnerRecentExpenses
          expenses={expenses}
          getBranchName={getBranchName}
        />
      </div>

      <QuickActions
        progress={progress}
        draftEntry={draftEntry}
        completedEntry={completedEntry}
        allEntriesCompleted={allEntriesCompleted}
      />
    </PageContainer>
  );
}
