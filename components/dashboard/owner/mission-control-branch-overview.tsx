"use client";

import { useActiveBranch } from "@/context/active-branch-context";
import { useBranch } from "@/context/branch-context";
import {
  formatBranchOperationsStatusLabel,
  type BranchOperationsStatus,
} from "@/lib/branch/operations-state";
import { useAllBranchesOperations } from "@/hooks/use-all-branches-operations";
import { formatClockTime } from "@/lib/staff/attendance";
import { OwnerCard, OwnerSectionTitle } from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function statusTone(status: BranchOperationsStatus) {
  if (status === "open") return "text-emerald-400";
  if (status === "closed") return "text-zinc-400";
  return "text-amber-400";
}

function statusDot(status: BranchOperationsStatus) {
  if (status === "open") return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
  if (status === "closed") return "bg-zinc-500";
  return "bg-amber-400";
}

function staffWorkingLabel(
  status: BranchOperationsStatus,
  staffNames: string[]
): string {
  if (staffNames.length === 0) {
    return status === "waiting" ? "Waiting for staff" : "No one on shift";
  }

  const names = staffNames.join(", ");
  if (status === "waiting") {
    return `${names} (on shift; branch not opened)`;
  }

  return names;
}

export function MissionControlBranchOverview() {
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useBranch();
  const snapshots = useAllBranchesOperations();

  if (snapshots.length <= 1) {
    return null;
  }

  return (
    <section className="space-y-4">
      <OwnerSectionTitle>All Branches</OwnerSectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {snapshots.map((snapshot) => {
          const isSelected = snapshot.branch === activeBranch;
          const staffNames = snapshot.activeStaff.map((staff) => staff.staffName);

          return (
            <OwnerCard
              key={snapshot.branch}
              className={cn(
                "p-6",
                isSelected && "ring-1 ring-white/15"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {isSelected ? "Selected Branch" : "Branch"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {getBranchName(snapshot.branch)}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", statusDot(snapshot.status))}
                  />
                  <span className={cn("text-sm font-medium", statusTone(snapshot.status))}>
                    {formatBranchOperationsStatusLabel(snapshot.status)}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Opened By
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {snapshot.openedByName ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Opened At
                  </p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-white">
                    {formatClockTime(snapshot.openedAt)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Staff Working
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {staffWorkingLabel(snapshot.status, staffNames)}
                  </p>
                </div>
              </div>
            </OwnerCard>
          );
        })}
      </div>
    </section>
  );
}
