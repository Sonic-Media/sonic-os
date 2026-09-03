import {
  computeTotalRevenue,
  filterSalesByDate,
  formatMoney,
  hoursSince,
  matchesBranch,
  percentChange,
  pushUniqueInsight,
  sumEntryRevenue,
  sumSaleRevenue,
} from "@/lib/business-intelligence/helpers";
import { resolveBranchName, type BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

const CLOSING_HOUR = 23;

export function generateBranchInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, branches, closings, sales, entries } = context;

  const activeBranches = branches.filter((branch) => branch.active);
  if (activeBranches.length === 0) {
    return insights;
  }

  const branchPerformance = activeBranches.map((branch) => ({
    code: branch.code,
    name: resolveBranchName(context, branch.code),
    revenue: computeTotalRevenue(sales, entries, today, branch.code),
    accessory: sumSaleRevenue(filterSalesByDate(sales, today, branch.code)),
    movie: sumEntryRevenue(
      entries.filter(
        (entry) =>
          entry.date === today &&
          entry.status === "completed" &&
          matchesBranch(entry.branch, branch.code)
      )
    ),
  }));

  const sorted = [...branchPerformance].sort((left, right) => right.revenue - left.revenue);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best && best.revenue > 0 && activeBranches.length >= 2) {
    pushUniqueInsight(
      insights,
      {
        id: "branch-best-performer",
        text: `${best.name} is today's best performing branch with ${formatMoney(best.revenue)} in revenue.`,
        severity: "positive",
        tier: "achievement",
        category: "branches",
        priority: 60,
      },
      seen
    );
  }

  if (
    worst &&
    best &&
    worst.code !== best.code &&
    best.revenue > 0 &&
    worst.revenue < best.revenue
  ) {
    const gap = worst.revenue > 0 ? percentChange(best.revenue, worst.revenue) : null;
    if (gap !== null && gap >= 25) {
      pushUniqueInsight(
        insights,
        {
          id: "branch-lowest-performer",
          text: `${worst.name} is the lowest performing branch today at ${formatMoney(worst.revenue)}.`,
          severity: "warning",
          tier: "info",
          category: "branches",
          priority: 45,
        },
        seen
      );
    }
  }

  for (const branch of activeBranches) {
    const closing = closings.find(
      (record) => record.date === today && matchesBranch(record.branch, branch.code)
    );
    const branchName = resolveBranchName(context, branch.code);

    if (!closing) {
      const currentHour = new Date(context.nowMs).getHours();
      if (currentHour >= 8) {
        pushUniqueInsight(
          insights,
          {
            id: `branch-not-opened-${branch.code}`,
            text: `${branchName} has not opened for business today.`,
            severity: "warning",
            tier: "critical",
            category: "branches",
            priority: 88,
          },
          seen
        );
      }
      continue;
    }

    if (closing.status === "open") {
      const openedAt = closing.openedAt ?? closing.reopenedAt;
      const hoursOpen = hoursSince(openedAt, context.nowMs);
      if (hoursOpen !== null && hoursOpen >= 14) {
        pushUniqueInsight(
          insights,
          {
            id: `branch-open-long-${branch.code}`,
            text: `${branchName} has been open for ${Math.round(hoursOpen)} hours.`,
            severity: "warning",
            tier: "critical",
            category: "branches",
            priority: 82,
          },
          seen
        );
      }

      const currentHour = new Date(context.nowMs).getHours();
      if (currentHour >= CLOSING_HOUR) {
        pushUniqueInsight(
          insights,
          {
            id: `branch-still-open-${branch.code}`,
            text: `${branchName} is still open after typical closing hours.`,
            severity: "warning",
            tier: "critical",
            category: "branches",
            priority: 78,
          },
          seen
        );
      }
    }
  }

  if (activeBranches.length >= 2) {
    const avgAccessory =
      branchPerformance.reduce((sum, row) => sum + row.accessory, 0) /
      branchPerformance.length;

    for (const row of branchPerformance) {
      if (row.accessory > 0 && row.accessory < avgAccessory * 0.6 && avgAccessory > 0) {
        const gap = percentChange(avgAccessory, row.accessory);
        if (gap !== null && gap >= 30) {
          pushUniqueInsight(
            insights,
            {
              id: `branch-accessory-below-avg-${row.code}`,
              text: `${row.name} has lower accessory sales than the branch average today.`,
              severity: "info",
              tier: "recommendation",
              category: "branches",
              priority: 38,
            },
            seen
          );
        }
      }
    }
  }

  return insights;
}
