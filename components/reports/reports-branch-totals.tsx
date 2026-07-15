import { BRANCHES } from "@/lib/constants";
import { Card } from "@/components/shared/ui/card";
import { TotalsGrid } from "@/components/shared/totals-grid";
import type { ReportSummary } from "@/types";

interface ReportsBranchTotalsProps {
  byBranch: ReportSummary["byBranch"];
}

export function ReportsBranchTotals({ byBranch }: ReportsBranchTotalsProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        By Branch
      </h2>
      <div className="space-y-3">
        {BRANCHES.map((branch) => {
          const totals = byBranch[branch.id];
          return (
            <Card key={branch.id}>
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
