"use client";

import Link from "next/link";
import { ExpensesEmptyState } from "@/components/expenses/expenses-empty-state";
import { TablePagination } from "@/components/shared/table-pagination";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { formatCurrency } from "@/lib/format";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import { isStaffPaymentExpense } from "@/lib/staff-payments/calculations";
import {
  getExpenseRecordSource,
  isLateEntryExpense,
} from "@/lib/transactions/types";
import { getTodayISO } from "@/lib/dates";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
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

function formatRecordedTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ExpenseHistoryTable({
  expenses,
  onEdit,
  onDelete,
}: ExpenseHistoryTableProps) {
  const { getBranchName } = useSettings();
  const { getPaymentByExpenseId, getPaymentById } = useStaffPaymentsModule();
  const pagination = usePaginatedList(expenses);
  const { pageItems } = pagination;
  const showActions = Boolean(onEdit || onDelete);

  if (expenses.length === 0) {
    return <ExpensesEmptyState message="No expenses match your filters." />;
  }

  function resolveStaffLabel(expense: ExpenseRecord): string {
    if (!isStaffPaymentExpense(expense)) {
      return expense.staffName || "—";
    }

    const linkedPayment =
      (expense.staffPaymentId
        ? getPaymentById(expense.staffPaymentId)
        : undefined) ?? getPaymentByExpenseId(expense.id);

    if (linkedPayment) {
      return linkedPayment.staffName;
    }

    return expense.staffName || "—";
  }

  function canModify(expense: ExpenseRecord): boolean {
    return !isStaffPaymentExpense(expense);
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
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Source
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Recorded
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((expense) => (
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
                  {resolveStaffLabel(expense)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  <div className="flex flex-col gap-1">
                    <span>
                      {getExpenseRecordSource({
                        notes: expense.notes,
                        staffPaymentId: expense.staffPaymentId,
                        date: expense.date,
                        createdAt: expense.createdAt,
                        today: getTodayISO(),
                      })}
                    </span>
                    {isLateEntryExpense(expense.notes) ? (
                      <span className="text-xs text-amber-300">Late Entry</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatRecordedTime(expense.createdAt)}
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && canModify(expense) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(expense)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && canModify(expense) && (
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
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPrevious={pagination.goToPreviousPage}
        onNext={pagination.goToNextPage}
      />
    </Card>
  );
}
