"use client";

import { useMemo, useState } from "react";
import { ReportsBranchTotals } from "@/components/reports/reports-branch-totals";
import { ReportsCategoryPanel } from "@/components/reports/reports-category-panel";
import { ReportsEmptyState } from "@/components/reports/reports-empty-state";
import { ReportsFilterToolbar } from "@/components/reports/reports-filter-toolbar";
import { ReportsInsights } from "@/components/reports/reports-insights";
import { ReportsPageKpis } from "@/components/reports/reports-page-kpis";
import { ReportsSalesTrendChart } from "@/components/reports/reports-sales-trend-chart";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useReports } from "@/hooks/use-reports";
import {
  deriveReportsPresentationKpis,
  type ReportsPresentationType,
} from "@/lib/reports/presentation-kpis";

function resolveTrendConfig(reportType: ReportsPresentationType) {
  switch (reportType) {
    case "expenses":
      return {
        dataKey: "expenses" as const,
        title: "Expense Trend",
        subtitle: "Operating expenses over the selected period",
        color: "#f87171",
      };
    case "purchases":
      return {
        dataKey: "expenses" as const,
        title: "Purchase Spend Trend",
        subtitle: "Expense totals including inventory spend",
        color: "#a78bfa",
      };
    case "stock":
      return {
        dataKey: "sales" as const,
        title: "Revenue Trend",
        subtitle: "Sales performance over the selected period",
        color: "#60a5fa",
      };
    case "staff":
      return {
        dataKey: "expenses" as const,
        title: "Staff Cost Trend",
        subtitle: "Expense totals including staff payments",
        color: "#818cf8",
      };
    case "sales":
    default:
      return {
        dataKey: "sales" as const,
        title: "Sales Trend",
        subtitle: "Sales performance over the selected period",
        color: "#34d399",
      };
  }
}

function resolveCategoryPanelCopy(reportType: ReportsPresentationType) {
  switch (reportType) {
    case "expenses":
      return {
        title: "Expenses by Category",
        subtitle: "Category totals from completed daily operations",
      };
    case "purchases":
      return {
        title: "Spend by Category",
        subtitle: "Category totals from completed daily operations",
      };
    case "stock":
      return {
        title: "Inventory & Spend Categories",
        subtitle: "Category totals from completed daily operations",
      };
    case "staff":
      return {
        title: "Staff & Expense Categories",
        subtitle: "Category totals from completed daily operations",
      };
    case "sales":
    default:
      return {
        title: "Sales by Category",
        subtitle: "Category totals from completed daily operations",
      };
  }
}

export function ReportsWorkspace() {
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
  } = useReports();
  const [reportType, setReportType] =
    useState<ReportsPresentationType>("sales");

  const kpis = useMemo(
    () => deriveReportsPresentationKpis(summary, reportType),
    [summary, reportType]
  );
  const trendConfig = useMemo(
    () => resolveTrendConfig(reportType),
    [reportType]
  );
  const categoryCopy = useMemo(
    () => resolveCategoryPanelCopy(reportType),
    [reportType]
  );

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Reports"
        subtitle="Analyze your business performance"
        showBranchBadge={!canSelectBranch}
      />

      <ReportsFilterToolbar
        reportType={reportType}
        onReportTypeChange={setReportType}
        period={period}
        onPeriodChange={setPeriod}
        referenceDate={referenceDate}
        onReferenceDateChange={setReferenceDate}
        branchScope={branchScope}
        onBranchScopeChange={setBranchScope}
        canSelectBranch={canSelectBranch}
      />

      <ReportsPageKpis {...kpis} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] xl:items-start">
        {summary.chartData.length > 0 ? (
          <ReportsSalesTrendChart
            data={summary.chartData}
            dataKey={trendConfig.dataKey}
            title={trendConfig.title}
            subtitle={trendConfig.subtitle}
            color={trendConfig.color}
          />
        ) : (
          <ReportsEmptyState />
        )}

        <ReportsCategoryPanel
          items={summary.insights.expenseBreakdown}
          title={categoryCopy.title}
          subtitle={categoryCopy.subtitle}
        />
      </div>

      <ReportsInsights insights={summary.insights} />

      <ReportsBranchTotals
        byBranch={summary.byBranch}
        branchScope={branchScope}
      />
    </PageContainer>
  );
}
