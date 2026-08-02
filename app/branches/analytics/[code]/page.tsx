"use client";

import { BranchAnalyticsCharts } from "@/components/branches/branch-analytics-charts";
import { BranchAnalyticsSummary } from "@/components/branches/branch-analytics-summary";
import { BranchRecentActivity } from "@/components/branches/branch-recent-activity";
import { BranchesSubnav } from "@/components/branches/branches-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useBranches } from "@/context/branches-context";
import { useBranchAnalytics } from "@/hooks/use-branch-analytics";

interface BranchAnalyticsDetailPageProps {
  params: {
    code: string;
  };
}

export default function BranchAnalyticsDetailPage({
  params,
}: BranchAnalyticsDetailPageProps) {
  const { isLoaded } = useBranches();
  const { branch, analytics, trendChartData } = useBranchAnalytics(params.code);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!branch || !analytics) {
    return (
      <PageContainer>
        <PageHeader
          title="Branch Analytics"
          subtitle="Branch intelligence dashboard"
        />
        <BranchesSubnav />
        <p className="text-sm text-zinc-500">Branch not found.</p>
        <Button href="/branches/analytics" variant="secondary" className="mt-4">
          Back to Analytics
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={branch.name}
        subtitle="Branch intelligence dashboard"
      />

      <BranchesSubnav />

      <BranchAnalyticsSummary analytics={analytics} />

      <BranchRecentActivity activity={analytics.recentActivity} />

      <BranchAnalyticsCharts trendChartData={trendChartData} />
    </PageContainer>
  );
}
