"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { StockDialog } from "@/components/stock/stock-dialog";
import { validateMoneyInput } from "@/lib/amounts";
import { formatCurrency } from "@/lib/format";
import {
  getServiceRevenueLabel,
  type ServiceSaleCategory,
} from "@/lib/staff-home/services";

interface ServiceSaleDialogProps {
  open: boolean;
  category: ServiceSaleCategory | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: {
    category: ServiceSaleCategory;
    amount: number;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function ServiceSaleDialog({
  open,
  category,
  isSaving,
  onClose,
  onSave,
}: ServiceSaleDialogProps) {
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmountInput("");
      setDescription("");
      setError(null);
    }
  }, [open, category]);

  if (!open || !category) return null;

  const title = getServiceRevenueLabel(category);

  async function handleSave() {
    if (!category) return;
    setError(null);

    const validation = validateMoneyInput(amountInput, {
      fieldLabel: "Amount",
      allowZero: false,
    });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    const result = await onSave({
      category,
      amount: validation.amount,
      description: description.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Could not record this sale.");
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={title}
      description="Record today's service revenue."
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={isSaving}
            loadingLabel="Saving…"
            onClick={() => void handleSave()}
          >
            Record Sale
          </Button>
        </div>
      }
    >
      <label className="block text-sm font-medium text-zinc-400" htmlFor="service-sale-amount">
        Amount (UGX)
      </label>
      <Input
        id="service-sale-amount"
        inputMode="decimal"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        placeholder="0"
        className="mt-2"
        autoFocus
      />

      <label
        className="mt-4 block text-sm font-medium text-zinc-400"
        htmlFor="service-sale-note"
      >
        Note (optional)
      </label>
      <Textarea
        id="service-sale-note"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="e.g. iPhone unlock, 20 pages printed"
        className="mt-2"
        rows={3}
      />

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <p className="mt-3 text-xs text-zinc-500">
        Amounts are stored in UGX. Example: {formatCurrency(25000)}
      </p>
    </StockDialog>
  );
}
