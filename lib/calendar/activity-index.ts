import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StaffPayment } from "@/types/staff-payment";
import type { Entry } from "@/types";

export type CalendarBranchFilter = "all" | Branch;

export interface CalendarActivityMarkers {
  sales: boolean;
  expenses: boolean;
  purchases: boolean;
  other: boolean;
}

export interface CalendarActivityDataSources {
  entries: Entry[];
  sales: Sale[];
  expenses: ExpenseRecord[];
  purchases: Purchase[];
  payments: StaffPayment[];
  closings: DayClosingRecord[];
}

function emptyMarkers(): CalendarActivityMarkers {
  return {
    sales: false,
    expenses: false,
    purchases: false,
    other: false,
  };
}

function markDate(
  index: Map<string, CalendarActivityMarkers>,
  date: string,
  patch: Partial<CalendarActivityMarkers>
) {
  const current = index.get(date) ?? emptyMarkers();
  index.set(date, {
    sales: patch.sales ?? current.sales,
    expenses: patch.expenses ?? current.expenses,
    purchases: patch.purchases ?? current.purchases,
    other: patch.other ?? current.other,
  });
}

function matchesBranch(
  recordBranch: Branch,
  branchFilter: CalendarBranchFilter
): boolean {
  if (branchFilter === "all") return true;
  return branchCodesReferToSameInventory(recordBranch, branchFilter);
}

/**
 * Builds a business-date keyed index of activity markers for the calendar UI.
 * All grouping uses record `.date` fields — never createdAt.
 */
export function buildCalendarActivityIndex(
  branchFilter: CalendarBranchFilter,
  data: CalendarActivityDataSources
): Map<string, CalendarActivityMarkers> {
  const index = new Map<string, CalendarActivityMarkers>();

  for (const sale of data.sales) {
    if (sale.status !== "completed") continue;
    if (!matchesBranch(sale.branch, branchFilter)) continue;
    markDate(index, sale.date, { sales: true });
  }

  for (const entry of data.entries) {
    if (!matchesBranch(entry.branch, branchFilter)) continue;
    if (entry.sales > 0) {
      markDate(index, entry.date, { sales: true });
    }
    if (entry.notes?.trim()) {
      markDate(index, entry.date, { other: true });
    } else if (entry.status === "completed" || entry.status === "draft") {
      markDate(index, entry.date, { other: true });
    }
  }

  for (const expense of data.expenses) {
    if (expense.staffPaymentId) continue;
    if (!matchesBranch(expense.branch, branchFilter)) continue;
    markDate(index, expense.date, { expenses: true });
  }

  for (const purchase of data.purchases) {
    if (!matchesBranch(purchase.branch, branchFilter)) continue;
    markDate(index, purchase.date, { purchases: true });
  }

  for (const payment of data.payments) {
    if (!matchesBranch(payment.branch, branchFilter)) continue;
    markDate(index, payment.date, { other: true });
  }

  for (const closing of data.closings) {
    if (!matchesBranch(closing.branch, branchFilter)) continue;
    markDate(index, closing.date, { other: true });
  }

  return index;
}

export function getCalendarActivityMarkers(
  index: Map<string, CalendarActivityMarkers>,
  date: string
): CalendarActivityMarkers {
  return index.get(date) ?? emptyMarkers();
}

export function hasCalendarActivity(markers: CalendarActivityMarkers): boolean {
  return (
    markers.sales ||
    markers.expenses ||
    markers.purchases ||
    markers.other
  );
}
