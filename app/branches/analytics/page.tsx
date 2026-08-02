"use client";

import { BranchAnalyticsCharts } from "@/components/branches/branch-analytics-charts";
import { BranchAnalyticsLinks } from "@/components/branches/branch-analytics-links";
import { BranchComparisonCards } from "@/components/branches/branch-comparison-cards";
import { BranchesSubnav } from "@/components/branches/branches-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useBranches } from "@/context/branches-context";
import { useBranchComparison } from "@/hooks/use-branch-analytics";

export default function BranchAnalyticsPage() {
  const { activeBranches, isLoaded } = useBranches();
  const { snapshots, comparisonChartData } = useBranchComparison();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Branch Analytics"
        subtitle="Branch intelligence and Kansanga vs Salaama comparison"
      />

      <BranchesSubnav />

      <BranchComparisonCards snapshots={snapshots} />

      <BranchAnalyticsCharts comparisonChartData={comparisonChartData} />

      <BranchAnalyticsLinks branches={activeBranches} />
    </PageContainer>
  );
}
