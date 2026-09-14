"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranchState } from "@/hooks/use-branch-state";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function StatusCell({ label, value, complete }: {
  label: string;
  value: string;
  complete?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-medium",
          complete ? "text-emerald-400" : "text-zinc-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MissionControlEndOfDay() {
  const { activeBranch } = useActiveBranch();
  const branchState = useBranchState();

  const operationsHref = useMemo(
    () => `/operations/today?branch=${encodeURIComponent(activeBranch)}`,
    [activeBranch]
  );

  const movieValue =
    branchState.movieRevenue > 0 ? "Recorded" : "Pending";
  const expensesValue =
    branchState.operatingExpenses > 0 ? "Recorded" : "Pending";
  const wageValue = branchState.staffWages > 0 ? "Recorded" : "Pending";
  const dayStatusValue =
    branchState.status === "closed"
      ? "Closed"
      : branchState.status === "close_requested"
        ? "Closing request pending"
        : "Open";

  const pendingCount = [
    branchState.movieRevenue <= 0,
    branchState.operatingExpenses <= 0,
    branchState.staffWages <= 0,
    branchState.status === "open",
  ].filter(Boolean).length;

  const ctaLabel =
    branchState.status === "closed"
      ? "View Closed Day"
      : branchState.status === "close_requested"
        ? "Review & Close"
        : "Go to Close Day";

  return (
    <OwnerCard accent="green" className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <OwnerSectionTitle>End of Day</OwnerSectionTitle>
          <p className="mt-1 text-xs text-zinc-500">
            {branchState.status === "closed"
              ? "Business day closed"
              : `Day ${dayStatusValue.toLowerCase()} · ${pendingCount} item${pendingCount === 1 ? "" : "s"} pending`}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatusCell
              label="Movie Revenue"
              value={movieValue}
              complete={branchState.movieRevenue > 0}
            />
            <StatusCell
              label="Expenses"
              value={expensesValue}
              complete={branchState.operatingExpenses > 0}
            />
            <StatusCell
              label="Staff Wage"
              value={wageValue}
              complete={branchState.staffWages > 0}
            />
            <StatusCell
              label="Day Status"
              value={dayStatusValue}
              complete={branchState.status === "closed"}
            />
          </div>
        </div>

        <Link
          href={operationsHref}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
        >
          {ctaLabel} →
        </Link>
      </div>
    </OwnerCard>
  );
}
