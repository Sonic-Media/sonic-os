"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { StockDialog } from "@/components/stock/stock-dialog";
import { parseAmount, validateMoneyInput } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import type { SubmitRequestResult } from "@/hooks/use-entry-form";

interface MovieRevenueDialogProps {
  open: boolean;
  currentAmount: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (amount: string) => Promise<SubmitRequestResult>;
}

export function MovieRevenueDialog({
  open,
  currentAmount,
  isSaving,
  onClose,
  onSave,
}: MovieRevenueDialogProps) {
  const [amountInput, setAmountInput] = useState(currentAmount);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmountInput(currentAmount.trim() === "" ? "" : currentAmount);
      setError(null);
    }
  }, [open, currentAmount]);

  if (!open) return null;

  const hasRecordedValue = currentAmount.trim() !== "";
  const preview = parseAmount(amountInput);

  async function handleSave() {
    setError(null);
    const validation = validateMoneyInput(amountInput, {
      fieldLabel: "Movie revenue",
      allowZero: true,
    });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    const result = await onSave(String(validation.amount));
    if (!result.success) {
      setError(result.error ?? "Could not save movie revenue.");
      return;
    }
    onClose();
  }

  return (
    <StockDialog
      title="Movies"
      description="Update today's movie revenue."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            data-regression-guard="staff-today-movie-revenue-action"
            loading={isSaving}
            loadingLabel="Saving…"
            onClick={() => void handleSave()}
          >
            {hasRecordedValue ? "Update Movie Revenue" : "Save Movie Revenue"}
          </Button>
        </div>
      }
    >
      <div data-regression-guard="staff-today-movie-revenue-section">
        <label
          className="block text-sm font-medium text-zinc-400"
          htmlFor="movie-revenue-amount"
        >
          Amount (UGX)
        </label>
        <Input
          id="movie-revenue-amount"
          inputMode="decimal"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          placeholder="0"
          className="mt-2"
          autoFocus
          aria-label="Movie revenue amount"
          data-regression-guard="staff-today-movie-revenue-input"
        />
        {preview > 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Preview: {formatCurrency(preview)}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <span className="sr-only">Enter Movie Revenue</span>
      </div>
    </StockDialog>
  );
}
