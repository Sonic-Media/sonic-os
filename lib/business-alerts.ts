import { getAuthAuditRecords } from "@/lib/auth-storage";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import {
  computeBranchNetQuantity,
  computeProductStatus,
} from "@/lib/stock/calculations";
import { getEffectiveExpenseAmount } from "@/lib/staff-payments/calculations";
import type { Branch } from "@/types";
import type { AuthAuditRecord } from "@/types/auth";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Customer, Sale } from "@/types/sales";
import type { Staff } from "@/types";
import type { StockMovement, StockProduct } from "@/types/stock";

export type AlertTone = "critical" | "warning" | "info";

export type AlertFilterTab = "all" | "critical" | "warning" | "info";

export interface AlertAction {
  label: string;
  href: string;
}

export interface BusinessAlert {
  id: string;
  tone: AlertTone;
  title: string;
  description: string;
  timestamp: string;
  priority: number;
  action?: AlertAction;
}

export interface DisplayAlert extends BusinessAlert {
  isRead: boolean;
}

const CREDIT_NOTE_PATTERN =
  /\b(credit|balance|owe|owed|due|pay later|outstanding)\b/i;
const UNPAID_PURCHASE_PATTERN =
  /\b(awaiting payment|unpaid|pending payment|payment due|\[unpaid\])\b/i;

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`).getTime();
  const end = new Date(`${endDate}T12:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function pushAlert(alerts: BusinessAlert[], alert: BusinessAlert): void {
  alerts.push(alert);
}

function getBranchProducts(
  products: StockProduct[],
  movements: StockMovement[],
  branch: Branch
): StockProduct[] {
  return products.map((product) => {
    const currentStock = computeBranchNetQuantity(branch, product.id, movements);
    return {
      ...product,
      currentStock,
      status: computeProductStatus(currentStock, product.minimumStockLevel),
    };
  });
}

function isCreditSale(sale: Sale): boolean {
  if (sale.paymentMethod === "other") return true;
  if (sale.notes && CREDIT_NOTE_PATTERN.test(sale.notes)) return true;
  return false;
}

function isUnpaidPurchase(purchase: Purchase): boolean {
  return Boolean(purchase.notes && UNPAID_PURCHASE_PATTERN.test(purchase.notes));
}

