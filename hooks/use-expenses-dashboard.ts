import { useExpensesModule } from "@/context/expenses-module-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useMemo } from "react";
import { computeExpensesDashboardMetrics } from "@/lib/expenses-module/calculations";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";

export function useExpensesDashboard() {
  const { expenses } = useExpensesModule();
  const { activeBranch } = useActiveBranch();

  const metrics = useMemo(() => {
    const branchExpenses = filterByBranchField(expenses, activeBranch);
    return computeExpensesDashboardMetrics(branchExpenses, getTodayISO());
  }, [expenses, activeBranch]);

  return { metrics };
}
