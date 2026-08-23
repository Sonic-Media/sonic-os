"use client";

import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffSectionLabel,
  StaffStatusBadge,
} from "@/components/operations/staff/primitives";
import { cn } from "@/lib/utils";
import type { EntryFormData } from "@/types";

interface StaffEndOfDayCardProps {
  form: EntryFormData;
  movieRevenue: number;
  totalExpenses: number;
  staffPayouts: number;
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
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 animate-in fade-in zoom-in-95 duration-300">
          ✓
        </span>
      ) : (
        <span className="text-xs text-zinc-600">Pending</span>
      )}
    </div>
  );
}

export function StaffEndOfDayCard({
  form,
  movieRevenue,
  totalExpenses,
  staffPayouts,
  accessorySalesCount,
  isClosing,
  closeError,
  updateField,
  onCloseDay,
  expanded,
  onExpandedChange,
}: StaffEndOfDayCardProps) {
  const accessoriesDone = accessorySalesCount > 0;
  const expensesDone = totalExpenses > 0;
  const wageDone = staffPayouts > 0;
  const movieDone = movieRevenue > 0;
  const readyToClose =
    accessoriesDone && expensesDone && wageDone && movieDone;

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
                onChange={(event) => updateField("sales", event.target.value)}
                className="rounded-2xl border-white/[0.08] bg-black/30"
              />
            </div>
          </div>

          <Textarea
            label="Daily Notes"
            placeholder="Optional notes about today's shift"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="min-h-[100px] rounded-2xl border-white/[0.08] bg-black/30"
          />

          {closeError ? <p className="text-sm text-red-400">{closeError}</p> : null}

          <Button
            type="button"
            size="lg"
            disabled={isClosing}
            onClick={onCloseDay}
            className={cn(
              "h-14 w-full rounded-2xl border-0 text-base font-semibold transition-all duration-200",
              "bg-white text-zinc-950",
              "hover:scale-[1.01] hover:shadow-[0_0_32px_-8px_rgba(255,255,255,0.45)]",
              "disabled:opacity-60"
            )}
          >
            {isClosing ? "Closing Day..." : "Close Day"}
          </Button>

          <p className="text-center text-xs leading-relaxed text-zinc-500">
            Once you close the day, all records will be locked until tomorrow.
          </p>
        </div>
      </div>
    </StaffOperationCard>
  );
}
