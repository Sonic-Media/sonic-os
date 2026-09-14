"use client";

import { useEffect, useState } from "react";
import {
  StaffAnimatedMoney,
  StaffCard,
  StaffPremiumButton,
  StaffSectionLabel,
  StaffStatusBadge,
  StaffSuccessFlash,
} from "@/components/operations/staff/primitives";
import { useToast } from "@/context/toast-context";
import { parseAmount, validateMoneyInput } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import type { SubmitRequestResult } from "@/hooks/use-entry-form";
import { cn } from "@/lib/utils";

interface StaffMovieRevenueCardProps {
  salesValue: string;
  movieRevenue: number;
  businessDate: string;
  canRecord: boolean;
  blockedReason?: string;
  isSaving: boolean;
  saveError?: string | null;
  onRecord: (amount: string) => Promise<SubmitRequestResult>;
}

export function StaffMovieRevenueCard({
  salesValue,
  movieRevenue,
  businessDate,
  canRecord,
  blockedReason,
  isSaving,
  saveError,
  onRecord,
}: StaffMovieRevenueCardProps) {
  const [amountInput, setAmountInput] = useState(salesValue);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { success: toastSuccess } = useToast();

  const hasRecordedValue = movieRevenue > 0;

  useEffect(() => {
    setAmountInput(salesValue);
  }, [salesValue]);

  async function handleRecord() {
    setError(null);

    const validation = validateMoneyInput(amountInput, {
      fieldLabel: "Movie revenue",
    });

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (validation.amount <= 0) {
      setError("Enter a movie revenue amount greater than zero.");
      return;
    }

    const normalizedAmount = String(validation.amount);
    const result = await onRecord(normalizedAmount);
    if (!result.success) {
      setError(result.error ?? "Could not save movie revenue.");
      return;
    }

    setShowSuccess(true);
    toastSuccess(
      hasRecordedValue ? "Movie Revenue Updated" : "Movie Revenue Recorded"
    );
    window.setTimeout(() => setShowSuccess(false), 1200);
  }

  const displayError = error ?? saveError;

  return (
    <StaffCard accent="default">
      <div className="flex items-start justify-between gap-4">
        <div>
          <StaffSectionLabel>Movie Revenue</StaffSectionLabel>
          <p className="mt-2 text-sm text-zinc-400">
            Record today&apos;s movie revenue
          </p>
        </div>
        <StaffSuccessFlash show={showSuccess} />
      </div>

      {hasRecordedValue ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-300/90">
            Recorded for {businessDate}
          </p>
          <div className="mt-2">
            <StaffAnimatedMoney
              value={movieRevenue}
              className="text-3xl font-bold text-white"
              fromZero={false}
            />
          </div>
        </div>
      ) : null}

      {!canRecord ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {blockedReason ??
            "Open the shop for this branch before recording movie revenue."}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
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
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(event.target.value);
                  setError(null);
                }}
                placeholder="0"
                disabled={isSaving}
                className={cn(
                  "h-12 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-14 pr-4 text-lg font-semibold tabular-nums text-white outline-none",
                  "placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
                )}
              />
            </div>
            {amountInput.trim() ? (
              <p className="mt-2 text-xs text-zinc-500">
                Preview: {formatCurrency(parseAmount(amountInput))}
              </p>
            ) : null}
          </label>

          <StaffPremiumButton
            type="button"
            onClick={() => void handleRecord()}
            disabled={isSaving || !amountInput.trim()}
            className={cn(isSaving && "opacity-70")}
          >
            {isSaving
              ? "Saving..."
              : hasRecordedValue
                ? "Update Movie Revenue"
                : "Record Movie Revenue"}
          </StaffPremiumButton>
        </div>
      )}

      {displayError ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {displayError}
        </p>
      ) : null}

      {hasRecordedValue && canRecord ? (
        <div className="mt-4">
          <StaffStatusBadge tone="success">Saved separately from accessory sales</StaffStatusBadge>
        </div>
      ) : null}
    </StaffCard>
  );
}
