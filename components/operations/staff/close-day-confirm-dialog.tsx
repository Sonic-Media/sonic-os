"use client";

import { Button } from "@/components/shared/ui/button";
import { formatEntryDisplayDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export type CloseDayConfirmMode = "submit" | "approve";

interface CloseDayConfirmDialogProps {
  branchName: string;
  businessDate: string;
  totalSales: number;
  totalExpenses: number;
  dailyWage: number;
  cashToHandIn: number;
  isSubmitting: boolean;
  mode?: CloseDayConfirmMode;
  onConfirm: () => void;
  onCancel: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

export function CloseDayConfirmDialog({
  branchName,
  businessDate,
  totalSales,
  totalExpenses,
  dailyWage,
  cashToHandIn,
  isSubmitting,
  mode = "submit",
  onConfirm,
  onCancel,
}: CloseDayConfirmDialogProps) {
  const isApprove = mode === "approve";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cancel close day"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        disabled={isSubmitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-day-confirm-title"
        className={cn(
          uiSurface.modal,
          "relative w-full max-w-md p-6 sm:p-7"
        )}
      >
        <h3
          id="close-day-confirm-title"
          className="text-xl font-semibold tracking-tight text-white"
        >
          {isApprove
            ? "Approve and close this business day?"
            : "Submit this business day for closing?"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {isApprove
            ? `This will finalize and lock today's records for ${branchName}.`
            : `Your operations are saved. This sends a closing request for ${branchName} to be reviewed.`}
        </p>

        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
          <SummaryRow label="Branch" value={branchName} />
          <SummaryRow
            label="Business date"
            value={formatEntryDisplayDate(businessDate)}
          />
          <div className="my-2 h-px bg-white/[0.06]" />
          <SummaryRow label="Total sales" value={formatCurrency(totalSales)} />
          <SummaryRow label="Expenses" value={formatCurrency(totalExpenses)} />
          <SummaryRow label="Daily wage" value={formatCurrency(dailyWage)} />
          <div className="my-2 h-px bg-white/[0.06]" />
          <SummaryRow label="Cash to hand in" value={formatCurrency(cashToHandIn)} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="sm:min-w-[120px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            loading={isSubmitting}
            loadingLabel={
              isApprove ? "Approving and closing..." : "Submitting request..."
            }
            disabled={isSubmitting}
            className="sm:min-w-[140px]"
          >
            {isApprove ? "Approve & Close" : "Submit for Closing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
