import {
  formatMoney,
  formatPercentChange,
  pushUniqueInsight,
  sumOperatingExpenses,
  percentChange,
} from "@/lib/business-intelligence/helpers";
import type { BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateExpenseInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, yesterday, expenses, entries } = context;

  const todayModuleExpenses = expenses.filter(
    (expense) => expense.date === today && !expense.staffPaymentId
  );
  const todayEntryExpenses = entries
    .filter((entry) => entry.date === today && entry.status === "completed")
    .flatMap((entry) => entry.expenses);

  const allTodayExpenses = [
    ...todayModuleExpenses.map((expense) => ({
      name: expense.categoryName || expense.description,
      amount: expense.amount,
    })),
    ...todayEntryExpenses.map((expense) => ({
      name: expense.name,
      amount: expense.amount,
    })),
  ];

  if (allTodayExpenses.length > 0) {
    const highest = [...allTodayExpenses].sort((left, right) => right.amount - left.amount)[0];
    if (highest && highest.amount > 0) {
      pushUniqueInsight(
        insights,
        {
          id: "expense-highest-today",
          text: `Highest expense today: ${highest.name} at ${formatMoney(highest.amount)}.`,
          severity: "info",
          tier: "info",
          category: "expenses",
          priority: 40,
        },
        seen
      );
    }

    const categoryTotals = new Map<string, number>();
    for (const expense of todayModuleExpenses) {
      const key = expense.categoryName.trim() || "Uncategorized";
      categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + expense.amount);
    }
    for (const expense of todayEntryExpenses) {
      categoryTotals.set(expense.name, (categoryTotals.get(expense.name) ?? 0) + expense.amount);
    }

    const topCategory = [...categoryTotals.entries()].sort(([, left], [, right]) => right - left)[0];
    if (topCategory && topCategory[1] > 0) {
      pushUniqueInsight(
        insights,
        {
          id: "expense-category-leader",
          text: `${topCategory[0]} is today's top expense category at ${formatMoney(topCategory[1])}.`,
          severity: "info",
          tier: "info",
          category: "expenses",
          priority: 32,
        },
        seen
      );
    }
  }

  const todayTotal = sumOperatingExpenses(expenses, today) +
    entries
      .filter((entry) => entry.date === today && entry.status === "completed")
      .reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);

  const yesterdayTotal = sumOperatingExpenses(expenses, yesterday) +
    entries
      .filter((entry) => entry.date === yesterday && entry.status === "completed")
      .reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);

  const change = percentChange(todayTotal, yesterdayTotal);
  if (change !== null && Math.abs(change) >= 15 && yesterdayTotal > 0) {
    pushUniqueInsight(
      insights,
      {
        id: change > 0 ? "expense-trend-up" : "expense-trend-down",
        text:
          change > 0
            ? `Operating expenses are trending ${formatPercentChange(change)} above yesterday.`
            : `Operating expenses are ${formatPercentChange(Math.abs(change))} below yesterday.`,
        severity: change > 0 ? "warning" : "positive",
        tier: change > 0 ? "info" : "achievement",
        category: "expenses",
        priority: 45,
      },
      seen
    );
  }

  const weekExpenses = expenses.filter((expense) => !expense.staffPaymentId);
  if (weekExpenses.length >= 5 && todayTotal > 0) {
    const dailyAverage =
      weekExpenses
        .filter((expense) => expense.date >= context.weekStart)
        .reduce((sum, expense) => sum + expense.amount, 0) /
      Math.max(1, new Set(weekExpenses.map((e) => e.date)).size);

    if (dailyAverage > 0) {
      const deviation = percentChange(todayTotal, dailyAverage);
      if (deviation !== null && Math.abs(deviation) <= 15) {
        pushUniqueInsight(
          insights,
          {
            id: "expense-normal-range",
            text: "Expenses are within the normal daily range for this week.",
            severity: "positive",
            tier: "recommendation",
            category: "expenses",
            priority: 20,
          },
          seen
        );
      }
    }
  }

  return insights;
}
