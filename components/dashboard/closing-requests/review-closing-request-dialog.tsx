"use client";

import { useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Textarea } from "@/components/shared/ui/textarea";
import { readCloseRequest } from "@/lib/day-closing/close-request";
import { formatEntryDisplayDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { DayClosingRecord } from "@/types/day-closing";

interface ReviewClosingRequestDialogProps {
  record: DayClosingRecord;
  branchName: string;
  isSubmitting: boolean;
  isRejecting?: boolean;
  rejectError?: string | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
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

function formatSubmittedAt(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-UG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ReviewClosingRequestDialog({
  record,
  branchName,
  isSubmitting,
  isRejecting = false,
  rejectError,
  onApprove,
  onReject,
  onCancel,
}: ReviewClosingRequestDialogProps) {
  const closeRequest = readCloseRequest(record.summary);
  const sales = record.summary?.sales ?? record.metrics.todaySales ?? 0;
  const expenses = record.summary?.expenses ?? record.metrics.todayOperatingExpenses ?? 0;
  const wages =
    record.summary?.staffPayments ?? record.metrics.todayStaffPaymentsRecorded ?? 0;
  const cashPosition = record.summary?.remainingCash ?? record.actualCashCounted ?? 0;
  const dailyNotes = record.closingNotes?.trim();
  const busy = isSubmitting || isRejecting;
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cancel review"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-closing-request-title"
        className={cn(uiSurface.modal, "relative w-full max-w-lg p-6 sm:p-7")}
      >
        <h3
          id="review-closing-request-title"
          className="text-xl font-semibold tracking-tight text-white"
        >
          Review Closing Request
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Approving will permanently close this business day and lock its records.
          Rejecting returns the same business date to staff for correction.
        </p>

        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
          <SummaryRow label="Branch" value={branchName} />
          <SummaryRow
            label="Business date"
            value={formatEntryDisplayDate(record.date)}
          />
          <SummaryRow
            label="Submitted by"
            value={closeRequest?.submittedByName ?? "—"}
          />
          <SummaryRow
            label="Submitted at"
            value={formatSubmittedAt(closeRequest?.submittedAt)}
          />
          <div className="my-2 h-px bg-white/[0.06]" />
          <SummaryRow label="Total sales" value={formatCurrency(sales)} />
          <SummaryRow label="Expenses" value={formatCurrency(expenses)} />
          <SummaryRow label="Daily wage" value={formatCurrency(wages)} />
          <SummaryRow label="Cash to hand in" value={formatCurrency(cashPosition)} />
        </div>

        {dailyNotes ? (
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Daily Notes
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{dailyNotes}</p>
          </div>
        ) : null}

        {showReject ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-400" htmlFor="reject-reason">
              Rejection reason
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Please correct transport expenditure from UGX 20,000 to UGX 12,000."
              disabled={busy}
            />
            {rejectError ? (
              <p className="text-sm text-red-400" role="alert">
                {rejectError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
            className="sm:min-w-[120px]"
          >
            Cancel
          </Button>
          {showReject ? (
            <Button
              type="button"
              onClick={() => onReject(reason)}
              loading={isRejecting}
              loadingLabel="Returning for correction..."
              disabled={busy || !reason.trim()}
              className="sm:min-w-[180px] bg-amber-600 hover:bg-amber-500"
            >
              Return for Correction
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReject(true)}
                disabled={busy}
                className="sm:min-w-[180px]"
              >
                Reject / Return for Correction
              </Button>
              <Button
                type="button"
                onClick={onApprove}
                loading={isSubmitting}
                loadingLabel="Approving and closing..."
                disabled={busy}
                className="sm:min-w-[160px]"
              >
                Approve & Close Day
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
