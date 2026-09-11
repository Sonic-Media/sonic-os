import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { calculateExpenses } from "@/lib/amounts";
import {
  getEffectiveExpenseAmount,
  isStaffPaymentExpense,
} from "@/lib/staff-payments/calculations";
import type { Branch, Entry } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";

function matchesBranch(recordBranch: Branch, branch: Branch): boolean {
  return branchCodesReferToSameInventory(recordBranch, branch);
}

function sumModuleOperatingExpenses(
  expenses: ExpenseRecord[],
  branch: Branch,
  date: string
): { total: number; count: number } {
  const branchExpenses = expenses.filter(
    (expense) =>
      expense.date === date &&
      matchesBranch(expense.branch, branch) &&
      !isStaffPaymentExpense(expense)
  );

  return {
    total: branchExpenses.reduce(
      (sum, expense) => sum + getEffectiveExpenseAmount(expense),
      0
    ),
    count: branchExpenses.length,
  };
}

function sumEntryOperatingExpenses(
  entries: Entry[],
  branch: Branch,
  date: string
): number {
  return entries
    .filter(
      (entry) =>
        entry.date === date &&
        (entry.status === "completed" || entry.status === "draft") &&
        matchesBranch(entry.branch, branch)
    )
    .reduce((sum, entry) => sum + calculateExpenses(entry), 0);
}

/**
 * Dashboard operating expenses for one branch/date.
 *
 * PostgreSQL-backed expense module records are authoritative when any exist
 * for the branch/date. Daily-operation entry expense lines are used only as
 * a legacy fallback (historical imports with no expense module rows).
 */
export function computeDashboardOperatingExpenses(
  branch: Branch,
  date: string,
  expenses: ExpenseRecord[],
  entries: Entry[]
): number {
  const { total, count } = sumModuleOperatingExpenses(expenses, branch, date);

  if (count > 0) {
    return total;
  }

  return sumEntryOperatingExpenses(entries, branch, date);
}

/**
 * Sum per-branch dashboard operating expenses without cross-branch duplication.
 */
export function computeAllBranchesOperatingExpenses(
  branches: Branch[],
  date: string,
  expenses: ExpenseRecord[],
  entries: Entry[]
): number {
  return branches.reduce(
    (sum, branch) =>
      sum + computeDashboardOperatingExpenses(branch, date, expenses, entries),
    0
  );
}
