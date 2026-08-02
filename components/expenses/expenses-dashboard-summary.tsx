import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatExpensesCurrency,
  EXPENSES_PLACEHOLDER,
} from "@/lib/expenses-module/format";
import type { ExpensesDashboardMetrics } from "@/types/expenses-module";

interface ExpensesDashboardSummaryProps {
  metrics: ExpensesDashboardMetrics;
}

export function ExpensesDashboardSummary({
  metrics,
}: ExpensesDashboardSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2">
      <StatCard
        label="Today's Expenses"
        value={metrics.todaysExpenses ?? 0}
        formatValue={() => formatExpensesCurrency(metrics.todaysExpenses)}
      />
      <StatCard
        label="This Month Expenses"
        value={metrics.monthExpenses ?? 0}
        formatValue={() => formatExpensesCurrency(metrics.monthExpenses)}
      />
      <StatCard
        label="Highest Expense Category"
        value={0}
        formatValue={() =>
          metrics.highestExpenseCategory ?? EXPENSES_PLACEHOLDER
        }
        className="sm:col-span-2"
      />
      <StatCard
        label="Average Daily Expense"
        value={metrics.averageDailyExpense ?? 0}
        formatValue={() =>
          formatExpensesCurrency(metrics.averageDailyExpense)
        }
        className="sm:col-span-2"
      />
    </section>
  );
}