export function generateBusinessAlerts(options: {
  activeBranch: Branch;
  branchName: string;
  products: StockProduct[];
  movements: StockMovement[];
  sales: Sale[];
  customers: Customer[];
  purchases: Purchase[];
  expenses: ExpenseRecord[];
  staff: Staff[];
  authAudit?: AuthAuditRecord[];
  today?: string;
}): BusinessAlert[] {
  const today = options.today ?? getTodayISO();
  const alerts: BusinessAlert[] = [];
  const branchProducts = getBranchProducts(
    options.products,
    options.movements,
    options.activeBranch
  );
  const branchSales = filterByBranchField(options.sales, options.activeBranch).filter(
    (sale) => sale.status === "completed"
  );
  const branchPurchases = filterByBranchField(
    options.purchases,
    options.activeBranch
  );
  const branchExpenses = filterByBranchField(
    options.expenses,
    options.activeBranch
  );
  const branchStaff = options.staff.filter(
    (member) => member.branch === options.activeBranch
  );

  for (const product of branchProducts) {
    if (product.status === "out-of-stock") {
      pushAlert(alerts, {
        id: `out-of-stock-${options.activeBranch}-${product.id}`,
        tone: "critical",
        title: "Out of stock",
        description: `${product.name} has no stock left at ${options.branchName}.`,
        timestamp: product.updatedAt,
        priority: 100,
        action: {
          label: "View Product",
          href: `/stock/products/${product.id}`,
        },
      });
      continue;
    }

    if (product.status === "low-stock") {
      pushAlert(alerts, {
        id: `low-stock-${options.activeBranch}-${product.id}`,
        tone: "warning",
        title: "Low stock",
        description: `${product.name} is down to ${product.currentStock} units (min ${product.minimumStockLevel}).`,
        timestamp: product.updatedAt,
        priority: 90,
        action: {
          label: "View Product",
          href: `/stock/products/${product.id}`,
        },
      });
    }
  }

  for (const sale of branchSales.filter((item) => item.profit < 0)) {
    pushAlert(alerts, {
      id: `negative-profit-${sale.id}`,
      tone: "critical",
      title: "Negative profit sale",
      description: `${sale.invoiceNumber} recorded ${formatCurrency(sale.profit)} profit on ${sale.date}.`,
      timestamp: sale.createdAt,
      priority: 95,
      action: {
        label: "View Sales",
        href: "/sales/history",
      },
    });
  }

  const customerLookup = new Map(
    options.customers.map((customer) => [customer.id, customer])
  );
  const overdueByCustomer = new Map<
    string,
    { name: string; total: number; oldestDate: string }
  >();

  for (const sale of branchSales) {
    if (!sale.customerId || !isCreditSale(sale)) continue;
    if (daysBetween(sale.date, today) < 7) continue;

    const existing = overdueByCustomer.get(sale.customerId);
    if (existing) {
      existing.total += sale.total;
      if (sale.date < existing.oldestDate) {
        existing.oldestDate = sale.date;
      }
      continue;
    }

    overdueByCustomer.set(sale.customerId, {
      name:
        sale.customerName ??
        customerLookup.get(sale.customerId)?.name ??
        "Customer",
      total: sale.total,
      oldestDate: sale.date,
    });
  }

  for (const [customerId, summary] of overdueByCustomer.entries()) {
    pushAlert(alerts, {
      id: `customer-overdue-${customerId}`,
      tone: "warning",
      title: "Customer balance overdue",
      description: `${summary.name} owes ${formatCurrency(summary.total)} from sales since ${summary.oldestDate}.`,
      timestamp: `${summary.oldestDate}T12:00:00.000Z`,
      priority: 88,
      action: {
        label: "View Customers",
        href: "/sales/customers",
      },
    });
  }

  for (const purchase of branchPurchases.filter(isUnpaidPurchase)) {
    pushAlert(alerts, {
      id: `purchase-unpaid-${purchase.id}`,
      tone: "warning",
      title: "Purchase awaiting payment",
      description: `${purchase.invoiceNumber} to ${purchase.supplierName} (${formatCurrency(purchase.totalCost)}) is marked unpaid.`,
      timestamp: purchase.createdAt,
      priority: 86,
      action: {
        label: "View Purchase",
        href: `/purchasing/${purchase.id}`,
      },
    });
  }

  const todayExpenses = branchExpenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + getEffectiveExpenseAmount(expense), 0);

  const recentDates = Array.from(
    new Set(
      branchExpenses
        .filter((expense) => expense.date < today)
        .map((expense) => expense.date)
    )
  )
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 7);

  const averageDailyExpense =
    recentDates.length > 0
      ? recentDates.reduce((sum, date) => {
          const dayTotal = branchExpenses
            .filter((expense) => expense.date === date)
            .reduce(
              (total, expense) => total + getEffectiveExpenseAmount(expense),
              0
            );
          return sum + dayTotal;
        }, 0) / recentDates.length
      : 0;

  const highExpenseThreshold = Math.max(averageDailyExpense * 1.5, 250_000);
  if (todayExpenses >= highExpenseThreshold && todayExpenses > 0) {
    pushAlert(alerts, {
      id: `high-expense-${options.activeBranch}-${today}`,
      tone: todayExpenses >= highExpenseThreshold * 1.5 ? "critical" : "warning",
      title: "High expense day",
      description: `${options.branchName} has recorded ${formatCurrency(todayExpenses)} in expenses today.`,
      timestamp: new Date().toISOString(),
      priority: 84,
      action: {
        label: "View Expenses",
        href: "/expenses/history",
      },
    });
  }

  for (const member of branchStaff.filter((item) => item.status === "inactive")) {
    pushAlert(alerts, {
      id: `staff-inactive-${member.id}`,
      tone: "info",
      title: "Staff inactive",
      description: `${member.name} is marked inactive at ${options.branchName}.`,
      timestamp: member.dateJoined ?? today,
      priority: 40,
      action: {
        label: "View Staff",
        href: `/staff/${member.id}`,
      },
    });
  }

  const auditRecords = options.authAudit ?? getAuthAuditRecords();
  const failedAttempts = auditRecords.filter((record) => {
    if (record.action !== "login-failed") return false;
    return daysBetween(record.timestamp.slice(0, 10), today) <= 1;
  });

  if (failedAttempts.length > 0) {
    const latest = failedAttempts[0];
    pushAlert(alerts, {
      id: `failed-login-${today}-${failedAttempts.length}`,
      tone: failedAttempts.length >= 3 ? "critical" : "warning",
      title: "Failed login attempts",
      description:
        failedAttempts.length === 1
          ? `Failed login for ${latest.username} at ${options.branchName}.`
          : `${failedAttempts.length} failed login attempts detected in the last 24 hours.`,
      timestamp: latest.timestamp,
      priority: failedAttempts.length >= 3 ? 98 : 82,
      action: {
        label: "View Audit Log",
        href: "/settings/audit-log",
      },
    });
  }

  return alerts.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });
}

export function applyAlertPreferences(
  alerts: BusinessAlert[],
  preferences: { readIds: string[]; dismissedIds: string[] }
): DisplayAlert[] {
  return alerts
    .filter((alert) => !preferences.dismissedIds.includes(alert.id))
    .map((alert) => ({
      ...alert,
      isRead: preferences.readIds.includes(alert.id),
    }))
    .sort((left, right) => {
      if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
      if (right.priority !== left.priority) return right.priority - left.priority;
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
}

export function filterAlertsByTab(
  alerts: DisplayAlert[],
  tab: AlertFilterTab
): DisplayAlert[] {
  if (tab === "all") return alerts;
  return alerts.filter((alert) => alert.tone === tab);
}

export function getUnreadAlertCount(alerts: DisplayAlert[]): number {
  return alerts.filter((alert) => !alert.isRead).length;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function getAlertEmoji(tone: AlertTone): string {
  if (tone === "critical") return "🔴";
  if (tone === "warning") return "🟡";
  return "🔵";
}
