"use client";

import { useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffAnimatedMoney,
  StaffSectionLabel,
  StaffStatusBadge,
} from "@/components/operations/staff/primitives";
import { parseAmount } from "@/lib/amounts";
import type { EntryFormData } from "@/types";

interface StaffEndOfDayCardProps {
  form: EntryFormData;
  movieRevenue: number;
  accessorySales: number;
  totalExpenses: number;
  staffPayouts: number;
  cashToHandIn: number;
  accessorySalesCount: number;
  isClosing: boolean;
  closeError?: string | null;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  onCloseDay: () => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

function ChecklistRow({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 animate-in fade-in duration-300">
          ✓
        </span>
      ) : (
        <span className="text-xs text-zinc-600">Pending</span>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm font-normal text-zinc-500">{label}</span>
      <StaffAnimatedMoney
        value={value}
        fromZero={false}
        className={
          highlight
            ? "text-sm font-bold tabular-nums text-blue-200"
            : "text-sm font-bold tabular-nums text-white"
        }
      />
    </div>
  );
}

export function StaffEndOfDayCard({
  form,
  movieRevenue,
  accessorySales,
  totalExpenses,
  staffPayouts,
  cashToHandIn,
  accessorySalesCount,
  isClosing,
  closeError,
  updateField,
  onCloseDay,
  expanded,
  onExpandedChange,
}: StaffEndOfDayCardProps) {
  const [movieError, setMovieError] = useState<string | null>(null);
  const accessoriesDone = accessorySalesCount > 0;
  const expensesDone = totalExpenses > 0;
  const wageDone = staffPayouts > 0;
  const movieDone = movieRevenue > 0;
  const readyToClose =
    accessoriesDone && expensesDone && wageDone && movieDone;
  const totalRevenue = movieRevenue + accessorySales;

  function handleCloseClick() {
    const parsedMovie = parseAmount(form.sales);
    if (parsedMovie <= 0) {
      setMovieError("Enter today's movie revenue before closing.");
      return;
    }
    setMovieError(null);
    onCloseDay();
  }

  return (
    <StaffOperationCard
      accent="default"
      title="End of Day"
      description="Enter movie revenue, add notes, and close today's shop."
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      collapsedPreview={
        readyToClose ? (
          <StaffStatusBadge tone="success">Ready to Close ✓</StaffStatusBadge>
        ) : (
          <span className="text-sm text-zinc-500">Complete the checklist</span>
        )
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <ChecklistRow label="Accessories Recorded" done={accessoriesDone} />
          <ChecklistRow label="Expenses Recorded" done={expensesDone} />
          <ChecklistRow label="Daily Wage Recorded" done={wageDone} />
        </div>

        {readyToClose ? (
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3 text-center">
            <p className="text-sm font-semibold text-emerald-400">
              Ready to Close ✓
            </p>
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <StaffSectionLabel>Movie Revenue</StaffSectionLabel>
            <div className="mt-3">
              <Input
                label="Movie Revenue (UGX)"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.sales}
                error={movieError ?? undefined}
                onChange={(event) => {
                  updateField("sales", event.target.value);
                  if (movieError) setMovieError(null);
                }}
              />
            </div>
          </div>

          <Textarea
            label="Daily Notes"
            placeholder="Optional notes about today's shift"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />

          {closeError ? <p className="text-sm text-red-400">{closeError}</p> : null}

          <div className="space-y-3 rounded-2xl border border-white/[0.05] bg-black/20 p-5">
            <StaffSectionLabel>Today&apos;s Summary</StaffSectionLabel>
            <div className="mt-4 space-y-1">
              <SummaryRow label="Today's Revenue" value={totalRevenue} />
              <SummaryRow label="Movie Revenue" value={movieRevenue} />
              <SummaryRow label="Accessory Revenue" value={accessorySales} />
              <div className="my-2 h-px bg-white/[0.06]" />
              <SummaryRow label="Expenses" value={totalExpenses} />
              <SummaryRow label="Daily Wage" value={staffPayouts} />
              <div className="my-2 h-px bg-white/[0.06]" />
              <SummaryRow
                label="Cash To Hand In"
                value={cashToHandIn}
                highlight
              />
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            loading={isClosing}
            loadingLabel="Closing Day..."
            disabled={isClosing || !readyToClose}
            onClick={handleCloseClick}
            className="w-full"
          >
            Confirm Close Shop
          </Button>

          <p className="text-center text-xs leading-relaxed text-zinc-500">
            Once you close the day, all records will be locked until tomorrow.
          </p>
        </div>
      </div>
    </StaffOperationCard>
  );
}
