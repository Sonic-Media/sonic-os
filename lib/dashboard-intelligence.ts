import { BRANCH_IDS } from "@/lib/constants";
import {
  classifyExpense,
  getExpenseBreakdown,
} from "@/lib/report-insights";
import type { DashboardChartData } from "@/lib/chart-data";
import type {
  Branch,
  BranchProgress,
  DashboardAnalytics,
  Entry,
  ExpenseBreakdownKey,
} from "@/types";

export type IntelligenceIcon =
  | "sales"
  | "branch"
  | "expenses"
  | "savings"
  | "profit"
  | "compare";

export type IntelligenceTone = "positive" | "negative" | "neutral" | "warning";

export type BusinessPulseStatus = "healthy" | "attention" | "critical";

export interface IntelligenceInsight {
  id: string;
  text: string;
  tone: IntelligenceTone;
  icon: IntelligenceIcon;
  priority: number;
}

export interface DashboardIntelligence {
  insights: IntelligenceInsight[];
  recommendation: string;
}

export interface BusinessPulse {
  status: BusinessPulseStatus;
  statusLabel: string;
  statusEmoji: string;
  summaryLines: string[];
  recommendation: string;
  insights: IntelligenceInsight[];
}

function getTransportExpenseTotal(entries: Entry[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const expense of entry.expenses) {
      const name = expense.name.trim().toLowerCase();
      if (
        classifyExpense(expense) === "other" &&
        (name.includes("transport") ||
          name.includes("fuel") ||
          expense.id === "template-fuel")
      ) {
        total += expense.amount;
      }
    }
  }
  return total;
}

function findLargestExpenseIncrease(
  currentEntries: Entry[],
  previousEntries: Entry[]
): { key: ExpenseBreakdownKey; label: string; delta: number } | null {
  const current = getExpenseBreakdown(currentEntries);
  const previous = getExpenseBreakdown(previousEntries);
  const previousMap = Object.fromEntries(previous.map((item) => [item.key, item.amount]));

  let best: { key: ExpenseBreakdownKey; label: string; delta: number } | null =
    null;

  for (const item of current) {
    const delta = item.amount - (previousMap[item.key] ?? 0);
    if (delta <= 0) continue;
    if (!best || delta > best.delta) {
      best = { key: item.key, label: item.label, delta };
    }
  }

  return best;
}

function getBranchSalesGap(chartData: DashboardChartData) {
  if (chartData.branchComparison.length < 2) return null;

  const sorted = [...chartData.branchComparison].sort((a, b) => b.sales - a.sales);
  const leader = sorted[0];
  const laggard = sorted[sorted.length - 1];

  if (!leader || !laggard || leader.sales <= laggard.sales) return null;
  if (leader.sales === 0) return null;

  const gapPercent = ((leader.sales - laggard.sales) / leader.sales) * 100;
  if (gapPercent < 10) return null;

  return {
    leader: leader.branch,
    laggard: laggard.branch,
    gapPercent,
  };
}

function pickInsights(candidates: IntelligenceInsight[]): IntelligenceInsight[] {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const count = Math.min(6, Math.max(4, sorted.length));
  return sorted.slice(0, count);
}

function buildRecommendation(options: {
  analytics: DashboardAnalytics;
  expenseDriver: ReturnType<typeof findLargestExpenseIncrease>;
  transportDelta: number;
  branchGap: ReturnType<typeof getBranchSalesGap>;
}): string {
  const { analytics, expenseDriver, transportDelta, branchGap } = options;

  if (expenseDriver?.key === "staff-payments" && analytics.expenses.trend.direction === "up") {
    return "Consider reviewing Staff Payments.";
  }

  if (transportDelta > 0 && analytics.expenses.trend.direction === "up") {
    return "Transport expenses are increasing.";
  }

  if (
    analytics.sales.trend.isPositive &&
    analytics.savings.trend.isPositive &&
    analytics.savings.value >= 0
  ) {
    return "Sales are healthy. Maintain current spending.";
  }

  if (branchGap) {
    return `Review performance at ${branchGap.laggard}.`;
  }

  if (!analytics.profitMargin.trend.isPositive) {
    return "Focus on reducing costs or growing sales to restore margin.";
  }

  if (analytics.expenses.trend.direction === "up") {
    return `Review ${expenseDriver?.label ?? "expense"} categories with the largest increases.`;
  }

  return "Continue monitoring daily performance.";
}

