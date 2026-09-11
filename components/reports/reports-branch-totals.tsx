"use client";

import { Card } from "@/components/shared/ui/card";
import { TotalsGrid } from "@/components/shared/totals-grid";
import { useBranch } from "@/context/branch-context";
import { getBranchTotals } from "@/lib/aggregations";
import { getActiveBranchesForReports } from "@/lib/branch/registry";
import type { ReportSummary } from "@/types";

interface ReportsBranchTotalsProps {
  byBranch: ReportSummary["byBranch"];
}

export function ReportsBranchTotals({ byBranch }: ReportsBranchTotalsProps) {
  const { activeBranches, isLoaded: branchesLoaded } = useBranch();
  const reportBranches = getActiveBranchesForReports(activeBranches);

  if (!branchesLoaded) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        By Branch
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reportBranches.map((branch) => {
          const totals = getBranchTotals(byBranch, branch.code);
          return (
            <Card key={branch.code}>
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
