"use client";

import { useMemo, useState } from "react";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useSettings } from "@/context/settings-context";
import { useActiveBranch } from "@/context/active-branch-context";
import {
  applyExpenseFilters,
  createDefaultExpenseFilterCriteria,
} from "@/lib/expenses-module/filters";
import { filterByBranchField } from "@/lib/active-branch/filters";
import type { ExpenseFilterCriteria } from "@/types/expenses-module";

export function useExpensesHistory() {
  const { expenses } = useExpensesModule();
  const { settings } = useSettings();
  const { activeBranch } = useActiveBranch();
  const [criteria, setCriteria] = useState<ExpenseFilterCriteria>(
    createDefaultExpenseFilterCriteria
  );

  const filteredExpenses = useMemo(() => {
    const branchExpenses = filterByBranchField(expenses, activeBranch);
    return applyExpenseFilters(
      branchExpenses,
      criteria,
      settings.branchNames
    );
  }, [expenses, activeBranch, criteria, settings.branchNames]);

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
