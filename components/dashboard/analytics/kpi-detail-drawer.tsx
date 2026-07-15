"use client";

import { useEffect } from "react";
import { AnalyticsLineChart } from "@/components/charts/line-chart";
import { buildKpiDetailSnapshot } from "@/lib/kpi-detail";
import type {
  AnalyticsTimeFilter,
  CustomDateRange,
  DrillDownView,
  MetricFocus,
} from "@/lib/analytics-view";
import type { DashboardChartData } from "@/lib/chart-data";
import type {
  BestBranchResult,
  Branch,
  ChartDataPoint,
  DashboardAnalytics,
  DashboardQuickInsights,
  Entry,
} from "@/types";

interface KpiDetailDrawerProps {
  metric: MetricFocus | "none";
  onClose: () => void;
  onOpenReport: (view: DrillDownView) => void;
  entries: Entry[];
  analytics: DashboardAnalytics;
  quickInsights: DashboardQuickInsights;
  salesTrend: ChartDataPoint[];
  chartData: DashboardChartData;
  bestBranch: BestBranchResult | null;
  branchNames: Record<Branch, string>;
  timeFilter: AnalyticsTimeFilter;
  customRange: CustomDateRange;
  branchFilter: Branch | null;
  staffFilter: string | null;
}

function DetailStat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          tone === "positive"
            ? "mt-1 text-lg font-semibold text-emerald-400"
            : tone === "negative"
              ? "mt-1 text-lg font-semibold text-red-400"
              : "mt-1 text-lg font-semibold text-white"
        }
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-sm text-zinc-500">{detail}</p>}
    </div>
  );
}

export function KpiDetailDrawer({
  metric,
  onClose,
  onOpenReport,
  entries,
  analytics,
  quickInsights,
  salesTrend,
  chartData,
  bestBranch,
  branchNames,
  timeFilter,
  customRange,
  branchFilter,
  staffFilter,
}: KpiDetailDrawerProps) {
  useEffect(() => {
    if (metric === "none") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [metric]);

  if (metric === "none" || metric === "all") return null;

  const snapshot = buildKpiDetailSnapshot(metric, {
    entries,
    analytics,
    quickInsights,
    salesTrend,
    bestBranch,
    branchNames,
    timeFilter,
    customRange,
    branchFilter,
    staffFilter,
  });

  if (!snapshot) return null;

  const showTrendChart =
    (metric === "sales" || metric === "expenses" || metric === "profit") &&
    chartData.hasData;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close KPI drawer"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${snapshot.title} analytics`}
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800/80 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-zinc-800/80 px-5 py-4">
          <div>
            <h3 className="text-sm font-medium tracking-wide text-white">
              {snapshot.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">KPI analytics</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-white"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Summary
            </h4>
            <div className="space-y-2">
              {snapshot.rows.map((row) => (
                <DetailStat
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  detail={row.detail}
                  tone={row.tone}
                />
              ))}
            </div>
          </section>

          {showTrendChart && (
            <section className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Trend
              </h4>
              <AnalyticsLineChart data={salesTrend} className="h-44 sm:h-48" />
            </section>
          )}

          {snapshot.reportAction && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReport(snapshot.reportAction!.view);
              }}
              className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 text-sm font-medium text-white transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-900"
            >
              {snapshot.reportAction.label}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
