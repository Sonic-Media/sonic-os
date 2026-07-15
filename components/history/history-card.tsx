"use client";

import Link from "next/link";
import { Card } from "@/components/shared/ui/card";
import {
  calculateExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import { formatEntryDisplayDate } from "@/lib/dates";
import { useSettings } from "@/context/settings-context";
import type { Entry } from "@/types";
import { cn } from "@/lib/utils";

interface HistoryCardProps {
  entry: Entry;
  onDelete: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
}

function NotesIndicator({ hasNotes }: { hasNotes: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        hasNotes
          ? "bg-white/10 text-zinc-300"
          : "bg-zinc-900 text-zinc-600"
      )}
      title={hasNotes ? "Daily notes recorded" : "No daily notes"}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v11.018z"
        />
      </svg>
      Notes
    </span>
  );
}

export function HistoryCard({ entry, onDelete, onDuplicate }: HistoryCardProps) {
  const { getBranchName } = useSettings();
  const expenses = calculateExpenses(entry);
  const netCash = calculateSavingsFromTotals(entry.sales, expenses);
  const isClosed = entry.status === "completed";
  const hasNotes = entry.notes.trim().length > 0;

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this entry? This action cannot be undone."
    );
    if (confirmed) {
      onDelete(entry);
    }
  }

  return (
    <Card className="transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">
            {formatEntryDisplayDate(entry.date)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {getBranchName(entry.branch)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              isClosed
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400"
            )}
          >
            {isClosed ? "Closed" : "Draft"}
          </span>
          <NotesIndicator hasNotes={hasNotes} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sales</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatCurrency(entry.sales)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Expenses
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatCurrency(expenses)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Net Cash
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold",
              netCash >= 0 ? "text-white" : "text-red-400"
            )}
          >
            {formatCurrency(netCash)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-zinc-800/80 pt-3">
        <Link
          href={`/entry/${entry.id}`}
          className="px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          View
        </Link>
        <Link
          href={`/operations/historical?date=${entry.date}&branch=${entry.branch}`}
          className="px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDuplicate(entry)}
          className="px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}
