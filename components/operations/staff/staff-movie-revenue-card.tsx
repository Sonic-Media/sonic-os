"use client";

import { useEffect, useState } from "react";
import {
  StaffAnimatedMoney,
  StaffCard,
  StaffPremiumButton,
  StaffSectionLabel,
} from "@/components/operations/staff/primitives";
import { useToast } from "@/context/toast-context";
import type { SubmitRequestResult } from "@/hooks/use-entry-form";
import { parseAmount, validateMoneyInput } from "@/lib/amounts";
import { cn } from "@/lib/utils";
import type { EntryFormData } from "@/types";

interface StaffMovieRevenueCardProps {
  form: EntryFormData;
  movieRevenue: number;
  shopOpen: boolean;
  dayClosed: boolean;
  closeRequestPending: boolean;
  isSaving: boolean;
  saveError?: string | null;
  onSaveMovieRevenue: (amount: string) => Promise<SubmitRequestResult>;
}

export function StaffMovieRevenueCard({
  form,
  movieRevenue,
  shopOpen,
  dayClosed,
  closeRequestPending,
  isSaving,
  saveError,
  onSaveMovieRevenue,
}: StaffMovieRevenueCardProps) {
  const { success: toastSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [amountInput, setAmountInput] = useState(form.sales);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setAmountInput(form.sales);
    }
  }, [form.sales, editing]);

  const hasRecordedValue = form.sales.trim() !== "";
  const canEdit = shopOpen && !dayClosed && !closeRequestPending;
  const displayError = localError ?? saveError ?? null;

  async function handleSave() {
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
    const result = await onSaveMovieRevenue(normalizedAmount);
    if (!result.success) {
      setLocalError(result.error ?? "Could not save movie revenue.");
      return;
    }

    setEditing(false);
    toastSuccess(
      hasRecordedValue ? "Movie revenue updated." : "Movie revenue recorded."
    );
  }

  function openEditor() {
    if (!canEdit) return;
    setAmountInput(form.sales.trim() === "" ? "0" : form.sales);
    setLocalError(null);
    setEditing(true);
  }

  const actionLabel = hasRecordedValue
    ? "Update Movie Revenue"
    : "Enter Movie Revenue";

  return (
    <div
      className="scroll-mt-4"
      data-regression-guard="staff-today-movie-revenue-section"
    >
    <StaffCard accent="revenue">
      <StaffSectionLabel>Movie Revenue</StaffSectionLabel>
      <p className="mt-1 text-sm text-zinc-400">Today&apos;s movie revenue</p>

      <div className="mt-4">
        <StaffAnimatedMoney
          value={movieRevenue}
          className="text-3xl font-bold text-white sm:text-4xl"
        />
      </div>

      {canEdit ? (
        <div className="mt-5 space-y-3">
          {!editing ? (
            <StaffPremiumButton
              type="button"
              data-regression-guard="staff-today-movie-revenue-action"
              onClick={openEditor}
              disabled={isSaving}
            >
              {actionLabel}
            </StaffPremiumButton>
          ) : (
            <div
              className="space-y-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4"
              data-regression-guard="staff-today-movie-revenue-input"
            >
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Amount (UGX)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Movie revenue amount"
                  placeholder="0"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className={cn(
                    "h-12 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4",
                    "text-lg font-semibold tabular-nums text-white outline-none",
                    "focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
                  )}
                />
              </label>

              {displayError ? (
                <p role="alert" className="text-sm text-red-300">
                  {displayError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-11 rounded-xl border border-white/10 px-3 text-sm font-medium text-zinc-300"
                  onClick={() => {
                    setEditing(false);
                    setLocalError(null);
                    setAmountInput(form.sales);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <StaffPremiumButton
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save Movie Revenue"}
                </StaffPremiumButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {dayClosed
            ? "This business day is closed. Movie revenue cannot be changed."
            : closeRequestPending
              ? "Closing request pending — movie revenue is locked until review completes."
              : "Open the shop to record movie revenue."}
        </p>
      )}

      {!canEdit && hasRecordedValue ? (
        <p className="mt-2 text-xs text-zinc-600">
          Saved amount: {parseAmount(form.sales).toLocaleString()} UGX
        </p>
      ) : null}
    </StaffCard>
    </div>
  );
}
