"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEntryDisplayDate } from "@/lib/dates";
import type {
  BusinessTransaction,
  BusinessTransactionType,
} from "@/lib/transactions/types";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import {
  previewBusinessDayWipeApi,
  wipeBusinessDayApi,
} from "@/lib/api/financial-corrections";
import type { BusinessDayWipePreview } from "@/types/financial-correction";
import type { Branch } from "@/types";

interface CalendarDayDetailProps {
  date: string;
  transactions: BusinessTransaction[];
  isOwner?: boolean;
  branch?: Branch;
  branchName?: string;
}

const typeAccent: Partial<Record<BusinessTransactionType, string>> = {
  AccessorySale: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  Revenue: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  Expense: "border-red-500/25 bg-red-500/10 text-red-400",
  Purchase: "border-violet-500/25 bg-violet-500/10 text-violet-400",
  StaffPayment: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  BranchOpen: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  BranchClose: "border-blue-500/25 bg-blue-500/10 text-blue-400",
};

function resolveAccent(type: BusinessTransactionType): string {
  return (
    typeAccent[type] ??
    "border-blue-500/25 bg-blue-500/10 text-blue-400"
  );
}

export function CalendarDayDetail({
  date,
  transactions,
  isOwner = false,
  branch,
  branchName,
}: CalendarDayDetailProps) {
  const [wipeOpen, setWipeOpen] = useState(false);
  const [preview, setPreview] = useState<BusinessDayWipePreview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wiping, setWiping] = useState(false);

  async function openWipe() {
    if (!branch) return;
    setWipeError(null);
    try {
      const next = await previewBusinessDayWipeApi({ branch, date });
      setPreview(next);
      setWipeOpen(true);
    } catch (error) {
      setWipeError(error instanceof Error ? error.message : "Could not load wipe preview.");
    }
  }

  async function confirmWipe() {
    if (!branch || !preview) return;
    setWiping(true);
    setWipeError(null);
    try {
      await wipeBusinessDayApi({
        branch,
        date,
        confirmation,
      });
      setWipeOpen(false);
      setConfirmation("");
      window.location.reload();
    } catch (error) {
      setWipeError(error instanceof Error ? error.message : "Wipe failed.");
    } finally {
      setWiping(false);
    }
  }

  return (
    <aside className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">
          {formatEntryDisplayDate(date)}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Business activity recorded on this date
        </p>
        <Link
          href={`/operations/historical?date=${date}`}
          className="mt-3 inline-flex text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Open operations for this date
        </Link>
        {isOwner && branch ? (
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => void openWipe()}>
              Wipe business day
            </Button>
          </div>
        ) : null}
        {wipeError && !wipeOpen ? (
          <p className="mt-2 text-xs text-red-400">{wipeError}</p>
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No business activity recorded for this date.
        </div>
      ) : (
        <div className="max-h-[520px] space-y-0 overflow-y-auto p-4">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {index < transactions.length - 1 ? (
                <span className="absolute left-[13px] top-6 h-[calc(100%-0.5rem)] w-px bg-white/[0.06]" />
              ) : null}

              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  resolveAccent(transaction.type)
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {transaction.title}
                  </p>
                  <p className="text-xs tabular-nums text-zinc-500">
                    {transaction.timeLabel}
                  </p>
                </div>
                {transaction.detail ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {transaction.detail}
                  </p>
                ) : null}
                {transaction.amount !== undefined ? (
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
                    {formatCurrency(transaction.amount)}
                  </p>
                ) : null}
                {transaction.actorName ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Recorded by {transaction.actorName}
                  </p>
                ) : null}
                {transaction.source ? (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    {transaction.source}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {wipeOpen && preview ? (
        <div className="border-t border-red-500/20 bg-red-500/[0.06] px-5 py-4">
          <p className="text-sm font-semibold text-white">WIPE BUSINESS DAY</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            This will remove the operational records for {branchName ?? preview.branchName}{" "}
            {formatEntryDisplayDate(date)}. This cannot be undone.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Type {preview.confirmationPhrase} to confirm.
          </p>
          <Input
            className="mt-2"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {wipeError ? <p className="mt-2 text-xs text-red-400">{wipeError}</p> : null}
          <div className="mt-3 flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setWipeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={wiping}
              disabled={confirmation !== preview.confirmationPhrase}
              onClick={() => void confirmWipe()}
              className="bg-red-600 hover:bg-red-500"
            >
              Wipe this day
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
