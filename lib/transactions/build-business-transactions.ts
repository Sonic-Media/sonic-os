import { filterByBranchField } from "@/lib/active-branch/filters";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import { findMostRecentEntryForDate } from "@/lib/entry-helpers";
import { formatCurrency } from "@/lib/format";
import { formatSaleItemsSummary } from "@/lib/sales/format";
import type { BusinessTransaction } from "@/lib/transactions/types";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StaffPayment } from "@/types/staff-payment";
import type { Entry } from "@/types";

function formatTimeLabel(iso?: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseSortKey(iso?: string | null, fallback = 0): number {
  if (!iso) return fallback;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function actorPhrase(name?: string | null, action?: string): string {
  if (!name) return action ?? "Activity recorded";
  return `${name} ${action ?? "recorded activity"}`;
}

interface BuildBusinessTransactionsInput {
  activeBranch: Branch;
  date: string;
  entries: Entry[];
  sales: Sale[];
  expenses: ExpenseRecord[];
  purchases: Purchase[];
  payments: StaffPayment[];
  openRecord?: DayClosingRecord | null;
  closedRecord?: DayClosingRecord | null;
}

export function buildBusinessTransactions({
  activeBranch,
  date,
  entries,
  sales,
  expenses,
  purchases,
  payments,
  openRecord,
  closedRecord,
}: BuildBusinessTransactionsInput): BusinessTransaction[] {
  const transactions: BusinessTransaction[] = [];
  const branchEntries = filterByBranchField(entries, activeBranch);
  const draftEntry = findMostRecentEntryForDate(
    branchEntries,
    date,
    "draft",
    activeBranch
  );
  const completedEntry = findMostRecentEntryForDate(
    branchEntries,
    date,
    "completed",
    activeBranch
  );
  const revenueEntry = completedEntry ?? draftEntry;

  if (openRecord?.openedAt || openRecord?.reopenedAt) {
    const openedAt = openRecord.openedAt ?? openRecord.reopenedAt;
    transactions.push({
      id: "branch-open",
      type: "BranchOpen",
      timestamp: openedAt ?? "",
      sortKey: parseSortKey(openedAt),
      timeLabel: formatTimeLabel(openedAt),
      title: actorPhrase(openRecord.openedByName, "opened shop"),
      actorName: openRecord.openedByName,
      branch: activeBranch,
      source: "Today's Operations",
    });
  }

  if (revenueEntry && revenueEntry.sales > 0) {
    const actor =
      revenueEntry.createdBy?.staffName ??
      revenueEntry.staffName ??
      openRecord?.openedByName;
    transactions.push({
      id: "movie-revenue",
      type: "Revenue",
      timestamp: revenueEntry.createdAt,
      sortKey: parseSortKey(revenueEntry.createdAt),
      timeLabel: formatTimeLabel(revenueEntry.createdAt),
      title: "Movie revenue submitted",
      detail: formatCurrency(revenueEntry.sales),
      amount: revenueEntry.sales,
      actorName: actor ?? undefined,
      branch: activeBranch,
      source: "Today's Operations",
    });
  }

  for (const sale of sales) {
    if (
      sale.date !== date ||
      sale.status !== "completed" ||
      !branchCodesReferToSameInventory(sale.branch, activeBranch)
    ) {
      continue;
    }

    const productLabel =
      sale.items.length === 1
        ? `${sale.items[0]?.productName ?? "Product"} sold`
        : `${formatSaleItemsSummary(sale.items)} sold`;

    transactions.push({
      id: `sale-${sale.id}`,
      type: "AccessorySale",
      timestamp: sale.createdAt,
      sortKey: parseSortKey(sale.createdAt),
      timeLabel: formatTimeLabel(sale.createdAt),
      title: productLabel,
      detail: formatCurrency(sale.total),
      amount: sale.total,
      actorName: sale.staffName,
      branch: sale.branch,
      source: "Today's Operations",
    });
  }

  for (const expense of expenses) {
    if (
      expense.date !== date ||
      !branchCodesReferToSameInventory(expense.branch, activeBranch) ||
      expense.staffPaymentId
    ) {
      continue;
    }

    transactions.push({
      id: `expense-${expense.id}`,
      type: "Expense",
      timestamp: expense.createdAt,
      sortKey: parseSortKey(expense.createdAt),
      timeLabel: formatTimeLabel(expense.createdAt),
      title: "Expense added",
      detail: `${expense.categoryName} · ${formatCurrency(expense.amount)}`,
      amount: expense.amount,
      actorName: expense.staffName,
      branch: expense.branch,
      source: expense.notes?.includes("[Late Entry]")
        ? "Late Entry"
        : "Today's Operations",
    });
  }

  for (const purchase of purchases) {
    if (
      purchase.date !== date ||
      !branchCodesReferToSameInventory(purchase.branch, activeBranch)
    ) {
      continue;
    }

    transactions.push({
      id: `purchase-${purchase.id}`,
      type: "Purchase",
      timestamp: purchase.createdAt,
      sortKey: parseSortKey(purchase.createdAt),
      timeLabel: formatTimeLabel(purchase.createdAt),
      title: actorPhrase(purchase.staffName, "recorded Purchase"),
      detail: formatCurrency(purchase.totalCost),
      amount: purchase.totalCost,
      actorName: purchase.staffName,
      branch: purchase.branch,
      source: "Today's Operations",
    });
  }

  for (const payment of payments) {
    if (
      payment.date !== date ||
      !branchCodesReferToSameInventory(payment.branch, activeBranch)
    ) {
      continue;
    }

    transactions.push({
      id: `payment-${payment.id}`,
      type: "StaffPayment",
      timestamp: payment.createdAt,
      sortKey: parseSortKey(payment.createdAt),
      timeLabel: formatTimeLabel(payment.createdAt),
      title: actorPhrase(payment.staffName, "recorded Staff Payment"),
      detail: formatCurrency(payment.amount),
      amount: payment.amount,
      actorName: payment.staffName,
      branch: payment.branch,
      source: "Today's Operations",
    });
  }

  if (closedRecord?.closedAt) {
    transactions.push({
      id: "branch-close",
      type: "BranchClose",
      timestamp: closedRecord.closedAt,
      sortKey: parseSortKey(closedRecord.closedAt),
      timeLabel: formatTimeLabel(closedRecord.closedAt),
      title: actorPhrase(closedRecord.closedByName, "closed the day"),
      actorName: closedRecord.closedByName,
      branch: activeBranch,
      source: "Today's Operations",
    });
  }

  return transactions.sort((left, right) => right.sortKey - left.sortKey);
}

export function buildTodayBusinessTransactions(
  input: Omit<BuildBusinessTransactionsInput, "date">
): BusinessTransaction[] {
  return buildBusinessTransactions({
    ...input,
    date: getTodayISO(),
  });
}
