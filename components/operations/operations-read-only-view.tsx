"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { AccessorySalesSection } from "@/components/operations/accessory-sales-section";
import { OperationsClosingPanel } from "@/components/operations/operations-closing-panel";
import { formatEntryDisplayDate } from "@/lib/dates";
import { calculateOperatingExpenses } from "@/lib/amounts";
import { isPayrollEntryExpense } from "@/lib/expenses";
import { getEntryActorName } from "@/lib/staff/session";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useSales } from "@/context/sales-context";
import { computeStaffPayoutTotalForBranchDate } from "@/lib/staff-payments/calculations";
import { useSettings } from "@/context/settings-context";
import type { Entry } from "@/types";

interface OperationsReadOnlyViewProps {
  entry: Entry;
}

export function OperationsReadOnlyView({ entry }: OperationsReadOnlyViewProps) {
  const { getBranchName } = useSettings();
  const { payments } = useStaffPaymentsModule();
  const { sales } = useSales();
  const totalExpenses = calculateOperatingExpenses(entry);
  const operatingExpenses = entry.expenses.filter(
    (expense) => !isPayrollEntryExpense(expense)
  );
  const accessorySales = useMemo(
    () =>
      sales
        .filter(
          (sale) =>
            sale.date === entry.date &&
            sale.branch === entry.branch &&
            sale.status === "completed"
        )
        .reduce((sum, sale) => sum + sale.total, 0),
    [sales, entry.date, entry.branch]
  );
  const staffPayouts = useMemo(
    () =>
      computeStaffPayoutTotalForBranchDate(
        payments,
        entry.branch,
        entry.date
      ),
    [payments, entry.branch, entry.date]
  );
  const movieRevenue = entry.sales;
  const netCash =
    movieRevenue + accessorySales - totalExpenses - staffPayouts;
  const allocation = entry.savingsAllocation ?? netCash;

  const staffName = getEntryActorName(entry);

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

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Expenses
        </h3>
        <div className="space-y-2">
          {operatingExpenses.map((expense) => (
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

      <OperationsClosingPanel
        form={{
          date: entry.date,
          branch: entry.branch,
          sales: String(movieRevenue),
          expenses: entry.expenses,
          staffId: entry.staffId ?? "",
          notes: entry.notes,
          savingsAllocation: String(allocation),
        }}
        movieRevenue={movieRevenue}
        accessorySales={accessorySales}
        totalExpenses={totalExpenses}
        staffPayouts={staffPayouts}
        netCash={netCash}
        readOnly
        updateField={() => undefined}
      />

      {entry.notes.trim() ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm font-medium text-zinc-500">Daily Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {entry.notes}
          </p>
        </div>
      ) : null}

      {staffName ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-sm text-zinc-500">Staff</p>
          <p className="text-base font-medium text-white">{staffName}</p>
        </div>
      ) : null}
    </div>
  );
}
