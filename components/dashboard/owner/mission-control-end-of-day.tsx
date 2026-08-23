"use client";

import { useBranchState } from "@/hooks/use-branch-state";
import { formatCurrency } from "@/lib/format";
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.05] bg-zinc-950/40 px-4 py-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p
        className={cn(
          "text-sm font-medium",
          complete ? "text-emerald-400" : "text-zinc-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MissionControlEndOfDay() {
  const branchState = useBranchState();

  const movieValue =
    branchState.movieRevenue > 0
      ? formatCurrency(branchState.movieRevenue)
      : "Waiting...";
  const expensesValue =
    branchState.operatingExpenses > 0 ? "Recorded" : "Waiting...";
  const wageValue = branchState.staffWages > 0 ? "Recorded" : "Waiting...";
  const dayClosedValue = branchState.status === "closed" ? "Yes" : "No";

  return (
    <OwnerCard>
      <OwnerSectionTitle>End Of Day Status</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Live checklist for today&apos;s closing workflow.
      </p>

      <div className="mt-6 space-y-3">
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
          label="Day Closed"
          value={dayClosedValue}
          complete={branchState.status === "closed"}
        />
      </div>
    </OwnerCard>
  );
}
