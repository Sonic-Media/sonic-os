"use client";

import { useEffect, useState } from "react";
import { CloseDayConfirmDialog } from "@/components/operations/staff/close-day-confirm-dialog";
import { Button } from "@/components/shared/ui/button";
import { Textarea } from "@/components/shared/ui/textarea";
import { useToast } from "@/context/toast-context";
import type { SubmitRequestResult } from "@/hooks/use-entry-form";
import { parseAmount, validateMoneyInput } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import { uiSpacing, uiSurface, uiTypography } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { EntryFormData } from "@/types";

interface StaffEndOfDayCardProps {
  form: EntryFormData;
  branchName: string;
  businessDate: string;
  movieRevenue: number;
  accessorySales: number;
  totalExpenses: number;
  staffPayouts: number;
  cashToHandIn: number;
  wageRecorded: boolean;
  shopOpen: boolean;
  closeRequestPending?: boolean;
  dayClosed?: boolean;
  isClosing: boolean;
  isSavingMovieRevenue?: boolean;
  movieRevenueError?: string | null;
  closeError?: string | null;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  onSaveMovieRevenue: (amount: string) => Promise<SubmitRequestResult>;
  onCloseDay: () => Promise<boolean>;
}

function ChecklistItem({
  label,
  status,
  complete,
}: {
  label: string;
  status: string;
  complete?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3.5">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          complete
            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
            : "bg-zinc-800/80 text-zinc-500 ring-1 ring-white/[0.06]"
        )}
        aria-hidden
      >
        {complete ? "✓" : "·"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-sm",
            complete ? "text-emerald-400/90" : "text-zinc-500"
          )}
        >
          {status}
        </p>
      </div>
    </div>
  );
}

function CloseDayErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3.5"
    >
      <p className="text-sm leading-relaxed text-red-300">{message}</p>
    </div>
  );
}

function ClosingRequestSentBanner() {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.08] px-4 py-4">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-200">
        Closing Request Sent
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-indigo-300/90">
        Your operations have been submitted for review. The business day will remain
        open until approved.
      </p>
    </div>
  );
}

