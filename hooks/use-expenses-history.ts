"use client";

import { useMemo, useState } from "react";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSettings } from "@/context/settings-context";
import {
  applyExpenseFilters,
  createDefaultExpenseFilterCriteria,
} from "@/lib/expenses-module/filters";
import type { ExpenseFilterCriteria } from "@/types/expenses-module";

export function useExpensesHistory() {
  const { expenses } = useExpensesModule();
  const { settings } = useSettings();
  const [criteria, setCriteria] = useState<ExpenseFilterCriteria>(
    createDefaultExpenseFilterCriteria
  );

  const filteredExpenses = useMemo(
    () =>
      applyExpenseFilters(expenses, criteria, settings.branchNames),
    [expenses, criteria, settings.branchNames]
  );

  function updateCriteria(patch: Partial<ExpenseFilterCriteria>) {
    setCriteria((current) => ({ ...current, ...patch }));
  }

  return {
    criteria,
    expenses: filteredExpenses,
    allExpenses: expenses,
    updateCriteria,
  };
}
