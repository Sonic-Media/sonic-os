"use client";

import dynamic from "next/dynamic";
import { ReportsBranchFilter } from "@/components/reports/reports-branch-filter";
import { ReportsBranchTotals } from "@/components/reports/reports-branch-totals";
import { ReportsDatePicker } from "@/components/reports/reports-date-picker";
import { ReportsEmptyState } from "@/components/reports/reports-empty-state";
import { ReportsInsights } from "@/components/reports/reports-insights";
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
  const {
    isLoaded,
    period,
    setPeriod,
    referenceDate,
    setReferenceDate,
    branchScope,
    setBranchScope,
    canSelectBranch,
    summary,
    periodLabel,
  } = useReports();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader title="Reports" subtitle={periodLabel} showBranchBadge={!canSelectBranch} />

      <div className="mb-8 space-y-6">
        {canSelectBranch ? (
          <ReportsBranchFilter value={branchScope} onChange={setBranchScope} />
        ) : null}

        <ReportsPeriodTabs period={period} onPeriodChange={setPeriod} />

        {period === "daily" ? (
          <ReportsDatePicker value={referenceDate} onChange={setReferenceDate} />
        ) : null}
      </div>

      <ReportsSummary summary={summary} />

      <ReportsInsights insights={summary.insights} />

      <ReportsBranchTotals byBranch={summary.byBranch} branchScope={branchScope} />

      {summary.chartData.length > 0 ? (
        <ReportsChart data={summary.chartData} />
      ) : (
        <ReportsEmptyState />
      )}
    </PageContainer>
  );
}
