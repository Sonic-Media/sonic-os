"use client";

import { useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSettings } from "@/context/settings-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getDateRangeForPeriod } from "@/lib/expenses-module/calculations";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import { getEffectiveExpenseAmount } from "@/lib/staff-payments/calculations";
import type { Branch } from "@/types";
import type {
  CashFlowDateRange,
  ExpenseCategory,
  ExpenseRecord,
} from "@/types/expenses-module";

export type ExpensesPageDateFilter = "today" | "week" | "month" | "custom";

export interface ExpensesPageKpis {
  totalExpenses: number;
  numberOfExpenses: number;
  largestExpense: number | null;
  averageExpense: number | null;
}

function filterByDateRange(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): ExpenseRecord[] {
  return expenses.filter(
    (expense) => expense.date >= range.start && expense.date <= range.end
  );
}

function filterBySearch(
  expenses: ExpenseRecord[],
  search: string,
  branchNames: Record<Branch, string>
): ExpenseRecord[] {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return expenses;

  return expenses.filter((expense) => {
    const branchLabel = branchNames[expense.branch] ?? expense.branch;

    return (
      expense.description.toLowerCase().includes(normalizedSearch) ||
      expense.categoryName.toLowerCase().includes(normalizedSearch) ||
      branchLabel.toLowerCase().includes(normalizedSearch) ||
      getExpensePaymentMethodLabel(expense.paymentMethod)
        .toLowerCase()
        .includes(normalizedSearch) ||
      (expense.staffName?.toLowerCase().includes(normalizedSearch) ?? false) ||
      (expense.createdBy?.staffName
        ?.toLowerCase()
        .includes(normalizedSearch) ??
        false) ||
      (expense.notes?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });
}

function computeKpis(expenses: ExpenseRecord[]): ExpensesPageKpis {
  if (expenses.length === 0) {
    return {
      totalExpenses: 0,
      numberOfExpenses: 0,
      largestExpense: null,
      averageExpense: null,
    };
  }

  const amounts = expenses.map((expense) => getEffectiveExpenseAmount(expense));
  const totalExpenses = amounts.reduce((sum, amount) => sum + amount, 0);

  return {
    totalExpenses,
    numberOfExpenses: expenses.length,
    largestExpense: Math.max(...amounts),
    averageExpense: totalExpenses / expenses.length,
  };
}

function sortExpenses(expenses: ExpenseRecord[]): ExpenseRecord[] {
  return [...expenses].sort((left, right) => {
    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) return createdAtCompare;
    return right.date.localeCompare(left.date);
  });
}

export function useExpensesPage() {
  const { expenses, categories, isLoaded } = useExpensesModule();
  const { settings } = useSettings();
  const { activeBranch } = useActiveBranch();
  const [dateFilter, setDateFilter] = useState<ExpensesPageDateFilter>("month");
  const [customRange, setCustomRange] = useState<CashFlowDateRange>(() =>
    getDateRangeForPeriod("month")
  );
  const [search, setSearch] = useState("");

  const branchExpenses = useMemo(
    () => filterByBranchField(expenses, activeBranch),
    [expenses, activeBranch]
  );

  const dateRange = useMemo(() => {
    if (dateFilter === "custom") return customRange;
    return getDateRangeForPeriod(dateFilter);
  }, [dateFilter, customRange]);

  const filteredExpenses = useMemo(() => {
    const inRange = filterByDateRange(branchExpenses, dateRange);
    const searched = filterBySearch(
      inRange,
      search,
      settings.branchNames
    );
    return sortExpenses(searched);
  }, [branchExpenses, dateRange, search, settings.branchNames]);

  const kpis = useMemo(
    () => computeKpis(filteredExpenses),
    [filteredExpenses]
  );

  function updateCustomRange(patch: Partial<CashFlowDateRange>) {
    setCustomRange((current) => ({ ...current, ...patch }));
  }

  return {
    isLoaded,
    categories: categories as ExpenseCategory[],
    filteredExpenses,
    kpis,
    dateFilter,
    setDateFilter,
    customRange,
    updateCustomRange,
    search,
    setSearch,
  };
}
