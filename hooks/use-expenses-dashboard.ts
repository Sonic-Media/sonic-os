import { useExpensesModule } from "@/context/expenses-module-context";

export function useExpensesDashboard() {
  const { metrics } = useExpensesModule();
  return { metrics };
}
