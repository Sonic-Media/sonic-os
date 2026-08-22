import { calculateExpenses } from "@/lib/amounts";
import {
  computeTodayPurchaseCostByBranch,
  computeTodayRevenueByBranch,
} from "@/lib/branch/calculations";
import { getActiveStaffForBranch } from "@/lib/staff-storage";
import {
  getEffectivePaymentAmount,
  isStaffPaymentExpense,
} from "@/lib/staff-payments/calculations";
import { getTodayISO } from "@/lib/dates";
import type { BranchEntity } from "@/types/branch";
import type { Branch, Entry, Staff } from "@/types";
import type {
  CashReconciliationStatus,
  DayClosingMetrics,
  DayClosingStaffPayout,
  DayClosingSummary,
} from "@/types/day-closing";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { StaffPaymentRecord } from "@/types/staff-payment";

function computeTodayOperatingExpenses(
  branchCode: string,
  expenses: ExpenseRecord[],
  entries: Entry[],
  today: string
): number {
  const moduleExpenses = expenses
    .filter(
      (expense) =>
        expense.date === today &&
        expense.branch === branchCode &&
        !isStaffPaymentExpense(expense)
    )
    .reduce((sum, expense) => sum + expense.amount, 0);

  const entryExpenses = entries
    .filter(
      (entry) =>
        entry.date === today &&
        (entry.status === "completed" || entry.status === "draft") &&
        entry.branch === branchCode
    )
    .reduce((sum, entry) => sum + calculateExpenses(entry), 0);

  return moduleExpenses + entryExpenses;
}

function computeTodayStaffPaymentsRecorded(
  branchCode: string,
  payments: StaffPaymentRecord[],
  today: string
): number {
  return payments
    .filter(
      (payment) =>
        payment.date === today &&
        payment.branch === branchCode &&
        payment.paymentType !== "deduction"
    )
    .reduce((sum, payment) => sum + getEffectivePaymentAmount(payment), 0);
}

export function computeDayClosingMetrics(
  branch: BranchEntity,
  sales: import("@/types/sales").Sale[],
  purchases: import("@/types/purchasing").Purchase[],
  expenses: ExpenseRecord[],
  entries: Entry[],
  payments: StaffPaymentRecord[],
  today = getTodayISO()
): DayClosingMetrics {
  const todaySales = computeTodayRevenueByBranch(branch, sales, entries, today);
  const todayPurchases = computeTodayPurchaseCostByBranch(
    branch,
    purchases,
    today
  );
  const todayOperatingExpenses = computeTodayOperatingExpenses(
    branch.code,
    expenses,
    entries,
    today
  );
  const todayInventoryInvestment = todayPurchases;
  const todayStaffPaymentsRecorded = computeTodayStaffPaymentsRecorded(
    branch.code,
    payments,
    today
  );
  const cashBeforeClosing =
    todaySales -
    todayOperatingExpenses -
    todayInventoryInvestment -
    todayStaffPaymentsRecorded;

  return {
    todaySales,
    todayPurchases,
    todayOperatingExpenses,
    todayInventoryInvestment,
    todayStaffPaymentsRecorded,
    cashBeforeClosing,
  };
}

export function buildStaffPayoutRows(
  staff: Staff[],
  branch: Branch,
  payments: StaffPaymentRecord[],
  today = getTodayISO()
): DayClosingStaffPayout[] {
  return getActiveStaffForBranch(staff, branch).map((member) => {
    const paidToday = payments.some(
      (payment) =>
        payment.staffId === member.id &&
        payment.date === today &&
        payment.paymentType !== "deduction"
    );
    const dailyWage = member.dailyWage ?? 0;

    return {
      staffId: member.id,
      staffName: member.name,
      role: member.role,
      dailyWage,
      paidToday,
      selected: !paidToday && dailyWage > 0,
      amount: dailyWage,
      notes: "",
    };
  });
}

export function computeSelectedPayoutTotal(
  payouts: DayClosingStaffPayout[]
): number {
  return payouts
    .filter((payout) => payout.selected && payout.amount > 0)
    .reduce((sum, payout) => sum + payout.amount, 0);
}

export function computeExpectedCash(
  cashBeforeClosing: number,
  payouts: DayClosingStaffPayout[]
): number {
  return cashBeforeClosing - computeSelectedPayoutTotal(payouts);
}

export function computeCashDifference(
  expectedCash: number,
  actualCashCounted: number
): number {
  return actualCashCounted - expectedCash;
}

export function resolveCashStatus(
  difference: number
): CashReconciliationStatus {
  if (difference === 0) return "balanced";
  if (difference < 0) return "short";
  return "over";
}

export function computeDayClosingSummary(
  metrics: DayClosingMetrics,
  payouts: DayClosingStaffPayout[],
  actualCashCounted: number
): DayClosingSummary {
  const newPayoutTotal = computeSelectedPayoutTotal(payouts);
  const staffPayments = metrics.todayStaffPaymentsRecorded + newPayoutTotal;
  const remainingCash = actualCashCounted;
  const inventoryFund = metrics.todayInventoryInvestment;
  const operatingFund = Math.max(0, remainingCash - inventoryFund);

  return {
    sales: metrics.todaySales,
    expenses: metrics.todayOperatingExpenses,
    inventoryInvestment: metrics.todayInventoryInvestment,
    staffPayments,
    remainingCash,
    inventoryFund,
    operatingFund,
  };
}
