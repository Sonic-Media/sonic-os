import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { BranchInventoryRow, BranchRevenueRow } from "@/types/branch";

interface BranchesBreakdownProps {
  revenueByBranch: BranchRevenueRow[];
  inventoryByBranch: BranchInventoryRow[];
}

export function BranchesBreakdown({
  revenueByBranch,
  inventoryByBranch,
}: BranchesBreakdownProps) {
  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <h3 className="text-sm font-medium text-white">Today&apos;s Revenue by Branch</h3>
        {revenueByBranch.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">No branches configured yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {revenueByBranch.map((item) => (
              <li
                key={item.branchCode}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-400">{item.branchName}</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(item.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-white">Inventory Value by Branch</h3>
        {inventoryByBranch.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">No branches configured yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {inventoryByBranch.map((item) => (
              <li
                key={item.branchCode}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-400">{item.branchName}</span>
                <span className="font-medium text-white tabular-nums">
                  {formatCurrency(item.inventoryValue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
