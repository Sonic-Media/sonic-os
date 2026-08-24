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
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Expense"
          value={metrics.todaysExpenses ?? 0}
          formatValue={() => formatExpensesCurrency(metrics.todaysExpenses)}
        />
        <StatCard
          label="This Week"
          value={metrics.weekExpenses ?? 0}
          formatValue={() => formatExpensesCurrency(metrics.weekExpenses)}
        />
        <StatCard
          label="This Month"
          value={metrics.monthExpenses ?? 0}
          formatValue={() => formatExpensesCurrency(metrics.monthExpenses)}
        />
        <StatCard
          label="Average Daily"
          value={metrics.averageDailyExpense ?? 0}
          formatValue={() =>
            formatExpensesCurrency(metrics.averageDailyExpense)
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatCard
          label="Highest Category"
          value={0}
          formatValue={() =>
            metrics.highestExpenseCategory ?? EXPENSES_PLACEHOLDER
          }
        />
        <StatCard
          label="Top Categories"
          value={0}
          formatValue={() =>
            metrics.topCategories.length > 0
              ? metrics.topCategories
                  .map((item) => `${item.category} · ${formatExpensesCurrency(item.total)}`)
                  .join("  ·  ")
              : EXPENSES_PLACEHOLDER
          }
          className="lg:col-span-1"
        />
      </div>

      <p className="text-sm text-zinc-500">
        Read-only expense overview. Record today&apos;s expenses in{" "}
        <span className="text-zinc-300">Today&apos;s Operations</span>.
      </p>
    </section>
  );
}
