"use client";

import Link from "next/link";
import { ExpensesEmptyState } from "@/components/expenses/expenses-empty-state";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/shared/ui/button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { formatCurrency } from "@/lib/format";
import { EXPENSES_PLACEHOLDER } from "@/lib/expenses-module/format";
import { isStaffPaymentExpense } from "@/lib/staff-payments/calculations";
import { uiSurface } from "@/lib/ui/design-tokens";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import type { ExpenseRecord } from "@/types/expenses-module";
import { cn } from "@/lib/utils";

interface ExpensesPremiumTableProps {
  expenses: ExpenseRecord[];
  onEdit?: (expense: ExpenseRecord) => void;
  onDelete?: (expense: ExpenseRecord) => void;
}

function formatExpenseTime(expense: ExpenseRecord): string {
  const parsed = new Date(expense.createdAt);
  if (Number.isNaN(parsed.getTime())) return EXPENSES_PLACEHOLDER;

  const dateLabel = new Date(expense.date + "T12:00:00").toLocaleDateString(
    "en-UG",
    {
      month: "short",
      day: "numeric",
    }
  );
  const timeLabel = parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} · ${timeLabel}`;
}

function resolveRecordedBy(
  expense: ExpenseRecord,
  getPaymentByExpenseId: ReturnType<
    typeof useStaffPaymentsModule
  >["getPaymentByExpenseId"],
  getPaymentById: ReturnType<typeof useStaffPaymentsModule>["getPaymentById"]
): string {
  if (isStaffPaymentExpense(expense)) {
    const linkedPayment =
      (expense.staffPaymentId
        ? getPaymentById(expense.staffPaymentId)
        : undefined) ?? getPaymentByExpenseId(expense.id);

    return linkedPayment?.paidBy?.staffName ?? EXPENSES_PLACEHOLDER;
  }

  return expense.createdBy?.staffName ?? EXPENSES_PLACEHOLDER;
}

export function ExpensesPremiumTable({
  expenses,
  onEdit,
  onDelete,
}: ExpensesPremiumTableProps) {
  const { getPaymentByExpenseId, getPaymentById } = useStaffPaymentsModule();
  const pagination = usePaginatedList(expenses);
  const { pageItems } = pagination;
  const showActions = Boolean(onEdit || onDelete);

  if (expenses.length === 0) {
    return (
      <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Expenses</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Operating expenses for the selected period
          </p>
        </div>
        <ExpensesEmptyState message="No expenses match your filters." />
      </section>
    );
  }

  function canModify(expense: ExpenseRecord): boolean {
    return !isStaffPaymentExpense(expense);
  }

  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Expenses</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Operating expenses for the selected period
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Description</th>
              <th className="px-3 py-3 font-medium text-right">Amount</th>
              <th className="px-3 py-3 font-medium">Recorded By</th>
              {showActions ? (
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3.5 text-zinc-400">
                  <Link
                    href={`/expenses/${expense.id}`}
                    className="transition-colors hover:text-white"
                  >
                    {formatExpenseTime(expense)}
                  </Link>
                </td>
                <td className="px-3 py-3.5 text-zinc-400">
                  {expense.categoryName}
                </td>
                <td className="px-3 py-3.5 font-medium text-white">
                  {expense.description}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-white">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-3 py-3.5 text-zinc-400">
                  {resolveRecordedBy(
                    expense,
                    getPaymentByExpenseId,
                    getPaymentById
                  )}
                </td>
                {showActions ? (
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && canModify(expense) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-3"
                          onClick={() => onEdit(expense)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {onDelete && canModify(expense) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(expense)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 lg:hidden">
        {pageItems.map((expense) => (
          <div
            key={expense.id}
            className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/expenses/${expense.id}`}
                  className="font-medium text-white transition-colors hover:text-orange-300"
                >
                  {expense.description}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatExpenseTime(expense)} · {expense.categoryName}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Recorded by{" "}
                  {resolveRecordedBy(
                    expense,
                    getPaymentByExpenseId,
                    getPaymentById
                  )}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-white">
                {formatCurrency(expense.amount)}
              </p>
            </div>
            {showActions && canModify(expense) ? (
              <div className="mt-3 flex justify-end gap-2">
                {onEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3"
                    onClick={() => onEdit(expense)}
                  >
                    Edit
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-red-400 hover:text-red-300"
                    onClick={() => onDelete(expense)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
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
    </section>
  );
}
