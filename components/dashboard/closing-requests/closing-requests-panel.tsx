"use client";

import { useMemo, useState } from "react";
import { ReviewClosingRequestDialog } from "@/components/dashboard/closing-requests/review-closing-request-dialog";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useManagementApproveClose } from "@/hooks/use-management-approve-close";
import { readCloseRequest } from "@/lib/day-closing/close-request";
import { formatEntryDisplayDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/shared/ui/button";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { DayClosingRecord } from "@/types/day-closing";

function formatSubmittedTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-UG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function CloseRequestCard({
  record,
  branchName,
  onReview,
}: {
  record: DayClosingRecord;
  branchName: string;
  onReview: () => void;
}) {
  const closeRequest = readCloseRequest(record.summary);
  const sales = record.summary?.sales ?? record.metrics.todaySales ?? 0;
  const expenses = record.summary?.expenses ?? record.metrics.todayOperatingExpenses ?? 0;
  const wages =
    record.summary?.staffPayments ?? record.metrics.todayStaffPaymentsRecorded ?? 0;
  const cashPosition = record.summary?.remainingCash ?? record.actualCashCounted ?? 0;
  const submittedTime = formatSubmittedTime(closeRequest?.submittedAt);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold text-white">{branchName}</p>
          <p className="text-sm text-zinc-400">{formatEntryDisplayDate(record.date)}</p>
          {closeRequest?.submittedByName ? (
            <p className="text-sm text-zinc-500">
              Submitted by {closeRequest.submittedByName}
              {submittedTime ? ` · ${submittedTime}` : ""}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" onClick={onReview}>
          Review Request
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-zinc-500">Sales</p>
          <p className="font-medium tabular-nums text-white">{formatCurrency(sales)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Expenses</p>
          <p className="font-medium tabular-nums text-white">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Staff payments</p>
          <p className="font-medium tabular-nums text-white">{formatCurrency(wages)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Cash position</p>
          <p
            className={cn(
              "font-medium tabular-nums",
              cashPosition < 0 ? "text-orange-400" : "text-white"
            )}
          >
            {formatCurrency(cashPosition)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ClosingRequestsPanel() {
  const { getBranchName } = useBranches();
  const { getCloseRequestedRecords } = useDayClosing();
  const pendingRequests = useMemo(
    () =>
      getCloseRequestedRecords().sort((left, right) =>
        left.date.localeCompare(right.date)
      ),
    [getCloseRequestedRecords]
  );

  const [selectedRecord, setSelectedRecord] = useState<DayClosingRecord | null>(null);

  const { approveClose, isApproving, error } = useManagementApproveClose(
    selectedRecord?.branch ?? "main",
    selectedRecord?.date ?? ""
  );

  async function handleConfirmApprove() {
    if (!selectedRecord) return;

    const result = await approveClose(selectedRecord.closingNotes);
    if (result.success) {
      setSelectedRecord(null);
    }
  }

  return (
    <>
      <OwnerCard accent="purple">
        <OwnerSectionTitle>Closing Requests</OwnerSectionTitle>
        <p className="mt-1 text-xs text-zinc-500">
          Pending business-day closing requests awaiting approval
        </p>

        {pendingRequests.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-zinc-500">
            No closing requests pending.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingRequests.map((record) => (
              <CloseRequestCard
                key={record.id}
                record={record}
                branchName={getBranchName(record.branch)}
                onReview={() => setSelectedRecord(record)}
              />
            ))}
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </OwnerCard>

      {selectedRecord ? (
        <ReviewClosingRequestDialog
          record={selectedRecord}
          branchName={getBranchName(selectedRecord.branch)}
          isSubmitting={isApproving}
          onApprove={() => void handleConfirmApprove()}
          onCancel={() => {
            if (!isApproving) setSelectedRecord(null);
          }}
        />
      ) : null}
    </>
  );
}
