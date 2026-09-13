"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useBranchState } from "@/hooks/use-branch-state";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";
import { Button } from "@/components/shared/ui/button";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function ChecklistRow({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3">
      <p className="text-sm text-zinc-400">{label}</p>
      <p
        className={cn(
          "text-sm font-medium",
          complete ? "text-emerald-400" : "text-zinc-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MissionControlEndOfDay() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const branchState = useBranchState();
  const { getClosedRecord } = useDayClosing();

  const closedRecord = getClosedRecord(activeBranch, today);
  const dailyNotes = closedRecord?.closingNotes?.trim() || null;

  const operationsHref = useMemo(
    () => `/operations/today?branch=${encodeURIComponent(activeBranch)}`,
    [activeBranch]
  );

  const movieValue =
    branchState.movieRevenue > 0
      ? formatCurrency(branchState.movieRevenue)
      : "Pending";
  const expensesValue =
    branchState.operatingExpenses > 0 ? "Recorded" : "Pending";
  const wageValue = branchState.staffWages > 0 ? "Recorded" : "Pending";
  const dayClosedValue =
    branchState.status === "closed"
      ? "Closed"
      : branchState.status === "close_requested"
        ? "Closing request pending"
        : "Open";

  return (
    <OwnerCard accent="green">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <OwnerSectionTitle>End of Day</OwnerSectionTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Closing checklist and daily notes for the active business day
          </p>

          <div className="mt-4 space-y-2">
            <ChecklistRow
              label="Movie Revenue"
              value={movieValue}
              complete={branchState.movieRevenue > 0}
            />
            <ChecklistRow
              label="Expenses"
              value={expensesValue}
              complete={branchState.operatingExpenses > 0}
            />
            <ChecklistRow
              label="Staff Wage"
              value={wageValue}
              complete={branchState.staffWages > 0}
            />
            <ChecklistRow
              label="Day Status"
              value={dayClosedValue}
              complete={branchState.status === "closed"}
            />
          </div>

          {dailyNotes ? (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Daily Notes
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{dailyNotes}</p>
            </div>
          ) : branchState.status !== "closed" ? (
            <p className="mt-4 text-xs text-zinc-600">
              Daily notes can be added when the day is closed in Today&apos;s Operations.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:pt-8">
          <Button href={operationsHref} variant="secondary" className="whitespace-nowrap">
            {branchState.status === "closed"
              ? "View Closed Day"
              : branchState.status === "close_requested"
                ? "Review & Close"
                : "Go to Close Day"}
          </Button>
          <p className="max-w-[220px] text-xs text-zinc-600">
            Staff submit closing requests; management approves and closes in
            Today&apos;s Operations.
          </p>
        </div>
      </div>
    </OwnerCard>
  );
}
