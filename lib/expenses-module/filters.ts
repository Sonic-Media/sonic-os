import { getTodayISO } from "@/lib/dates";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import type { ExpenseFilterCriteria, ExpenseRecord } from "@/types/expenses-module";
import type { Branch } from "@/types";

export function createDefaultExpenseFilterCriteria(): ExpenseFilterCriteria {
  return {
    search: "",
    date: "all",
    category: "all",
    branch: "all",
    paymentMethod: "all",
  };
}

function getWeekStartISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function matchesDateFilter(
  expense: ExpenseRecord,
  filter: ExpenseFilterCriteria["date"]
): boolean {
  if (filter === "all") return true;
  if (filter === "today") return expense.date === getTodayISO();
  if (filter === "week") return expense.date >= getWeekStartISO();
  if (filter === "month") return expense.date >= getMonthStartISO();
  return true;
}

export function applyExpenseFilters(
  expenses: ExpenseRecord[],
  criteria: ExpenseFilterCriteria,
  branchNames: Record<Branch, string>
): ExpenseRecord[] {
  const normalizedSearch = criteria.search.trim().toLowerCase();

  return expenses.filter((expense) => {
    if (!matchesDateFilter(expense, criteria.date)) return false;

    if (
      criteria.category !== "all" &&
      expense.categoryId !== criteria.category
    ) {
      return false;
    }

    if (criteria.branch !== "all" && expense.branch !== criteria.branch) {
      return false;
    }

    if (
      criteria.paymentMethod !== "all" &&
      expense.paymentMethod !== criteria.paymentMethod
    ) {
      return false;
    }

    if (!normalizedSearch) return true;

    const branchLabel = branchNames[expense.branch] ?? expense.branch;

    return (
      expense.description.toLowerCase().includes(normalizedSearch) ||
      expense.categoryName.toLowerCase().includes(normalizedSearch) ||
      branchLabel.toLowerCase().includes(normalizedSearch) ||
      getExpensePaymentMethodLabel(expense.paymentMethod)
        .toLowerCase()
        .includes(normalizedSearch) ||
      (expense.staffName?.toLowerCase().includes(normalizedSearch) ?? false) ||
      (expense.notes?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });
}
