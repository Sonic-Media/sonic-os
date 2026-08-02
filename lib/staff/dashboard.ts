import { getTodayISO } from "@/lib/dates";
import { getAuthAuditRecords } from "@/lib/auth-storage";
import { getStaffAuditRecords } from "@/lib/staff/audit";
import {
  getExpenseActorId,
  getPurchaseActorId,
  getSaleActorId,
} from "@/lib/staff/session";
import {
  computeStaffPaymentSummary,
  isStaffPaymentExpense,
} from "@/lib/staff-payments/calculations";
import type { AuthAuditRecord } from "@/types/auth";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { Staff } from "@/types";
import type { StaffAuditRecord } from "@/types/staff-audit";
import type { StaffPaymentRecord, StaffTodayStatus } from "@/types/staff-payment";

export interface StaffActivityItem {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  branch: string;
  detail?: string;
}

function isToday(timestamp: string, todayISO: string): boolean {
  return timestamp.slice(0, 10) === todayISO;
}

function buildActivityFeed(
  staffId: string,
  userId: string | undefined,
  auditRecords: StaffAuditRecord[],
  sales: Sale[],
  expenses: ExpenseRecord[],
  purchases: Purchase[],
  authAudit: AuthAuditRecord[],
  payments: StaffPaymentRecord[] = []
): StaffActivityItem[] {
  const items: StaffActivityItem[] = [];

  for (const record of auditRecords) {
    if (record.staffId !== staffId) continue;
    items.push({
      id: record.id,
      timestamp: record.timestamp,
      action: record.action,
      module: record.module,
      branch: record.branch,
      detail: record.detail,
    });
  }

  for (const sale of sales) {
    if (getSaleActorId(sale) !== staffId) continue;
    items.push({
      id: `sale-${sale.id}`,
      timestamp: sale.createdAt,
      action: "Sale",
      module: "sales",
      branch: sale.branch,
      detail: `${sale.invoiceNumber} · ${sale.total}`,
    });
  }

  for (const expense of expenses) {
    if (expense.staffPaymentId) continue;

    const actorId = getExpenseActorId(expense);
    const isPayee =
      expense.staffPaymentType && expense.staffId === staffId;
    if (actorId !== staffId && !isPayee) continue;
    items.push({
      id: `expense-${expense.id}`,
      timestamp: expense.createdAt,
      action: expense.staffPaymentType ? "Staff Payment" : "Expense",
      module: "expenses",
      branch: expense.branch,
      detail: expense.description,
    });
  }

  for (const payment of payments) {
    if (payment.staffId !== staffId) continue;
    items.push({
      id: `payment-${payment.id}`,
      timestamp: payment.createdAt,
      action: "Staff Payment",
      module: "staff",
      branch: payment.branch,
      detail: payment.notes,
    });
  }

  for (const purchase of purchases) {
    if (getPurchaseActorId(purchase) !== staffId) continue;
    items.push({
      id: `purchase-${purchase.id}`,
      timestamp: purchase.createdAt,
      action: "Purchase",
      module: "purchasing",
      branch: purchase.branch,
      detail: purchase.invoiceNumber,
    });
  }

  if (userId) {
    for (const record of authAudit) {
      if (record.userId !== userId) continue;
      items.push({
        id: `auth-${record.id}`,
        timestamp: record.timestamp,
        action: record.action === "login" ? "Login" : record.action === "logout" ? "Logout" : record.action,
        module: "auth",
        branch: record.branch,
        detail: record.detail,
      });
    }
  }

  return items.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function computeStaffTodayStatus(
  member: Staff,
  expenses: ExpenseRecord[],
  sales: Sale[],
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords(),
  authAudit: AuthAuditRecord[] = getAuthAuditRecords(),
  todayISO: string = getTodayISO(),
  payments: StaffPaymentRecord[] = []
): StaffTodayStatus {
  const paymentSummary = computeStaffPaymentSummary(
    member,
    payments,
    todayISO
  );

  const loggedInToday =
    !!member.userId &&
    authAudit.some(
      (record) =>
        record.userId === member.userId &&
        record.action === "login" &&
        isToday(record.timestamp, todayISO)
    );

  const todaySales = sales.filter(
    (sale) => getSaleActorId(sale) === member.id && sale.date === todayISO
  );

  const activity = buildActivityFeed(
    member.id,
    member.userId,
    auditRecords,
    sales,
    expenses,
    [],
    authAudit,
    payments
  );

  const lastActivity = activity[0] ?? null;

  return {
    ...paymentSummary,
    status: member.status,
    username: member.username,
    phone: member.phone,
    loggedInToday,
    todaySalesTotal: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    todaySalesCount: todaySales.length,
    lastActivityAt: lastActivity?.timestamp ?? null,
    lastActivityLabel: lastActivity?.action ?? null,
  };
}

export function getStaffActivityForProfile(
  member: Staff,
  sales: Sale[],
  expenses: ExpenseRecord[],
  purchases: Purchase[],
  payments: StaffPaymentRecord[] = []
): StaffActivityItem[] {
  return buildActivityFeed(
    member.id,
    member.userId,
    getStaffAuditRecords(),
    sales,
    expenses,
    purchases,
    getAuthAuditRecords(),
    payments
  );
}

export function getStaffLoginHistory(
  member: Staff,
  authAudit: AuthAuditRecord[] = getAuthAuditRecords()
): AuthAuditRecord[] {
  if (!member.userId) return [];

  return authAudit
    .filter(
      (record) =>
        record.userId === member.userId &&
        (record.action === "login" || record.action === "logout")
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function getStaffSales(member: Staff, sales: Sale[]): Sale[] {
  return sales
    .filter((sale) => getSaleActorId(sale) === member.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getStaffExpenses(
  member: Staff,
  expenses: ExpenseRecord[]
): ExpenseRecord[] {
  return expenses
    .filter(
      (expense) =>
        !isStaffPaymentExpense(expense) &&
        getExpenseActorId(expense) === member.id
    )
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) return dateCompare;
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export function getStaffInventoryActions(member: Staff): StaffAuditRecord[] {
  return getStaffAuditRecords()
    .filter(
      (record) =>
        record.staffId === member.id &&
        record.module === "stock" &&
        (record.action === "Inventory Adjustment" ||
          record.action === "Product Created" ||
          record.action === "Product Edited")
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function getStaffPurchases(member: Staff, purchases: Purchase[]): Purchase[] {
  return purchases
    .filter((purchase) => getPurchaseActorId(purchase) === member.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
