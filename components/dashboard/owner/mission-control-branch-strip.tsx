"use client";

import { useBranch } from "@/context/branch-context";
import {
  formatBranchOperationsStatusLabel,
  type BranchOperationsStatus,
} from "@/lib/branch/operations-state";
import { useAllBranchesOperations } from "@/hooks/use-all-branches-operations";
import { cn } from "@/lib/utils";

function statusTone(status: BranchOperationsStatus) {
  if (status === "open") return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
  if (status === "closed") return "text-zinc-400 border-white/[0.06] bg-white/[0.02]";
  return "text-orange-400 border-orange-500/20 bg-orange-500/5";
}

export function MissionControlBranchStrip() {
  const { activeBranch, setActiveBranch, getBranchName, canSwitchBranch } = useBranch();
  const snapshots = useAllBranchesOperations();

  if (snapshots.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {snapshots.map((snapshot) => {
        const isSelected = snapshot.branch === activeBranch;

        return (
          <button
            key={snapshot.branch}
            type="button"
            disabled={!canSwitchBranch}
            onClick={() => {
              if (canSwitchBranch) {
                void setActiveBranch(snapshot.branch);
              }
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all",
              statusTone(snapshot.status),
              isSelected && "ring-1 ring-indigo-500/30",
              canSwitchBranch && "hover:border-white/[0.12]"
            )}
          >
            <span className="font-medium text-white">
              {getBranchName(snapshot.branch)}
            </span>
            <span className="text-xs opacity-80">
              {formatBranchOperationsStatusLabel(snapshot.status)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