export function generateDashboardIntelligence(options: {
  analytics: DashboardAnalytics;
  chartData: DashboardChartData;
  branchNames: Record<Branch, string>;
  currentEntries: Entry[];
  previousEntries: Entry[];
  todayProgress?: BranchProgress[];
}): DashboardIntelligence {
  const { analytics, chartData, branchNames, currentEntries, previousEntries, todayProgress } =
    options;

  if (!chartData.hasData) {
    return {
      insights: [
        {
          id: "no-data",
          text: "Complete more entries to unlock business intelligence.",
          tone: "neutral",
          icon: "sales",
          priority: 0,
        },
      ],
      recommendation: "Log daily sales and expenses to generate insights.",
    };
  }

  const candidates: IntelligenceInsight[] = [];
  const expenseDriver = findLargestExpenseIncrease(
    currentEntries,
    previousEntries
  );
  const transportDelta =
    getTransportExpenseTotal(currentEntries) -
    getTransportExpenseTotal(previousEntries);
  const branchGap = getBranchSalesGap(chartData);

  const salesTrend = analytics.sales.trend;
  if (salesTrend.direction === "up") {
    candidates.push({
      id: "sales-up",
      text: "Sales increased compared to the previous period.",
      tone: "positive",
      icon: "sales",
      priority: 100,
    });
  } else if (salesTrend.direction === "down") {
    candidates.push({
      id: "sales-down",
      text: `Sales decreased ${Math.round(salesTrend.percent)}% compared to the previous period.`,
      tone: "negative",
      icon: "sales",
      priority: 100,
    });
  } else {
    candidates.push({
      id: "sales-flat",
      text: "Sales remained steady compared to the previous period.",
      tone: "neutral",
      icon: "sales",
      priority: 70,
    });
  }

  if (analytics.bestBranch) {
    candidates.push({
      id: "top-branch",
      text: `${analytics.bestBranch.name} generated the highest revenue.`,
      tone: "positive",
      icon: "branch",
      priority: 95,
    });
  }

  if (
    analytics.expenses.trend.direction === "up" &&
    expenseDriver &&
    expenseDriver.delta > 0
  ) {
    const percent = analytics.expenses.trend.percent;
    const percentText =
      percent > 0 ? ` ${Math.round(percent)}%` : "";
    candidates.push({
      id: "expense-driver",
      text: `Expenses increased${percentText} because of ${expenseDriver.label}.`,
      tone: "warning",
      icon: "expenses",
      priority: 90,
    });
  } else if (analytics.expenses.trend.direction === "up") {
    candidates.push({
      id: "expenses-up",
      text: `Expenses increased ${Math.round(analytics.expenses.trend.percent)}% compared to the previous period.`,
      tone: "warning",
      icon: "expenses",
      priority: 82,
    });
  } else if (analytics.expenses.trend.direction === "down") {
    candidates.push({
      id: "expenses-down",
      text: "Expenses decreased compared to the previous period.",
      tone: "positive",
      icon: "expenses",
      priority: 75,
    });
  }

  if (analytics.savings.trend.isPositive) {
    candidates.push({
      id: "savings-up",
      text: "Savings are improving.",
      tone: "positive",
      icon: "savings",
      priority: 85,
    });
  } else if (analytics.savings.trend.direction === "down") {
    candidates.push({
      id: "savings-down",
      text: "Savings are under pressure.",
      tone: "negative",
      icon: "savings",
      priority: 85,
    });
  }

  if (analytics.profitMargin.trend.direction === "down") {
    candidates.push({
      id: "margin-down",
      text: "Profit margin decreased.",
      tone: "negative",
      icon: "profit",
      priority: 80,
    });
  } else if (analytics.profitMargin.trend.direction === "up") {
    candidates.push({
      id: "margin-up",
      text: "Profit margin improved.",
      tone: "positive",
      icon: "profit",
      priority: 80,
    });
  }

  if (branchGap) {
    candidates.push({
      id: "branch-gap",
      text: `${branchGap.laggard} is underperforming compared to ${branchGap.leader}.`,
      tone: "warning",
      icon: "compare",
      priority: 88,
    });
  }

  const highestCategory = analytics.quickInsights.highestExpenseCategory;
  if (
    highestCategory &&
    !candidates.some((item) => item.id === "expense-driver")
  ) {
    candidates.push({
      id: "top-expense-category",
      text: `${highestCategory.label} is the largest expense category this period.`,
      tone: "neutral",
      icon: "expenses",
      priority: 60,
    });
  }

  for (const branchId of BRANCH_IDS) {
    const branchName = branchNames[branchId];
    const branchPoint = chartData.branchComparison.find(
      (point) => point.branch === branchName
    );
    if (branchPoint && branchPoint.savings < 0) {
      candidates.push({
        id: `branch-negative-savings-${branchId}`,
        text: `${branchName} recorded negative savings this period.`,
        tone: "negative",
        icon: "branch",
        priority: 65,
      });
      break;
    }
  }

  const expenseBreakdown = getExpenseBreakdown(currentEntries);
  const fuelOrTransport = expenseBreakdown.find((item) => item.key === "other");
  if (transportDelta > 0 && fuelOrTransport && fuelOrTransport.amount > 0) {
    candidates.push({
      id: "transport-up",
      text: "Transport-related expenses are increasing.",
      tone: "warning",
      icon: "expenses",
      priority: 72,
    });
  }

  addBranchSubmissionInsights(candidates, todayProgress);

  const insights = pickInsights(candidates);
  const recommendation = buildRecommendation({
    analytics,
    expenseDriver,
    transportDelta,
    branchGap,
  });

  return { insights, recommendation };
}

