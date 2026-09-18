import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatCurrency } from "@/lib/format";
import {
  getServiceRevenueLabel,
  type StaffServiceId,
} from "@/lib/staff-home/services";
import { parseServiceSalesFromNotes } from "@/lib/staff-home/service-sales";
import type { Branch, Entry } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { Sale } from "@/types/sales";

export type StaffHomeActivityKind =
  | StaffServiceId
  | "expense"
  | "shop-open"
  | "shop-close"
  | "generic";

export interface StaffHomeActivityItem {
  id: string;
  sortKey: number;
  time: string;
  title: string;
  amount?: number;
  amountLabel?: string;
  kind: StaffHomeActivityKind;
  actorName?: string;
}

function parseSortKey(iso?: string | null, fallback = 0): number {
  if (!iso) return fallback;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function formatTimeLabel(iso?: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function buildStaffHomeActivity(input: {
  branch: Branch;
  date: string;
  sales: Sale[];
  movieRevenue: number;
  movieTime?: string;
  movieSortKey?: number;
  entryNotes?: string | null;
  openRecord?: DayClosingRecord | null;
  expenseItems?: Array<{
    id: string;
    amount: number;
    name: string;
    sortKey?: number;
  }>;
  limit?: number;
}): StaffHomeActivityItem[] {
  const rows: StaffHomeActivityItem[] = [];
  const limit = input.limit ?? 8;

  if (input.openRecord?.openedAt || input.openRecord?.reopenedAt) {
    const openedAt = input.openRecord.openedAt ?? input.openRecord.reopenedAt;
    rows.push({
      id: "shop-open",
      sortKey: parseSortKey(openedAt),
      time: formatTimeLabel(openedAt),
      title: input.openRecord.openedByName
        ? `Opened by ${input.openRecord.openedByName}`
        : "Shop opened",
      kind: "shop-open",
      actorName: input.openRecord.openedByName,
    });
  }

  if (input.movieRevenue > 0) {
    rows.push({
      id: "movie-revenue",
      sortKey: input.movieSortKey ?? 0,
      time: input.movieTime || formatTimeLabel(
        input.movieSortKey ? new Date(input.movieSortKey).toISOString() : null,
        "—"
      ),
      title: "Movie revenue updated",
      amount: input.movieRevenue,
      amountLabel: formatCurrency(input.movieRevenue),
      kind: "movies",
    });
  }

  for (const sale of filterByBranchField(input.sales, input.branch)) {
    if (sale.date !== input.date || sale.status !== "completed") continue;
    const productName = sale.items[0]?.productName ?? "Accessory sale";
    rows.push({
      id: `sale-${sale.id}`,
      sortKey: parseSortKey(sale.createdAt),
      time: sale.time || formatTimeLabel(sale.createdAt),
      title: productName.toLowerCase().includes("sale")
        ? productName
        : `Accessory sale`,
      amount: sale.total,
      amountLabel: formatCurrency(sale.total),
      kind: "accessories",
      actorName: sale.staffName,
    });
  }

  const { sales: serviceSales } = parseServiceSalesFromNotes(input.entryNotes);
  for (const sale of serviceSales) {
    rows.push({
      id: `service-${sale.id}`,
      sortKey: parseSortKey(sale.createdAt),
      time: sale.time || formatTimeLabel(sale.createdAt),
      title: sale.description?.trim()
        ? sale.description.trim()
        : getServiceRevenueLabel(sale.category),
      amount: sale.amount,
      amountLabel: formatCurrency(sale.amount),
      kind: sale.category,
      actorName: sale.staffName,
    });
  }

  for (const expense of input.expenseItems ?? []) {
    if (expense.amount <= 0) continue;
    rows.push({
      id: `expense-${expense.id}`,
      sortKey: expense.sortKey ?? 0,
      time: "—",
      title: "Expense added",
      amount: expense.amount,
      amountLabel: formatCurrency(expense.amount),
      kind: "expense",
    });
  }

  return rows.sort((a, b) => b.sortKey - a.sortKey).slice(0, limit);
}

export function activityKindFromEntry(
  _entry?: Entry | null
): StaffHomeActivityKind {
  return "generic";
}
