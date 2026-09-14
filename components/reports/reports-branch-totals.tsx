"use client";

import { Card } from "@/components/shared/ui/card";
import { TotalsGrid } from "@/components/shared/totals-grid";
import { useBranch } from "@/context/branch-context";
import { getBranchTotals } from "@/lib/aggregations";
import { getActiveBranchesForReports } from "@/lib/branch/registry";
import type { ReportSummary } from "@/types";

interface ReportsBranchTotalsProps {
  byBranch: ReportSummary["byBranch"];
  branchScope?: string;
}

export function ReportsBranchTotals({
  byBranch,
  branchScope = "all",
}: ReportsBranchTotalsProps) {
  const { activeBranches, isLoaded: branchesLoaded } = useBranch();
  const reportBranches = getActiveBranchesForReports(activeBranches).filter(
    (branch) => branchScope === "all" || branch.code === branchScope
  );

  if (!branchesLoaded) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        By Branch
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reportBranches.map((branch) => {
          const totals = getBranchTotals(byBranch, branch.code);
          return (
            <Card
              key={branch.code}
              className="border-white/[0.08] bg-[rgba(12,14,26,0.72)]"
            >
              <h3 className="text-base font-semibold text-white mb-4">
                {branch.name}
              </h3>
              <TotalsGrid
                sales={totals.sales}
                expenses={totals.expenses}
                savings={totals.savings}
                size="lg"
              />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