function addBranchSubmissionInsights(
  candidates: IntelligenceInsight[],
  todayProgress: BranchProgress[] | undefined
) {
  if (!todayProgress || todayProgress.length === 0) return;

  const pending = todayProgress.filter((item) => !item.completed);
  if (pending.length === 0) {
    candidates.push({
      id: "all-branches-submitted",
      text: "All branches submitted.",
      tone: "positive",
      icon: "branch",
      priority: 92,
    });
    return;
  }

  for (const item of pending) {
    candidates.push({
      id: `branch-pending-${item.branch}`,
      text: `${item.name} has not submitted today.`,
      tone: "warning",
      icon: "branch",
      priority: 94,
    });
  }
}

function deriveBusinessPulseStatus(options: {
  analytics: DashboardAnalytics;
  insights: IntelligenceInsight[];
  todayProgress?: BranchProgress[];
}): BusinessPulseStatus {
  const { analytics, insights, todayProgress } = options;
  let criticalScore = 0;
  let attentionScore = 0;

  if (analytics.savings.value < 0) criticalScore += 2;
  if (
    analytics.sales.trend.direction === "down" &&
    analytics.sales.trend.percent >= 15
  ) {
    criticalScore += 2;
  }
  if (analytics.profitMargin.value < 0) criticalScore += 1;

  if (insights.some((item) => item.tone === "negative")) attentionScore += 1;
  if (insights.some((item) => item.tone === "warning")) attentionScore += 1;
  if (todayProgress?.some((item) => !item.completed)) attentionScore += 1;
  if (analytics.expenses.trend.direction === "up") attentionScore += 1;

  if (criticalScore >= 2) return "critical";
  if (attentionScore >= 1) return "attention";
  return "healthy";
}

const STATUS_META: Record<
  BusinessPulseStatus,
  { label: string; emoji: string }
> = {
  healthy: { label: "Healthy", emoji: "🟢" },
  attention: { label: "Attention", emoji: "🟡" },
  critical: { label: "Critical", emoji: "🔴" },
};

export function generateBusinessPulse(options: {
  analytics: DashboardAnalytics;
  chartData: DashboardChartData;
  branchNames: Record<Branch, string>;
  currentEntries: Entry[];
  previousEntries: Entry[];
  todayProgress?: BranchProgress[];
}): BusinessPulse {
  const intelligence = generateDashboardIntelligence(options);
  const status = deriveBusinessPulseStatus({
    analytics: options.analytics,
    insights: intelligence.insights,
    todayProgress: options.todayProgress,
  });
  const statusMeta = STATUS_META[status];

  const summaryLines = intelligence.insights.slice(0, 3).map((insight) => insight.text);

  if (summaryLines.length === 0) {
    summaryLines.push("Complete more entries to unlock business intelligence.");
  }

  const driverLabel = expenseDriverLabel(options);
  if (
    driverLabel === "Staff Payments" &&
    options.analytics.expenses.trend.direction === "up" &&
    !summaryLines.some((line) => line.toLowerCase().includes("staff"))
  ) {
    summaryLines.push("Staff Payments unusually high.");
  }

  return {
    status,
    statusLabel: statusMeta.label,
    statusEmoji: statusMeta.emoji,
    summaryLines: summaryLines.slice(0, 3),
    recommendation: intelligence.recommendation,
    insights: intelligence.insights,
  };
}

const COMPACT_STATUS_META: Record<
  BusinessPulseStatus,
  { label: string; emoji: string }
> = {
  healthy: { label: "Business Healthy", emoji: "🟢" },
  attention: { label: "Attention Needed", emoji: "🟡" },
  critical: { label: "Action Required", emoji: "🔴" },
};

export interface CompactBusinessPulse {
  status: BusinessPulseStatus;
  statusLabel: string;
  statusEmoji: string;
  insight: string;
}

export function generateCompactBusinessPulse(options: {
  analytics: DashboardAnalytics;
  chartData: DashboardChartData;
  branchNames: Record<Branch, string>;
  currentEntries: Entry[];
  previousEntries: Entry[];
  todayProgress?: BranchProgress[];
}): CompactBusinessPulse {
  const pulse = generateBusinessPulse(options);
  const statusMeta = COMPACT_STATUS_META[pulse.status];
  const topInsight =
    pulse.insights[0]?.text ??
    pulse.summaryLines[0] ??
    "Complete more entries to unlock business intelligence.";

  return {
    status: pulse.status,
    statusLabel: statusMeta.label,
    statusEmoji: statusMeta.emoji,
    insight: topInsight,
  };
}

function expenseDriverLabel(options: {
  currentEntries: Entry[];
  previousEntries: Entry[];
}): string | null {
  const current = getExpenseBreakdown(options.currentEntries);
  const previous = getExpenseBreakdown(options.previousEntries);
  const previousMap = Object.fromEntries(
    previous.map((item) => [item.key, item.amount])
  );

  let best: { label: string; delta: number } | null = null;
  for (const item of current) {
    const delta = item.amount - (previousMap[item.key] ?? 0);
    if (delta <= 0) continue;
    if (!best || delta > best.delta) {
      best = { label: item.label, delta };
    }
  }

  return best?.label ?? null;
}
