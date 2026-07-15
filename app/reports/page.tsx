"use client";

import dynamic from "next/dynamic";
import { ReportsBranchTotals } from "@/components/reports/reports-branch-totals";
import { ReportsEmptyState } from "@/components/reports/reports-empty-state";
import { ReportsPeriodTabs } from "@/components/reports/reports-period-tabs";
import { ReportsSummary } from "@/components/reports/reports-summary";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useReports } from "@/hooks/use-reports";

const ReportsChart = dynamic(
  () => import("@/components/reports/reports-chart"),
  { ssr: false }
);

export default function ReportsPage() {
  const { isLoaded, period, setPeriod, summary, periodLabel } = useReports();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader title="Reports" subtitle={periodLabel} />

      <ReportsPeriodTabs period={period} onPeriodChange={setPeriod} />

      <ReportsSummary summary={summary} />

      <ReportsBranchTotals byBranch={summary.byBranch} />

      {summary.chartData.length > 0 ? (
        <ReportsChart data={summary.chartData} />
      ) : (
        <ReportsEmptyState />
      )}
    </PageContainer>
  );
}
