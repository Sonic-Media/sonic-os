import { ExpensesEmptyState } from "@/components/expenses/expenses-empty-state";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import type { ExpenseRecord } from "@/types/expenses-module";

interface OwnerRecentExpensesProps {
  expenses: ExpenseRecord[];
  getBranchName: (code: string) => string;
}

function formatExpenseDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function OwnerRecentExpenses({
  expenses,
  getBranchName,
}: OwnerRecentExpensesProps) {
  const recentExpenses = [...expenses]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Recent Expenses
      </h2>

      {recentExpenses.length === 0 ? (
        <ExpensesEmptyState message="No expenses recorded yet." />
      ) : (
        <div className="space-y-2">
          {recentExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {expense.categoryName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatExpenseDate(expense.date)}
                  {expense.description ? ` · ${expense.description}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {getBranchName(expense.branch)}
                  {expense.staffName ? ` · ${expense.staffName}` : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(expense.amount)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getExpensePaymentMethodLabel(expense.paymentMethod)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
