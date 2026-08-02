import { getTodayISO } from "@/lib/dates";
import {
  STAFF_PAYMENT_CATEGORY_ID,
  isStaffPaymentCategory,
} from "@/lib/expenses-module/constants";
import type { CashFlowDateRange } from "@/types/expenses-module";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { StaffPaymentReportSummary, StaffPaymentSummary } from "@/types/staff-payment";
import type { Staff } from "@/types";

function isDateInRange(date: string, range: CashFlowDateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function isStaffPaymentExpense(expense: ExpenseRecord): boolean {
  return (
    isStaffPaymentCategory(expense.categoryId) ||
    expense.staffPaymentType !== undefined
  );
}

export function getEffectiveStaffPaymentAmount(expense: ExpenseRecord): number {
  if (!isStaffPaymentExpense(expense)) return expense.amount;
  if (expense.staffPaymentType === "deduction") {
    return -Math.abs(expense.amount);
  }
  return Math.abs(expense.amount);
}

export function getEffectiveExpenseAmount(expense: ExpenseRecord): number {
  if (isStaffPaymentExpense(expense)) {
    return getEffectiveStaffPaymentAmount(expense);
  }
  return expense.amount;
}

export function filterStaffPaymentExpenses(
  expenses: ExpenseRecord[]
): ExpenseRecord[] {
  return expenses.filter(isStaffPaymentExpense);
}

export function computeStaffPaymentTotal(
  expenses: ExpenseRecord[],
  range?: CashFlowDateRange
): number {
  return filterStaffPaymentExpenses(expenses)
    .filter((expense) => !range || isDateInRange(expense.date, range))
    .reduce((sum, expense) => sum + getEffectiveStaffPaymentAmount(expense), 0);
}

export function computeStaffPaymentsByBranch(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): { branch: string; total: number }[] {
  const totals = new Map<string, number>();

  for (const expense of filterStaffPaymentExpenses(expenses)) {
    if (!isDateInRange(expense.date, range)) continue;
    totals.set(
      expense.branch,
      (totals.get(expense.branch) ?? 0) +
        getEffectiveStaffPaymentAmount(expense)
    );
  }

  return Array.from(totals.entries())
    .map(([branch, total]) => ({ branch, total }))
    .sort((left, right) => right.total - left.total);
}

export function computeStaffPaymentsByStaff(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): { staffId: string; staffName: string; total: number }[] {
  const totals = new Map<
    string,
    { staffId: string; staffName: string; total: number }
  >();

  for (const expense of filterStaffPaymentExpenses(expenses)) {
    if (!isDateInRange(expense.date, range) || !expense.staffId) continue;

    const existing = totals.get(expense.staffId);
    const delta = getEffectiveStaffPaymentAmount(expense);

    if (existing) {
      existing.total += delta;
      continue;
    }

    totals.set(expense.staffId, {
      staffId: expense.staffId,
      staffName: expense.staffName ?? "Unknown Staff",
      total: delta,
    });
  }

  return Array.from(totals.values()).sort((left, right) =>
    left.staffName.localeCompare(right.staffName)
  );
}

export function computeMonthlyStaffPaymentTotals(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): { month: string; total: number }[] {
  const totals = new Map<string, number>();

  for (const expense of filterStaffPaymentExpenses(expenses)) {
    if (!isDateInRange(expense.date, range)) continue;
    const month = expense.date.slice(0, 7);
    totals.set(
      month,
      (totals.get(month) ?? 0) + getEffectiveStaffPaymentAmount(expense)
    );
  }

  return Array.from(totals.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

export function computeStaffPaymentReportSummary(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): StaffPaymentReportSummary {
  return {
    totalStaffPayments: computeStaffPaymentTotal(expenses, range),
    byBranch: computeStaffPaymentsByBranch(expenses, range),
    byStaff: computeStaffPaymentsByStaff(expenses, range),
    monthlyTotals: computeMonthlyStaffPaymentTotals(expenses, range),
  };
}

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function computeStaffPaymentSummary(
  staffMember: Staff,
  expenses: ExpenseRecord[],
  todayISO: string = getTodayISO()
): StaffPaymentSummary {
  const monthStart = getMonthStartISO();
  const staffPayments = filterStaffPaymentExpenses(expenses).filter(
    (expense) => expense.staffId === staffMember.id
  );

  const paidToday = staffPayments.some(
    (expense) =>
      expense.date === todayISO && expense.staffPaymentType !== "deduction"
  );

  const lastPaymentDate =
    staffPayments
      .map((expense) => expense.date)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  const monthTotal = staffPayments
    .filter((expense) => expense.date >= monthStart)
    .reduce((sum, expense) => sum + getEffectiveStaffPaymentAmount(expense), 0);

  return {
    staffId: staffMember.id,
    staffName: staffMember.name,
    branch: staffMember.branch,
    role: staffMember.role,
    paidToday,
    lastPaymentDate,
    monthTotal,
  };
}

export function getStaffPaymentHistory(
  staffId: string,
  expenses: ExpenseRecord[]
): ExpenseRecord[] {
  return filterStaffPaymentExpenses(expenses)
    .filter((expense) => expense.staffId === staffId)
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) return dateCompare;
      return right.createdAt.localeCompare(left.createdAt);
    });
}
