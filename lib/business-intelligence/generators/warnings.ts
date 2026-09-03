import {
  computeTotalRevenue,
  filterSalesByDate,
  getBranchProductStock,
  hoursSince,
  matchesBranch,
  pushUniqueInsight,
  sumEntryRevenue,
} from "@/lib/business-intelligence/helpers";
import { resolveBranchName, type BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateWarningInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, sales, entries, expenses, payments, products, movements, branches, backups } =
    context;

  const hasBackupToday = backups.some(
    (backup) =>
      backup.status === "completed" && backup.createdAt.slice(0, 10) === today
  );

  if (!hasBackupToday && backups.length >= 0) {
    pushUniqueInsight(
      insights,
      {
        id: "warning-no-backup-today",
        text: "No backup has been created today.",
        severity: "critical",
        tier: "critical",
        category: "warning",
        priority: 92,
      },
      seen
    );
  }

  for (const branch of branches.filter((branch) => branch.active)) {
    const branchName = resolveBranchName(context, branch.code);
    const openRecord = context.closings.find(
      (closing) =>
        closing.date === today &&
        matchesBranch(closing.branch, branch.code) &&
        closing.status === "open"
    );

    if (!openRecord) continue;

    const movieRevenue = sumEntryRevenue(
      entries.filter(
        (entry) =>
          entry.date === today &&
          matchesBranch(entry.branch, branch.code) &&
          (entry.status === "completed" || entry.status === "draft")
      )
    );

    if (movieRevenue <= 0) {
      pushUniqueInsight(
        insights,
        {
          id: `warning-no-movie-${branch.code}`,
          text: `No movie revenue has been entered at ${branchName} today.`,
          severity: "warning",
          tier: "critical",
          category: "warning",
          priority: 76,
        },
        seen
      );
    }

    const accessorySales = filterSalesByDate(sales, today, branch.code);
    if (accessorySales.length === 0) {
      const hoursOpen = hoursSince(
        openRecord.openedAt ?? openRecord.reopenedAt,
        context.nowMs
      );
      if (hoursOpen !== null && hoursOpen >= 1) {
        pushUniqueInsight(
          insights,
          {
            id: `warning-no-accessory-${branch.code}`,
            text: `No accessory sales recorded at ${branchName} today.`,
            severity: "warning",
            tier: "critical",
            category: "warning",
            priority: 74,
          },
          seen
        );
      }
    }

    const hasWages = payments.some(
      (payment) => payment.date === today && matchesBranch(payment.branch, branch.code)
    );
    if (!hasWages) {
      pushUniqueInsight(
        insights,
        {
          id: `warning-no-wages-${branch.code}`,
          text: `Daily wage not recorded at ${branchName}.`,
          severity: "warning",
          tier: "critical",
          category: "warning",
          priority: 72,
        },
        seen
      );
    }

    const hasExpenses =
      expenses.some(
        (expense) =>
          expense.date === today &&
          matchesBranch(expense.branch, branch.code) &&
          !expense.staffPaymentId
      ) ||
      entries.some(
        (entry) =>
          entry.date === today &&
          matchesBranch(entry.branch, branch.code) &&
          entry.expenses.length > 0
      );

    const totalRevenue = computeTotalRevenue(sales, entries, today, branch.code);
    if (totalRevenue > 0 && !hasExpenses) {
      pushUniqueInsight(
        insights,
        {
          id: `warning-revenue-no-expenses-${branch.code}`,
          text: `${branchName} has revenue but no expenses recorded today.`,
          severity: "warning",
          tier: "critical",
          category: "warning",
          priority: 70,
        },
        seen
      );
    }
  }

  for (const product of products) {
    for (const branch of branches.filter((branch) => branch.active)) {
      const qty = getBranchProductStock(product, branch.code, movements);
      if (qty < 0) {
        pushUniqueInsight(
          insights,
          {
            id: `warning-negative-stock-${product.id}-${branch.code}`,
            text: `${product.name} inventory is negative at ${resolveBranchName(context, branch.code)}.`,
            severity: "critical",
            tier: "critical",
            category: "warning",
            priority: 94,
          },
          seen
        );
        break;
      }
    }
  }

  return insights;
}
