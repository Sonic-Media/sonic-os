"use client";

import { InsightCard } from "@/components/dashboard/analytics/insight-card";
import { useDashboardContext } from "@/context/dashboard-context";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InsightsSectionProps {
  className?: string;
}

export function InsightsSection({ className }: InsightsSectionProps) {
  const { analytics, openDrillDown } = useDashboardContext();
  const { bestBranch, bestStaff, quickInsights } = analytics;

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-sm font-medium text-zinc-500 tracking-wide uppercase">
        Quick Insights
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          label="Best Branch"
          value={bestBranch?.name ?? "No data"}
          detail={
            bestBranch
              ? `${formatCurrency(bestBranch.totalSales)} sales`
              : undefined
          }
          onClick={() => openDrillDown("branch")}
        />

        <InsightCard
          label="Best Staff"
          value={bestStaff?.staffName ?? "No data"}
          detail={
            bestStaff
              ? `${formatCurrency(bestStaff.totalSales)} sales handled`
              : undefined
          }
          onClick={() => openDrillDown("staff")}
        />

        <InsightCard
          label="Highest Expense"
          value={formatCurrency(
            quickInsights.highestExpenseCategory?.amount ?? 0
          )}
          detail={quickInsights.highestExpenseCategory?.label ?? "No data"}
          onClick={() => openDrillDown("expense-history")}
        />

        <InsightCard
          label="Average Sales"
          value={formatCurrency(quickInsights.averageDailySales)}
          detail="Per day in this period"
          onClick={() => openDrillDown("sales-report")}
        />

        <InsightCard
          label="Highest Sales Day"
          value={formatCurrency(quickInsights.highestSalesDay?.value ?? 0)}
          detail={quickInsights.highestSalesDay?.label ?? "No data"}
          onClick={() => openDrillDown("highest-sales-day")}
        />

        <InsightCard
          label="Highest Savings Day"
          value={formatCurrency(quickInsights.highestSavingsDay?.value ?? 0)}
          detail={quickInsights.highestSavingsDay?.label ?? "No data"}
          onClick={() => openDrillDown("highest-savings-day")}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
