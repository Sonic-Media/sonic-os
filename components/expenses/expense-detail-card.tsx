"use client";

import { Card } from "@/components/shared/ui/card";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import { getExpensePaymentMethodLabel } from "@/lib/expenses-module/constants";
import { EXPENSES_PLACEHOLDER } from "@/lib/expenses-module/format";
import { useSettings } from "@/context/settings-context";
import type { ExpenseRecord } from "@/types/expenses-module";

interface ExpenseDetailCardProps {
  expense: ExpenseRecord;
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

export function ExpenseDetailCard({ expense }: ExpenseDetailCardProps) {
  const { getBranchName } = useSettings();

  return (
    <Card>
      <h2 className="mb-6 text-lg font-semibold text-white">
        {expense.description}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TotalsField label="Date" value={formatExpenseDate(expense.date)} />
        <TotalsField label="Category" value={expense.categoryName} />
        <TotalsField
          label="Amount"
          value={formatCurrency(expense.amount)}
          size="lg"
        />
        <TotalsField
          label="Payment Method"
          value={getExpensePaymentMethodLabel(expense.paymentMethod)}
        />
        <TotalsField
          label="Branch"
          value={getBranchName(expense.branch)}
        />
        <TotalsField
          label="Staff"
          value={expense.staffName || EXPENSES_PLACEHOLDER}
          valueClassName={
            expense.staffName ? undefined : "text-zinc-500 font-medium"
          }
        />
        <TotalsField
          label="Notes"
          value={expense.notes || EXPENSES_PLACEHOLDER}
          valueClassName={
            expense.notes ? undefined : "text-zinc-500 font-medium"
          }
        />
      </div>
    </Card>
  );
}
