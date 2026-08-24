"use client";

import { StockDialog } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";

interface HistoricalExpenseGateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function HistoricalExpenseGateDialog({
  open,
  onClose,
  onConfirm,
}: HistoricalExpenseGateDialogProps) {
  if (!open) return null;

  return (
    <StockDialog
      title="Add Historical Expense"
      description="This should only be used if an expense was forgotten during Today's Operations."
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          Historical entries are tagged as <span className="text-amber-300">Late Entry</span>{" "}
          and should not replace daily operational recording.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Continue
          </Button>
        </div>
      </div>
    </StockDialog>
  );
}
