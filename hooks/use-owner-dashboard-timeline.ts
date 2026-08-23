"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import { findMostRecentEntryForDate } from "@/lib/entry-helpers";
import { formatCurrency } from "@/lib/format";

export type TimelineEventStatus = "completed" | "pending";

export interface TimelineEvent {
  id: string;
  time: string;
  sortKey: number;
  title: string;
  detail?: string;
  status: TimelineEventStatus;
}

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

function parseSortKey(iso?: string | null, fallback = Number.MAX_SAFE_INTEGER): number {
  if (!iso) return fallback;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function actorPhrase(name?: string | null, action?: string): string {
  if (!name) return action ?? "Activity recorded";
  return `${name} ${action ?? "recorded activity"}`;
}

export function useOwnerDashboardTimeline() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { entries } = useEntriesContext();
  const { sales } = useSales();
  const { expenses } = useExpensesModule();
  const { payments } = useStaffPaymentsModule();
  const { purchases } = usePurchasing();
  const {
    getOpenRecord,
    getClosedRecord,
    isBranchDayClosed,
    isBranchDayOpened,
  } = useDayClosing();

  return useMemo(() => {
    const events: TimelineEvent[] = [];
    const openRecord = getOpenRecord(activeBranch, today);
    const closedRecord = getClosedRecord(activeBranch, today);
    const branchEntries = filterByBranchField(entries, activeBranch);
    const draftEntry = findMostRecentEntryForDate(
      branchEntries,
      today,
      "draft",
      activeBranch
    );
    const completedEntry = findMostRecentEntryForDate(
      branchEntries,
      today,
      "completed",
      activeBranch
    );
    const revenueEntry = completedEntry ?? draftEntry;

    if (openRecord?.openedAt || openRecord?.reopenedAt) {
      const openedAt = openRecord.openedAt ?? openRecord.reopenedAt;
      events.push({
        id: "shop-opened",
        time: formatTimeLabel(openedAt),
        sortKey: parseSortKey(openedAt, 0),
        title: actorPhrase(openRecord.openedByName, "opened the branch"),
        status: "completed",
      });
    }

    if (revenueEntry && revenueEntry.sales > 0) {
      const actor =
        revenueEntry.createdBy?.staffName ??
        revenueEntry.staffName ??
        openRecord?.openedByName;
      events.push({
        id: "movie-revenue",
        time: formatTimeLabel(revenueEntry.createdAt),
        sortKey: parseSortKey(revenueEntry.createdAt),
        title: actorPhrase(actor, "recorded Movie Revenue"),
        detail: formatCurrency(revenueEntry.sales),
        status: "completed",
      });
    }

    for (const sale of sales) {
      if (
        sale.date !== today ||
        sale.status !== "completed" ||
        !branchCodesReferToSameInventory(sale.branch, activeBranch)
      ) {
        continue;
      }

      events.push({
        id: `sale-${sale.id}`,
        time: formatTimeLabel(sale.createdAt),
        sortKey: parseSortKey(sale.createdAt),
        title: actorPhrase(sale.staffName, "recorded Accessory Sale"),
        detail: formatCurrency(sale.total),
        status: "completed",
      });
    }

    for (const expense of expenses) {
      if (
        expense.date !== today ||
        !branchCodesReferToSameInventory(expense.branch, activeBranch)
      ) {
        continue;
      }

      events.push({
        id: `expense-${expense.id}`,
        time: formatTimeLabel(expense.createdAt),
        sortKey: parseSortKey(expense.createdAt),
        title: actorPhrase(expense.staffName, "recorded Expense"),
        detail: `${expense.categoryName} · ${formatCurrency(expense.amount)}`,
        status: "completed",
      });
    }

    for (const purchase of purchases) {
      if (
        purchase.date !== today ||
        !branchCodesReferToSameInventory(purchase.branch, activeBranch)
      ) {
        continue;
      }

      events.push({
        id: `purchase-${purchase.id}`,
        time: formatTimeLabel(purchase.createdAt),
        sortKey: parseSortKey(purchase.createdAt),
        title: actorPhrase(purchase.staffName, "recorded Purchase"),
        detail: formatCurrency(purchase.totalCost),
        status: "completed",
      });
    }

    for (const payment of payments) {
      if (
        payment.date === today &&
        branchCodesReferToSameInventory(payment.branch, activeBranch)
      ) {
        events.push({
          id: `payment-${payment.id}`,
          time: formatTimeLabel(payment.createdAt),
          sortKey: parseSortKey(payment.createdAt),
          title: actorPhrase(payment.staffName, "recorded Staff Payment"),
          detail: formatCurrency(payment.amount),
          status: "completed",
        });
      }
    }

    if (closedRecord?.closedAt) {
      events.push({
        id: "day-closed",
        time: formatTimeLabel(closedRecord.closedAt),
        sortKey: parseSortKey(closedRecord.closedAt),
        title: actorPhrase(closedRecord.closedByName, "closed the day"),
        status: "completed",
      });
    } else if (isBranchDayOpened(activeBranch, today)) {
      events.push({
        id: "close-day-pending",
        time: "Pending",
        sortKey: Number.MAX_SAFE_INTEGER,
        title: "Close Day",
        detail: "Finish today's operations when the branch is ready.",
        status: "pending",
      });
    }

    const completedEvents = events
      .filter((event) => event.status === "completed")
      .sort((left, right) => right.sortKey - left.sortKey);
    const pendingEvents = events.filter((event) => event.status === "pending");

    return {
      events: [...completedEvents, ...pendingEvents],
      hasActivity: completedEvents.length > 0,
      isDayClosed: isBranchDayClosed(activeBranch, today),
    };
  }, [
    activeBranch,
    entries,
    expenses,
    getClosedRecord,
    getOpenRecord,
    isBranchDayClosed,
    isBranchDayOpened,
    payments,
    purchases,
    sales,
    today,
  ]);
}
