"use client";

import Link from "next/link";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { TotalsField, TotalsGrid } from "@/components/shared/totals-grid";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import { getBranchName } from "@/lib/entry-helpers";
import type { Entry } from "@/types";
import { cn } from "@/lib/utils";

interface EntryDetailCardProps {
  entry: Entry;
}

export function EntryDetailCard({ entry }: EntryDetailCardProps) {
  const expenses = calculateExpenses(entry);
  const savings = calculateSavingsFromTotals(entry.sales, expenses);

  return (
    <>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">
            {getBranchName(entry.branch)}
          </h2>
          <EntryStatusBadge status={entry.status} />
        </div>

        <TotalsGrid sales={entry.sales} expenses={expenses} savings={savings} />

        <div className="space-y-4 border-t border-zinc-800/80 pt-4 mt-6">
          <TotalsField
            label="Staff Name"
            value={entry.staffName.trim() || "—"}
            valueClassName={entry.staffName.trim() ? undefined : "text-zinc-500 font-medium"}
          />
          <TotalsField
            label="Notes"
            value={entry.notes.trim() || "—"}
            valueClassName={entry.notes.trim() ? undefined : "text-zinc-500 font-medium"}
          />
        </div>
      </Card>

      {entry.expenses.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
            Expenses
          </h2>
          <div className="space-y-2">
            {entry.expenses.map((expense) => (
              <Card key={expense.id} className="flex items-center justify-between py-3">
                <p className="text-sm font-medium text-white">{expense.name}</p>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(expense.amount)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button href={`/entry/${entry.id}/edit`} variant="secondary">
          Edit Entry
        </Button>
        <Link
          href="/history"
          className={cn(
            "inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl",
            "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all duration-200"
          )}
        >
          Back to History
        </Link>
      </div>
    </>
  );
}
