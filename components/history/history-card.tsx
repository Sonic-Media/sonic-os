"use client";

import Link from "next/link";
import { EntryStatusBadge } from "@/components/entry/entry-status-badge";
import { Card } from "@/components/shared/ui/card";
import { TotalsField, TotalsGrid } from "@/components/shared/totals-grid";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatEntryDisplayDate } from "@/lib/dates";
import { getBranchName } from "@/lib/entry-helpers";
import type { Entry } from "@/types";

interface HistoryCardProps {
  entry: Entry;
  onDelete: (entry: Entry) => void;
}

export function HistoryCard({ entry, onDelete }: HistoryCardProps) {
  const expenses = calculateExpenses(entry);
  const savings = calculateSavingsFromTotals(entry.sales, expenses);

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this entry? This action cannot be undone."
    );
    if (confirmed) {
      onDelete(entry);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-base font-semibold text-white">
            {formatEntryDisplayDate(entry.date)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{entry.time}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
            {getBranchName(entry.branch)}
          </span>
          <EntryStatusBadge status={entry.status} />
        </div>
      </div>

      <div className="mb-4">
        <TotalsGrid
          sales={entry.sales}
          expenses={expenses}
          savings={savings}
          size="sm"
        />
      </div>

      <div className="space-y-3 mb-4">
        <TotalsField
          label="Staff Name"
          value={entry.staffName.trim() || "—"}
          size="sm"
        />
        <TotalsField
          label="Notes"
          value={entry.notes.trim() || "—"}
          size="sm"
          valueClassName={entry.notes.trim() ? undefined : "text-zinc-500"}
        />
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-zinc-800/80 pt-3">
        <Link
          href={`/entry/${entry.id}`}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          View
        </Link>
        <Link
          href={`/entry/${entry.id}/edit`}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}
