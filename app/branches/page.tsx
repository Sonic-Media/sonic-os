"use client";

import { BranchesBreakdown } from "@/components/branches/branches-breakdown";
import { BranchesDashboardSummary } from "@/components/branches/branches-dashboard-summary";
import { BranchesSubnav } from "@/components/branches/branches-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useBranches } from "@/context/branches-context";
import { useBranchesDashboard } from "@/hooks/use-branches-dashboard";

export default function BranchesDashboardPage() {
  const { isLoaded } = useBranches();
  const { metrics, revenueByBranch, inventoryByBranch } = useBranchesDashboard();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Branches"
        subtitle="Branch performance and inventory visibility"
      />

      <BranchesSubnav />

      <BranchesDashboardSummary metrics={metrics} />

      <BranchesBreakdown
        revenueByBranch={revenueByBranch}
        inventoryByBranch={inventoryByBranch}
      />
    </PageContainer>
  );
}
