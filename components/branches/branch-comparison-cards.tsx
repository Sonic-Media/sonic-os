import { Card } from "@/components/shared/ui/card";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import {
  formatSalesCount,
  SALES_PLACEHOLDER,
} from "@/lib/sales/format";
import type { BranchAnalyticsSnapshot } from "@/types/branch";

interface BranchComparisonCardsProps {
  snapshots: BranchAnalyticsSnapshot[];
}

export function BranchComparisonCards({ snapshots }: BranchComparisonCardsProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Kansanga vs Salaama
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.branchCode}>
            <h3 className="text-base font-semibold text-white mb-4">
              {snapshot.branchName}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <TotalsField
                label="Today's Revenue"
                value={formatCurrency(snapshot.todayRevenue)}
                size="sm"
              />
              <TotalsField
                label="Today's Profit"
                value={formatCurrency(snapshot.todayProfit)}
                size="sm"
              />
              <TotalsField
                label="Inventory Value"
                value={formatCurrency(snapshot.inventoryValue)}
                size="sm"
              />
              <TotalsField
                label="Purchases"
                value={formatCurrency(snapshot.purchases)}
                size="sm"
              />
              <TotalsField
                label="Expenses"
                value={formatCurrency(snapshot.expenses)}
                size="sm"
              />
              <TotalsField
                label="Cash Flow"
                value={formatCurrency(snapshot.cashFlow)}
                size="sm"
                valueClassName={
                  snapshot.cashFlow >= 0 ? undefined : "text-red-400"
                }
              />
              <TotalsField
                label="Top Product"
                value={snapshot.topSellingProduct ?? SALES_PLACEHOLDER}
                size="sm"
              />
              <TotalsField
                label="Top Customer"
                value={snapshot.topCustomer ?? SALES_PLACEHOLDER}
                size="sm"
              />
              <TotalsField
                label="Staff"
                value={formatSalesCount(snapshot.staffCount)}
                size="sm"
              />
              <TotalsField
                label="Low Stock"
                value={formatSalesCount(snapshot.lowStock)}
                size="sm"
              />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
