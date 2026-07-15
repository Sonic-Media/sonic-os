"use client";

import { Card } from "@/components/shared/ui/card";
import { StatCard } from "@/components/shared/ui/stat-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type {
  DashboardAnalytics,
  DashboardMetricWithTrend,
  DashboardPeriod,
} from "@/types";
import { DashboardPeriodTabs } from "@/components/dashboard/dashboard-period-tabs";

interface DashboardAnalyticsSectionProps {
  analytics: DashboardAnalytics;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

function trendTone(metric: DashboardMetricWithTrend) {
  return metric.trend.isPositive ? "positive" : "negative";
}

export function DashboardAnalyticsSection({
  analytics,
  period,
  onPeriodChange,
}: DashboardAnalyticsSectionProps) {
  const { bestBranch, bestStaff, quickInsights } = analytics;

  return (
    <section className="mb-8">
      <DashboardPeriodTabs period={period} onPeriodChange={onPeriodChange} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard
          label="Sales"
          value={analytics.sales.value}
          size="large"
          detail={analytics.sales.trend.label}
          detailTone={trendTone(analytics.sales)}
        />
        <StatCard
          label="Expenses"
          value={analytics.expenses.value}
          size="large"
          detail={analytics.expenses.trend.label}
          detailTone={trendTone(analytics.expenses)}
        />
        <StatCard
          label="Savings"
          value={analytics.savings.value}
          size="large"
          variant={analytics.savings.value >= 0 ? "accent" : "default"}
          detail={analytics.savings.trend.label}
          detailTone={trendTone(analytics.savings)}
        />
        <StatCard
          label="Profit Margin %"
          value={analytics.profitMargin.value}
          size="large"
          formatValue={formatPercent}
          detail={analytics.profitMargin.trend.label}
          detailTone={trendTone(analytics.profitMargin)}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
        <Card>
          <p className="text-sm font-medium text-zinc-500 tracking-wide">
            Best Branch
          </p>
          {bestBranch ? (
            <>
              <p className="text-2xl font-semibold text-white mt-1 tracking-tight">
                {bestBranch.name}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {formatCurrency(bestBranch.totalSales)} sales
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {formatPercent(bestBranch.revenuePercentage)} of total revenue
              </p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-white mt-1 tracking-tight">
              No data
            </p>
          )}
        </Card>

        <Card>
          <p className="text-sm font-medium text-zinc-500 tracking-wide">
            Best Staff
          </p>
          {bestStaff ? (
            <>
              <p className="text-2xl font-semibold text-white mt-1 tracking-tight">
                {bestStaff.staffName}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {formatCurrency(bestStaff.totalSales)} sales handled
              </p>
              <p className="text-sm text-zinc-500 mt-1">{bestStaff.branchName}</p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-white mt-1 tracking-tight">
              No data
            </p>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
          Quick Insights
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Highest Expense Category"
            value={quickInsights.highestExpenseCategory?.amount ?? 0}
            detail={quickInsights.highestExpenseCategory?.label ?? "No data"}
          />
          <StatCard
            label="Most Expensive Day"
            value={quickInsights.mostExpensiveDay?.value ?? 0}
            detail={quickInsights.mostExpensiveDay?.label ?? "No data"}
          />
          <StatCard
            label="Average Daily Sales"
            value={quickInsights.averageDailySales}
          />
          <StatCard
            label="Average Daily Expenses"
            value={quickInsights.averageDailyExpenses}
          />
          <StatCard
            label="Average Savings"
            value={quickInsights.averageDailySavings}
            variant={quickInsights.averageDailySavings >= 0 ? "accent" : "default"}
            className="sm:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}
