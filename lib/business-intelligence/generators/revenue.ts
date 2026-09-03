import {
  computeTotalRevenue,
  filterSalesByDate,
  formatMoney,
  formatPercentChange,
  getMonthStartISO,
  getWeekStartISO,
  matchesBranch,
  percentChange,
  pushUniqueInsight,
  shiftDateISO,
  sumEntryRevenue,
  sumOperatingExpenses,
  sumSaleRevenue,
} from "@/lib/business-intelligence/helpers";
import { resolveBranchName, type BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

function sumRevenueInRange(
  context: BIAnalysisContext,
  start: string,
  end: string,
  branchCode?: string
): number {
  let total = 0;

  for (const sale of context.sales) {
    if (
      sale.status !== "completed" ||
      sale.date < start ||
      sale.date > end ||
      (branchCode && !matchesBranch(sale.branch, branchCode))
    ) {
      continue;
    }
    total += sale.total;
  }

  for (const entry of context.entries) {
    if (
      entry.status !== "completed" ||
      entry.date < start ||
      entry.date > end ||
      (branchCode && !matchesBranch(entry.branch, branchCode))
    ) {
      continue;
    }
    total += entry.sales;
  }

  return total;
}

export function generateRevenueInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, yesterday } = context;

  const todayRevenue = computeTotalRevenue(context.sales, context.entries, today);
  const yesterdayRevenue = computeTotalRevenue(
    context.sales,
    context.entries,
    yesterday
  );

  const dailyChange = percentChange(todayRevenue, yesterdayRevenue);
  if (dailyChange !== null && Math.abs(dailyChange) >= 10) {
    pushUniqueInsight(
      insights,
      {
        id: dailyChange > 0 ? "revenue-daily-up" : "revenue-daily-down",
        text:
          dailyChange > 0
            ? `Total revenue is ${formatPercentChange(dailyChange)} higher than yesterday (${formatMoney(todayRevenue)} today).`
            : `Total revenue is ${formatPercentChange(dailyChange)} lower than yesterday (${formatMoney(todayRevenue)} so far).`,
        severity: dailyChange > 0 ? "positive" : "warning",
        tier: dailyChange > 0 ? "achievement" : "info",
        category: "revenue",
        priority: 60 + Math.min(Math.abs(Math.round(dailyChange)), 40),
      },
      seen
    );
  }

  const weekStart = getWeekStartISO(today);
  const lastWeekStart = shiftDateISO(weekStart, -7);
  const lastWeekEnd = shiftDateISO(weekStart, -1);
  const thisWeekRevenue = sumRevenueInRange(context, weekStart, today);
  const lastWeekRevenue = sumRevenueInRange(context, lastWeekStart, lastWeekEnd);
  const weeklyChange = percentChange(thisWeekRevenue, lastWeekRevenue);

  if (weeklyChange !== null && Math.abs(weeklyChange) >= 15) {
    pushUniqueInsight(
      insights,
      {
        id: weeklyChange > 0 ? "revenue-weekly-up" : "revenue-weekly-down",
        text:
          weeklyChange > 0
            ? `This week's revenue is ${formatPercentChange(weeklyChange)} ahead of last week.`
            : `This week's revenue trails last week by ${formatPercentChange(weeklyChange)}.`,
        severity: weeklyChange > 0 ? "positive" : "warning",
        tier: weeklyChange > 0 ? "achievement" : "info",
        category: "revenue",
        priority: 50,
      },
      seen
    );
  }

  const monthStart = getMonthStartISO(today);
  const lastMonthStart = shiftDateISO(monthStart, -1);
  const lastMonthEnd = shiftDateISO(monthStart, -1);
  const thisMonthRevenue = sumRevenueInRange(context, monthStart, today);
  const lastMonthRevenue = sumRevenueInRange(
    context,
    lastMonthStart.slice(0, 7) + "-01",
    lastMonthEnd
  );
  const monthlyChange = percentChange(thisMonthRevenue, lastMonthRevenue);

  if (monthlyChange !== null && Math.abs(monthlyChange) >= 20) {
    pushUniqueInsight(
      insights,
      {
        id: monthlyChange > 0 ? "revenue-monthly-up" : "revenue-monthly-down",
        text:
          monthlyChange > 0
            ? `Monthly revenue is ${formatPercentChange(monthlyChange)} above the prior month pace.`
            : `Monthly revenue is ${formatPercentChange(monthlyChange)} below the prior month pace.`,
        severity: monthlyChange > 0 ? "positive" : "warning",
        tier: "info",
        category: "revenue",
        priority: 40,
      },
      seen
    );
  }

  const dailyTotals = new Map<string, number>();
  for (const sale of context.sales) {
    if (sale.status !== "completed") continue;
    dailyTotals.set(sale.date, (dailyTotals.get(sale.date) ?? 0) + sale.total);
  }
  for (const entry of context.entries) {
    if (entry.status !== "completed") continue;
    dailyTotals.set(entry.date, (dailyTotals.get(entry.date) ?? 0) + entry.sales);
  }

  const last7Days = [...dailyTotals.entries()]
    .filter(([date]) => date <= today)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7);

  if (last7Days.length >= 3) {
    const sorted = [...last7Days].sort(([, left], [, right]) => right - left);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best && worst && best[1] > 0 && worst[1] < best[1] * 0.5) {
      pushUniqueInsight(
        insights,
        {
          id: "revenue-best-worst-week",
          text: `Best recent day: ${best[0]} (${formatMoney(best[1])}). Weakest: ${worst[0]} (${formatMoney(worst[1])}).`,
          severity: "info",
          tier: "info",
          category: "revenue",
          priority: 30,
        },
        seen
      );
    }
  }

  const activeBranches = context.branches.filter((branch) => branch.active);
  if (activeBranches.length >= 2) {
    const branchTotals = activeBranches.map((branch) => ({
      code: branch.code,
      name: resolveBranchName(context, branch.code),
      revenue: computeTotalRevenue(
        context.sales,
        context.entries,
        today,
        branch.code
      ),
    }));

    const sorted = [...branchTotals].sort((left, right) => right.revenue - left.revenue);
    const leader = sorted[0];
    const laggard = sorted[sorted.length - 1];

    if (
      leader &&
      laggard &&
      leader.revenue > 0 &&
      laggard.revenue >= 0 &&
      leader.code !== laggard.code
    ) {
      const gap =
        laggard.revenue > 0
          ? percentChange(leader.revenue, laggard.revenue)
          : null;

      if (gap !== null && gap >= 20) {
        pushUniqueInsight(
          insights,
          {
            id: "revenue-branch-gap",
            text: `${leader.name} generated ${formatPercentChange(gap)} more revenue than ${laggard.name} today.`,
            severity: "positive",
            tier: "achievement",
            category: "revenue",
            priority: 70,
          },
          seen
        );
      } else if (leader.revenue > 0 && laggard.revenue === 0) {
        pushUniqueInsight(
          insights,
          {
            id: "revenue-branch-zero",
            text: `${leader.name} leads today with ${formatMoney(leader.revenue)} while ${laggard.name} has no revenue recorded yet.`,
            severity: "warning",
            tier: "info",
            category: "revenue",
            priority: 65,
          },
          seen
        );
      }
    }
  }

  const todayAccessory = sumSaleRevenue(filterSalesByDate(context.sales, today));
  const todayMovie = sumEntryRevenue(
    context.entries.filter((entry) => entry.date === today && entry.status === "completed")
  );

  if (todayAccessory > 0 && todayMovie > 0) {
    if (todayAccessory > todayMovie) {
      pushUniqueInsight(
        insights,
        {
          id: "revenue-accessory-leads",
          text: `Accessory revenue (${formatMoney(todayAccessory)}) exceeded movie revenue (${formatMoney(todayMovie)}) today.`,
          severity: "positive",
          tier: "achievement",
          category: "revenue",
          priority: 55,
        },
        seen
      );
    } else if (todayMovie > todayAccessory * 1.5) {
      const movieShare = Math.round((todayMovie / (todayMovie + todayAccessory)) * 100);
      pushUniqueInsight(
        insights,
        {
          id: "revenue-movie-dominant",
          text: `Movies are generating ${movieShare}% of today's combined revenue.`,
          severity: "info",
          tier: "recommendation",
          category: "revenue",
          priority: 45,
        },
        seen
      );
    }
  }

  const expenseToday =
    sumOperatingExpenses(context.expenses, today) +
    context.entries
      .filter((entry) => entry.date === today && entry.status === "completed")
      .reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const expenseYesterday =
    sumOperatingExpenses(context.expenses, yesterday) +
    context.entries
      .filter((entry) => entry.date === yesterday && entry.status === "completed")
      .reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);

  const expenseChange = percentChange(expenseToday, expenseYesterday);
  if (expenseChange !== null && expenseChange >= 25 && expenseYesterday > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "expenses-higher-yesterday",
        text: `Expenses are ${formatPercentChange(expenseChange)} higher than yesterday.`,
        severity: "warning",
        tier: "info",
        category: "expenses",
        priority: 58,
      },
      seen
    );
  }

  return insights;
}
