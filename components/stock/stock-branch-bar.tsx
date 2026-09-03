"use client";

import { ActiveBranchLabel } from "@/components/shared/layout/active-branch-label";
import { useBranch } from "@/context/branch-context";

export function StockBranchBar() {
  const { getBranchName, activeBranch } = useBranch();

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Active Branch
          </p>
          <p className="text-sm font-medium text-white">
            {getBranchName(activeBranch)}
          </p>
        </div>
        <ActiveBranchLabel label="Switch branch in sidebar" className="text-right" />
      </div>
    </div>
  );
}
