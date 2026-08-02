"use client";

import Link from "next/link";
import { ExpensesEmptyState } from "@/components/expenses/expenses-empty-state";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { formatCurrency } from "@/lib/format";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import { useSettings } from "@/context/settings-context";
import type { ExpenseRecord } from "@/types/expenses-module";

interface ExpenseHistoryTableProps {
  expenses: ExpenseRecord[];
  onEdit?: (expense: ExpenseRecord) => void;
  onDelete?: (expense: ExpenseRecord) => void;
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

export function ExpenseHistoryTable({
  expenses,
  onEdit,
  onDelete,
}: ExpenseHistoryTableProps) {
  const { getBranchName } = useSettings();
  const showActions = Boolean(onEdit || onDelete);

  if (expenses.length === 0) {
    return <ExpensesEmptyState message="No expenses match your filters." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Date
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Category
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Description
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Amount
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Branch
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Payment Method
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Staff
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 text-zinc-400">
                  <Link
                    href={`/expenses/${expense.id}`}
                    className="transition-colors hover:text-white"
                  >
                    {formatExpenseDate(expense.date)}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {expense.categoryName}
                </td>
                <td className="px-5 py-4 font-medium text-white">
                  {expense.description}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {getBranchName(expense.branch)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {getExpensePaymentMethodLabel(expense.paymentMethod)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {expense.staffName || "—"}
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(expense)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(expense)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