export function StaffEndOfDayCard({
  form,
  branchName,
  businessDate,
  movieRevenue,
  accessorySales,
  totalExpenses,
  staffPayouts,
  cashToHandIn,
  wageRecorded,
  shopOpen,
  closeRequestPending = false,
  dayClosed = false,
  isClosing,
  isSavingMovieRevenue = false,
  movieRevenueError,
  closeError,
  updateField,
  onSaveMovieRevenue,
  onCloseDay,
}: StaffEndOfDayCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(form.sales);
  const [localError, setLocalError] = useState<string | null>(null);
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    setAmountInput(form.sales);
  }, [form.sales]);

  const totalSales = movieRevenue + accessorySales;
  const movieRevenueEntered = form.sales.trim() !== "";
  const accessorySalesRecorded = accessorySales > 0;
  const expensesRecorded = totalExpenses > 0;
  const readyToClose = shopOpen && !closeRequestPending && !dayClosed;
  const canRecordMovieRevenue = shopOpen && !dayClosed && !closeRequestPending;

  async function handleSaveMovieRevenue() {
    setLocalError(null);

    const validation = validateMoneyInput(amountInput, {
      fieldLabel: "Movie revenue",
      allowZero: true,
    });

    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    const normalizedAmount = String(validation.amount);
    updateField("sales", normalizedAmount);
    const result = await onSaveMovieRevenue(normalizedAmount);
    if (!result.success) {
      setLocalError(result.error ?? "Could not save movie revenue.");
      return;
    }

    toastSuccess(
      movieRevenueEntered ? "Movie revenue updated." : "Movie revenue recorded."
    );
  }

  function handleOpenConfirm() {
    if (isClosing || closeRequestPending || dayClosed) return;
    setConfirmOpen(true);
  }

  async function handleConfirmClose() {
    const success = await onCloseDay();
    if (success) {
      setConfirmOpen(false);
    }
  }

  const displayMovieRevenueError = localError ?? movieRevenueError;

  return (
    <>
      <section
        className={cn(
          uiSurface.cardElevated,
          uiSpacing.cardPaddingLg,
          "shadow-[0_24px_80px_-48px_rgba(99,102,241,0.35)]"
        )}
      >
        <header className="space-y-1">
          <p className={uiTypography.sectionLabel}>End of Day</p>
          <h2 className={uiTypography.sectionTitle}>
            {closeRequestPending
              ? "Closing request sent — pending review."
              : dayClosed
                ? "Business day closed."
                : "Review today's activity before submitting for closing."}
          </h2>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-white">Daily Notes</p>
                <p className="mt-1 text-xs text-zinc-500">Optional</p>
              </div>
              <Textarea
                id="daily-notes"
                aria-label="Daily notes"
                placeholder="Add a note about today's operations..."
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-[140px]"
                disabled={dayClosed}
              />
            </div>

            {/* Movie Revenue input is intentionally retained. Removing the closing
                requirement (UGX 0 allowed) must NOT remove this editable field. */}
            <div
              className={cn(
                "rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-5",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              )}
              data-regression-guard="movie-revenue-eod-section"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/90">
                  Movie Revenue
                </p>
                <p className="text-sm text-zinc-400">
                  Enter today&apos;s movie revenue
                </p>
              </div>

            {!canRecordMovieRevenue ? (
              <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {dayClosed
                  ? "This business day is closed. Movie revenue can no longer be changed."
                  : closeRequestPending
                    ? "Closing request pending — movie revenue is locked until review completes."
                    : "Open the shop for this branch before recording movie revenue."}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="sr-only">Movie revenue amount</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
                      UGX
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="Movie revenue amount"
                      data-regression-guard="movie-revenue-eod-input"
                      value={amountInput}
                      onChange={(event) => {
                        setAmountInput(event.target.value);
                        setLocalError(null);
                      }}
                      placeholder="0"
                      disabled={isSavingMovieRevenue}
                      className={cn(
                        "h-12 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-14 pr-4 text-lg font-semibold tabular-nums text-white outline-none",
                        "placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
                      )}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Enter the total amount collected from movie sales today.
                  </p>
                  {amountInput.trim() ? (
                    <p className="mt-1 text-xs text-zinc-400">
                      Preview: {formatCurrency(parseAmount(amountInput))}
                    </p>
                  ) : null}
                </label>

                <Button
                  type="button"
                  variant="secondary"
                  loading={isSavingMovieRevenue}
                  loadingLabel="Saving movie revenue..."
                  disabled={isSavingMovieRevenue || amountInput.trim() === ""}
                  onClick={() => void handleSaveMovieRevenue()}
                  className="w-full sm:w-auto"
                >
                  {movieRevenueEntered ? "Update Movie Revenue" : "Save Movie Revenue"}
                </Button>
              </div>
            )}

            {displayMovieRevenueError ? (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {displayMovieRevenueError}
              </p>
            ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Day Checklist
            </p>
            <ChecklistItem
              label="Movie Revenue"
              status={
                movieRevenueEntered
                  ? `Recorded — ${formatCurrency(movieRevenue)}`
                  : "Pending"
              }
              complete={movieRevenueEntered}
            />
            <ChecklistItem
              label="Sales"
              status={
                accessorySalesRecorded ? "Recorded" : "No accessory sales recorded"
              }
              complete={accessorySalesRecorded}
            />
            <ChecklistItem
              label="Expenses"
              status={expensesRecorded ? "Recorded" : "None recorded"}
              complete={expensesRecorded}
            />
            <ChecklistItem
              label="Daily Wage"
              status={wageRecorded ? "Recorded" : "Pending"}
              complete={wageRecorded}
            />
            <ChecklistItem
              label="Ready to Close"
              status={
                closeRequestPending
                  ? "Request sent"
                  : dayClosed
                    ? "Closed"
                    : readyToClose
                      ? "Ready"
                      : "Action required"
              }
              complete={closeRequestPending || dayClosed || readyToClose}
            />
          </div>
        </div>

        {closeError ? (
          <div className="mt-6">
            <CloseDayErrorBanner message={closeError} />
          </div>
        ) : null}

        {closeRequestPending ? (
          <div className="mt-6">
            <ClosingRequestSentBanner />
          </div>
        ) : dayClosed ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-200">
              Business Day Closed
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-300/90">
              Today&apos;s records are now locked.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              size="lg"
              loading={isClosing}
              loadingLabel="Submitting closing request..."
              disabled={isClosing || !shopOpen}
              onClick={handleOpenConfirm}
              className="w-full"
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>📋</span>
                Submit for Closing
              </span>
            </Button>
            <p className="text-center text-xs leading-relaxed text-zinc-500">
              Your operations are saved. Submitting sends a closing request for review
              — the business day is not locked until approved.
            </p>
          </div>
        )}
      </section>

      {confirmOpen ? (
        <CloseDayConfirmDialog
          branchName={branchName}
          businessDate={businessDate}
          totalSales={totalSales}
          totalExpenses={totalExpenses}
          dailyWage={staffPayouts}
          cashToHandIn={cashToHandIn}
          isSubmitting={isClosing}
          mode="submit"
          onConfirm={() => void handleConfirmClose()}
          onCancel={() => {
            if (!isClosing) setConfirmOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
