import { getTodayISO } from "@/lib/dates";
import { getStaffAuditRecords } from "@/lib/staff/audit";
import {
  getExpenseActorId,
  getExpenseActorName,
  getPurchaseActorId,
  getPurchaseActorName,
  getSaleActorId,
  getSaleActorName,
} from "@/lib/staff/session";
import {
  computeStaffPaymentTotal,
  computeStaffPaymentsByStaff,
  isStaffPaymentExpense,
} from "@/lib/staff-payments/calculations";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { Staff } from "@/types";
import type { StaffPaymentRecord, StaffReportsData } from "@/types/staff-payment";

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function computeStaffReports(
  staff: Staff[],
  expenses: ExpenseRecord[],
  sales: Sale[],
  purchases: Purchase[],
  payments: StaffPaymentRecord[] = []
): StaffReportsData {
  const monthStart = getMonthStartISO();
  const monthEnd = getTodayISO();
  const monthRange = { start: monthStart, end: monthEnd };

  const totalPaidThisMonth = computeStaffPaymentTotal(payments, monthRange);

  const paidByStaff = computeStaffPaymentsByStaff(payments, monthRange);
  const highestPaid = paidByStaff.sort((left, right) => right.total - left.total)[0] ?? null;

  const actionCounts = new Map<string, { staffId: string; staffName: string; actionCount: number }>();
  for (const record of getStaffAuditRecords()) {
    const existing = actionCounts.get(record.staffId);
    if (existing) {
      existing.actionCount += 1;
      continue;
    }
    actionCounts.set(record.staffId, {
      staffId: record.staffId,
      staffName: record.staffName,
      actionCount: 1,
    });
  }

  const mostActiveEmployee =
    Array.from(actionCounts.values()).sort(
      (left, right) => right.actionCount - left.actionCount
    )[0] ?? null;

  const salesByEmployeeMap = new Map<
    string,
    { staffId: string; staffName: string; total: number; count: number }
  >();
  for (const sale of sales) {
    const actorId = getSaleActorId(sale);
    if (!actorId) continue;
    const existing = salesByEmployeeMap.get(actorId);
    if (existing) {
      existing.total += sale.total;
      existing.count += 1;
      continue;
    }
    salesByEmployeeMap.set(actorId, {
      staffId: actorId,
      staffName: getSaleActorName(sale) ?? "Unknown Staff",
      total: sale.total,
      count: 1,
    });
  }

  const expensesRecordedMap = new Map<
    string,
    { staffId: string; staffName: string; count: number; total: number }
  >();
  for (const expense of expenses) {
    if (isStaffPaymentExpense(expense)) continue;
    const actorId = getExpenseActorId(expense);
    if (!actorId) continue;
    const existing = expensesRecordedMap.get(actorId);
    if (existing) {
      existing.count += 1;
      existing.total += expense.amount;
      continue;
    }
    expensesRecordedMap.set(actorId, {
      staffId: actorId,
      staffName: getExpenseActorName(expense) ?? "Unknown Staff",
      count: 1,
      total: expense.amount,
    });
  }

  const purchasesRecordedMap = new Map<
    string,
    { staffId: string; staffName: string; count: number; total: number }
  >();
  for (const purchase of purchases) {
    const actorId = getPurchaseActorId(purchase);
    if (!actorId) continue;
    const existing = purchasesRecordedMap.get(actorId);
    if (existing) {
      existing.count += 1;
      existing.total += purchase.totalCost;
      continue;
    }
    purchasesRecordedMap.set(actorId, {
      staffId: actorId,
      staffName: getPurchaseActorName(purchase) ?? "Unknown Staff",
      count: 1,
      total: purchase.totalCost,
    });
  }

  const inventoryAdjustmentsMap = new Map<
    string,
    { staffId: string; staffName: string; count: number }
  >();
  for (const record of getStaffAuditRecords()) {
    if (
      record.module !== "stock" ||
      record.action !== "Inventory Adjustment"
    ) {
      continue;
    }
    const existing = inventoryAdjustmentsMap.get(record.staffId);
    if (existing) {
      existing.count += 1;
      continue;
    }
    inventoryAdjustmentsMap.set(record.staffId, {
      staffId: record.staffId,
      staffName: record.staffName,
      count: 1,
    });
  }

  return {
    totalPaidThisMonth,
    highestPaid,
    mostActiveEmployee,
    salesByEmployee: Array.from(salesByEmployeeMap.values()).sort(
      (left, right) => right.total - left.total
    ),
    expensesRecorded: Array.from(expensesRecordedMap.values()).sort(
      (left, right) => right.total - left.total
    ),
    purchasesRecorded: Array.from(purchasesRecordedMap.values()).sort(
      (left, right) => left.staffName.localeCompare(right.staffName)
    ),
    inventoryAdjustments: Array.from(inventoryAdjustmentsMap.values()).sort(
      (left, right) => right.count - left.count
    ),
  };
}

export function getStaffNameLookup(staff: Staff[]): Map<string, string> {
  return new Map(staff.map((member) => [member.id, member.name]));
}
