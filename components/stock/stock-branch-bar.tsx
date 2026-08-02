"use client";

import { useBranches } from "@/context/branches-context";
import { useStockBranch } from "@/hooks/use-stock-branch";

export function StockBranchBar() {
  const { getBranchName } = useBranches();
  const { activeBranch } = useStockBranch();

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
        <p className="text-xs text-zinc-500">
          Stock actions and opening balances use the sidebar branch.
        </p>
      </div>
    </div>
  );
}
