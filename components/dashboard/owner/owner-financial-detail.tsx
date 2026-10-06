"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import {
  correctClosedDayExpenseApi,
  fetchFinancialDetail,
} from "@/lib/api/financial-corrections";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import type {
  FinancialCorrectionRecord,
  FinancialDetailLine,
  FinancialDetailResponse,
} from "@/types/financial-correction";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LineDetail({
  line,
  canCorrect,
  onCorrect,
}: {
  line: FinancialDetailLine;
  canCorrect: boolean;
  onCorrect: (line: FinancialDetailLine) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{line.description}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatTimestamp(line.timestamp)}
            {line.staffName ? ` · Recorded by ${line.staffName}` : ""}
            {` · ${line.branchName}`}
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-white">
          {formatCurrency(line.amount)}
        </p>
      </div>
      {canCorrect &&
      (line.sourceType === "expense_record" ||
        line.sourceType === "daily_operation_expense") ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          onClick={() => onCorrect(line)}
        >
          Correct closed-day amount
        </button>
      ) : null}
    </div>
  );
}

function CorrectionHistory({ items }: { items: FinancialCorrectionRecord[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Correction history
      </p>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2 text-xs text-zinc-400"
        >
          <p className="text-zinc-300">
            {item.originalDescription ?? "Record"}: {formatCurrency(item.originalAmount ?? 0)} →{" "}
            {formatCurrency(item.newAmount ?? 0)}
          </p>
          <p className="mt-1">
            {item.actorName} · {formatTimestamp(item.createdAt)} · {item.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

export function OwnerFinancialDetail() {
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { isBranchDayClosed } = useDayClosing();
  const date = getTodayISO();
  const isOwner = session?.role === "owner";
  const closed = isBranchDayClosed(activeBranch, date);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<FinancialDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<FinancialDetailLine | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isOwner) return;
    try {
      const next = await fetchFinancialDetail({ branch: activeBranch, date });
      setDetail(next);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load financial detail.");
    }
  }, [activeBranch, date, isOwner]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [load, open]);

  if (!isOwner) return null;

  async function handleCorrect() {
    if (!selectedLine) return;
    const parsedAmount = Number.parseInt(amount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !reason.trim()) {
      setError("Enter a positive amount and a correction reason.");
      return;
    }
    setSaving(true);
    try {
      await correctClosedDayExpenseApi({
        sourceType: selectedLine.sourceType as "expense_record" | "daily_operation_expense",
        sourceId: selectedLine.id,
        amount: parsedAmount,
        reason: reason.trim(),
      });
      setSelectedLine(null);
      setAmount("");
      setReason("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Correction failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OwnerCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <OwnerSectionTitle>Financial detail</OwnerSectionTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Totals first. Drill into income, expenditure, and staff attribution.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide detail" : "Inspect totals"}
        </Button>
      </div>

      {detail ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Total revenue</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatCurrency(detail.totals.totalRevenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Total expenditure</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatCurrency(detail.totals.totalExpenditure)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Net</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatCurrency(detail.totals.net)}
            </p>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 space-y-5">
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {detail ? (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Income
                </p>
                <div className="mt-2 space-y-2">
                  {detail.incomeBySource.map((group) => (
                    <details key={group.source} className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-white">
                        {group.source} · {formatCurrency(group.amount)}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {group.lines.map((line) => (
                          <LineDetail
                            key={line.id}
                            line={line}
                            canCorrect={false}
                            onCorrect={setSelectedLine}
                          />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Expenditure
                </p>
                <div className="mt-2 space-y-2">
                  {detail.expenditureByCategory.map((group) => (
                    <details key={group.category} className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-white">
                        {group.category} · {formatCurrency(group.amount)}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {group.lines.map((line) => (
                          <LineDetail
                            key={line.id}
                            line={line}
                            canCorrect={closed}
                            onCorrect={setSelectedLine}
                          />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Staff expenditure
                </p>
                <div className="mt-2 space-y-2">
                  {detail.expenditureByStaff.map((group) => (
                    <details key={group.staffName} className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-white">
                        {group.staffName} · {formatCurrency(group.total)}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {group.lines.map((line) => (
                          <LineDetail
                            key={line.id}
                            line={line}
                            canCorrect={closed}
                            onCorrect={setSelectedLine}
                          />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <CorrectionHistory items={detail.corrections} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Loading financial detail…</p>
          )}
        </div>
      ) : null}

      {selectedLine ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <p className="text-sm font-medium text-white">
            Correct {selectedLine.description}
          </p>
          <Input
            label="New amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Textarea
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setSelectedLine(null)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void handleCorrect()}>
              Save correction
            </Button>
          </div>
        </div>
      ) : null}
    </OwnerCard>
  );
}
