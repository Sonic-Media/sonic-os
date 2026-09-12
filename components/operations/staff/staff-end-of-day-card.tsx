"use client";

import { useState } from "react";
import { CloseDayConfirmDialog } from "@/components/operations/staff/close-day-confirm-dialog";
import { Button } from "@/components/shared/ui/button";
import { Textarea } from "@/components/shared/ui/textarea";
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
  isClosing: boolean;
  closeError?: string | null;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
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
  isClosing,
  closeError,
  updateField,
  onCloseDay,
}: StaffEndOfDayCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalSales = movieRevenue + accessorySales;
  const salesRecorded = totalSales > 0;
  const expensesRecorded = totalExpenses > 0;
  const readyToClose = shopOpen;

  function handleOpenConfirm() {
    if (isClosing) return;
    setConfirmOpen(true);
  }

  async function handleConfirmClose() {
    const success = await onCloseDay();
    if (success) {
      setConfirmOpen(false);
    }
  }

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
            Review today&apos;s activity before closing the business day.
          </h2>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
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
              className="min-h-[180px]"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Day Checklist
            </p>
            <ChecklistItem
              label="Sales"
              status={salesRecorded ? "Recorded" : "No sales recorded"}
              complete={salesRecorded}
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
              status={readyToClose ? "Ready" : "Action required"}
              complete={readyToClose}
            />
          </div>
        </div>

        {closeError ? (
          <div className="mt-6">
            <CloseDayErrorBanner message={closeError} />
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            size="lg"
            loading={isClosing}
            loadingLabel="Closing business day..."
            disabled={isClosing}
            onClick={handleOpenConfirm}
            className="w-full"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>🔒</span>
              Close Day
            </span>
          </Button>
          <p className="text-center text-xs leading-relaxed text-zinc-500">
            Once you close the day, today&apos;s records will be locked.
          </p>
        </div>
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
          onConfirm={() => void handleConfirmClose()}
          onCancel={() => {
            if (!isClosing) setConfirmOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
