"use client";

import { useMemo, useState } from "react";
import { CloseDayConfirmDialog } from "@/components/operations/staff/close-day-confirm-dialog";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useManagementApproveClose } from "@/hooks/use-management-approve-close";
import { readCloseRequest } from "@/lib/day-closing/close-request";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/shared/ui/button";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import type { DayClosingRecord } from "@/types/day-closing";

function formatBusinessWeekday(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
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
  const cashToHandIn = record.summary?.remainingCash ?? record.actualCashCounted ?? 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold text-white">{branchName}</p>
          <p className="text-sm text-zinc-400">
            Business day: {formatBusinessWeekday(record.date)}
          </p>
          {closeRequest?.submittedByName ? (
            <p className="text-sm text-zinc-500">
              Submitted by: {closeRequest.submittedByName}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" onClick={onReview}>
          Review & Close
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-zinc-500">Sales</p>
          <p className="font-medium tabular-nums text-white">{formatCurrency(sales)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Expenses</p>
          <p className="font-medium tabular-nums text-white">
            {formatCurrency(expenses)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Daily wages</p>
          <p className="font-medium tabular-nums text-white">{formatCurrency(wages)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Cash to hand in</p>
          <p className="font-medium tabular-nums text-white">
            {formatCurrency(cashToHandIn)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MissionControlCloseRequests() {
  const { getBranchName } = useBranches();
  const { getCloseRequestedRecords } = useDayClosing();
  const pendingRequests = useMemo(
    () =>
      getCloseRequestedRecords().sort((left, right) =>
        left.date.localeCompare(right.date)
      ),
    [getCloseRequestedRecords]
  );

  const [selectedRecord, setSelectedRecord] = useState<DayClosingRecord | null>(
    null
  );

  const selectedBranch = selectedRecord?.branch;
  const selectedDate = selectedRecord?.date ?? "";

  const { approveClose, isApproving, error } = useManagementApproveClose(
    selectedBranch ?? "main",
    selectedDate
  );

  if (pendingRequests.length === 0) {
    return null;
  }

  async function handleConfirmApprove() {
    if (!selectedRecord) return;

    const result = await approveClose(selectedRecord.closingNotes);
    if (result.success) {
      setSelectedRecord(null);
    }
  }

  const selectedSales = selectedRecord?.summary?.sales ?? 0;
  const selectedExpenses = selectedRecord?.summary?.expenses ?? 0;
  const selectedWages = selectedRecord?.summary?.staffPayments ?? 0;
  const selectedCash = selectedRecord?.summary?.remainingCash ?? 0;

  return (
    <>
      <OwnerCard accent="purple">
        <OwnerSectionTitle>Close Requests</OwnerSectionTitle>
        <p className="mt-1 text-xs text-zinc-500">
          Pending business-day closing requests awaiting approval
        </p>

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

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </OwnerCard>

      {selectedRecord ? (
        <CloseDayConfirmDialog
          branchName={getBranchName(selectedRecord.branch)}
          businessDate={selectedRecord.date}
          totalSales={selectedSales}
          totalExpenses={selectedExpenses}
          dailyWage={selectedWages}
          cashToHandIn={selectedCash}
          isSubmitting={isApproving}
          mode="approve"
          onConfirm={() => void handleConfirmApprove()}
          onCancel={() => {
            if (!isApproving) setSelectedRecord(null);
          }}
        />
      ) : null}
    </>
  );
}
