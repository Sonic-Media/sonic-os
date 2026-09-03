import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { calculateExpenses } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import { computeBranchNetQuantity } from "@/lib/stock/calculations";
import type { Branch } from "@/types";
import type { Entry } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Sale } from "@/types/sales";
import type { StockMovement, StockProduct } from "@/types/stock";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function shiftDateISO(reference: string, days: number): string {
  const copy = new Date(`${reference}T12:00:00`);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

export function getYesterdayISO(today: string): string {
  return shiftDateISO(today, -1);
}

export function getWeekStartISO(reference: string): string {
  const date = new Date(`${reference}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

export function getMonthStartISO(reference: string): string {
  return `${reference.slice(0, 7)}-01`;
}

export function matchesBranch(recordBranch: string, branchCode: string): boolean {
  return branchCodesReferToSameInventory(recordBranch, branchCode);
}

export function filterSalesByDate(
  sales: Sale[],
  date: string,
  branchCode?: string
): Sale[] {
  return sales.filter(
    (sale) =>
      sale.date === date &&
      sale.status === "completed" &&
      (!branchCode || matchesBranch(sale.branch, branchCode))
  );
}

export function sumSaleRevenue(sales: Sale[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

export function sumEntryRevenue(entries: Entry[], date?: string): number {
  return entries
    .filter(
      (entry) =>
        entry.status === "completed" &&
        (!date || entry.date === date)
    )
    .reduce((sum, entry) => sum + entry.sales, 0);
}

export function sumOperatingExpenses(
  expenses: ExpenseRecord[],
  date: string,
  branchCode?: string
): number {
  return expenses
    .filter(
      (expense) =>
        expense.date === date &&
        !expense.staffPaymentId &&
        (!branchCode || matchesBranch(expense.branch, branchCode))
    )
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function sumEntryExpenses(entries: Entry[], date?: string): number {
  return entries
    .filter(
      (entry) =>
        entry.status === "completed" &&
        (!date || entry.date === date)
    )
    .reduce((sum, entry) => sum + calculateExpenses(entry), 0);
}

export function computeTotalRevenue(
  sales: Sale[],
  entries: Entry[],
  date: string,
  branchCode?: string
): number {
  const accessory = sumSaleRevenue(filterSalesByDate(sales, date, branchCode));
  const movie = sumEntryRevenue(
    entries.filter(
      (entry) => !branchCode || matchesBranch(entry.branch, branchCode)
    ),
    date
  );
  return accessory + movie;
}

export function computeBranchRevenue(
  sales: Sale[],
  entries: Entry[],
  date: string,
  branchCode: string
): number {
  return computeTotalRevenue(sales, entries, date, branchCode);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(value: number): string {
  const rounded = Math.round(Math.abs(value));
  return `${rounded}%`;
}

export function hoursSince(isoTimestamp: string | undefined, now = Date.now()): number | null {
  if (!isoTimestamp) return null;
  const parsed = new Date(isoTimestamp).getTime();
  if (Number.isNaN(parsed)) return null;
  return (now - parsed) / (1000 * 60 * 60);
}

export function getBranchProductStock(
  product: StockProduct,
  branchCode: string,
  movements: StockMovement[]
): number {
  return computeBranchNetQuantity(branchCode, product.id, movements);
}

export function findTopStaffBySales(
  sales: Sale[],
  date: string
): { name: string; total: number; branch: string } | null {
  const totals = new Map<string, { name: string; total: number; branch: string }>();

  for (const sale of sales) {
    if (sale.date !== date || sale.status !== "completed") continue;
    const name = sale.staffName?.trim();
    if (!name) continue;

    const key = sale.staffId ?? name.toLowerCase();
    const existing = totals.get(key);
    if (existing) {
      existing.total += sale.total;
    } else {
      totals.set(key, { name, total: sale.total, branch: sale.branch });
    }
  }

  let best: { name: string; total: number; branch: string } | null = null;
  for (const row of totals.values()) {
    if (!best || row.total > best.total) {
      best = row;
    }
  }

  return best;
}

export function pushUniqueInsight(
  target: BIInsight[],
  insight: BIInsight,
  seen: Set<string>
): void {
  if (seen.has(insight.id)) return;
  seen.add(insight.id);
  target.push(insight);
}

export function formatMoney(value: number): string {
  return formatCurrency(value);
}
