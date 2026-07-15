"use client";

import { formatCurrency } from "@/lib/format";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { CashSummary } from "@/components/operations/cash-summary";
import { formatEntryDisplayDate } from "@/lib/dates";
import { calculateExpenses } from "@/lib/amounts";
import { useSettings } from "@/context/settings-context";
import type { Entry } from "@/types";

interface OperationsReadOnlyViewProps {
  entry: Entry;
}

export function OperationsReadOnlyView({ entry }: OperationsReadOnlyViewProps) {
  const { getBranchName } = useSettings();
  const totalExpenses = calculateExpenses(entry);
  const netCash = entry.sales - totalExpenses;
  const allocation = entry.savingsAllocation ?? netCash;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Date</p>
          <p className="text-base font-semibold text-white">
            {formatEntryDisplayDate(entry.date)}
          </p>
        </div>
        <EntryStatusBadge status={entry.status} />
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-500">Branch</p>
        <p className="text-base font-medium text-white">
          {getBranchName(entry.branch)}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-500">Sales</p>
        <p className="text-2xl font-semibold text-white">
          {formatCurrency(entry.sales)}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Expenses
        </h3>
        <div className="space-y-2">
          {entry.expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
            >
              <span className="text-sm text-zinc-300">{expense.name}</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CashSummary
        sales={entry.sales}
        totalExpenses={totalExpenses}
        netCash={netCash}
        savingsAllocation={String(allocation)}
        readOnly
      />

      {entry.notes.trim() ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm font-medium text-zinc-500">Daily Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {entry.notes}
          </p>
        </div>
      ) : null}

      {entry.staffName ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm text-zinc-500">Staff</p>
          <p className="text-base font-medium text-white">{entry.staffName}</p>
        </div>
      ) : null}
    </div>
  );
}
