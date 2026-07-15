"use client";

import { Card } from "@/components/shared/ui/card";
import { StatCard } from "@/components/shared/ui/stat-card";
import { useSettings } from "@/context/settings-context";
import { formatCurrency } from "@/lib/format";
import type { ReportInsights } from "@/types";

interface ReportsInsightsProps {
  insights: ReportInsights;
}

export function ReportsInsights({ insights }: ReportsInsightsProps) {
  const { getBranchName } = useSettings();
  const bestBranchName = insights.bestPerformingBranch
    ? getBranchName(insights.bestPerformingBranch)
    : "—";

  return (
    <section className="mb-8 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
          Insights
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Highest Sales Day"
            value={insights.highestSalesDay?.value ?? 0}
            detail={insights.highestSalesDay?.label ?? "—"}
          />
          <StatCard
            label="Highest Savings Day"
            value={insights.highestSavingsDay?.value ?? 0}
            detail={insights.highestSavingsDay?.label ?? "—"}
            variant={
              (insights.highestSavingsDay?.value ?? 0) >= 0
                ? "accent"
                : "default"
            }
          />
          <StatCard
            label="Highest Expense Day"
            value={insights.highestExpenseDay?.value ?? 0}
            detail={insights.highestExpenseDay?.label ?? "—"}
          />
          <StatCard
            label="Average Daily Sales"
            value={insights.averageDailySales}
          />
          <StatCard
            label="Average Daily Savings"
            value={insights.averageDailySavings}
            variant={insights.averageDailySavings >= 0 ? "accent" : "default"}
          />
          <Card>
            <p className="text-sm font-medium text-zinc-500 tracking-wide">
              Best Performing Branch
            </p>
            <p className="text-2xl font-semibold text-white mt-1 tracking-tight">
              {bestBranchName}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              {formatCurrency(insights.bestPerformingBranchSavings)} savings
            </p>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
          Expense Breakdown
        </h2>
        <Card>
          <div className="space-y-3">
            {insights.expenseBreakdown.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between"
              >
                <span className="text-white">{item.label}</span>
                <span className="text-zinc-400">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
