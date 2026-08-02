import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { OwnerBranchComparisonRow } from "@/lib/owner-command-center/calculations";

interface OwnerBranchComparisonProps {
  branches: OwnerBranchComparisonRow[];
}

export function OwnerBranchComparison({ branches }: OwnerBranchComparisonProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Branch Comparison
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.branchCode}>
            <h3 className="text-base font-semibold text-white mb-4">
              {branch.branchName}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Today&apos;s Revenue</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(branch.revenue)}
                </span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Today&apos;s Expenses</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(branch.expenses)}
                </span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Today&apos;s Profit</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(branch.profit)}
                </span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Inventory Value</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(branch.inventoryValue)}
                </span>
              </li>
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
