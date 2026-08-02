import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatSalesCount,
  formatSalesCurrency,
  SALES_PLACEHOLDER,
} from "@/lib/sales/format";
import type { BranchAnalyticsSnapshot } from "@/types/branch";

interface BranchAnalyticsSummaryProps {
  analytics: BranchAnalyticsSnapshot;
}

export function BranchAnalyticsSummary({
  analytics,
}: BranchAnalyticsSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Today's Revenue"
        value={analytics.todayRevenue}
        size="large"
        formatValue={() => formatSalesCurrency(analytics.todayRevenue)}
        className="sm:col-span-2 lg:col-span-3"
      />
      <StatCard
        label="Today's Profit"
        value={analytics.todayProfit}
        formatValue={() => formatSalesCurrency(analytics.todayProfit)}
        detailTone={analytics.todayProfit >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Inventory Value"
        value={analytics.inventoryValue}
        formatValue={() => formatSalesCurrency(analytics.inventoryValue)}
      />
      <StatCard
        label="Purchases"
        value={analytics.purchases}
        formatValue={() => formatSalesCurrency(analytics.purchases)}
      />
      <StatCard
        label="Expenses"
        value={analytics.expenses}
        formatValue={() => formatSalesCurrency(analytics.expenses)}
      />
      <StatCard
        label="Cash Flow"
        value={analytics.cashFlow}
        formatValue={() => formatSalesCurrency(analytics.cashFlow)}
        detailTone={analytics.cashFlow >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Top Selling Product"
        value={0}
        formatValue={() => analytics.topSellingProduct ?? SALES_PLACEHOLDER}
        className="sm:col-span-2"
      />
      <StatCard
        label="Top Customer"
        value={0}
        formatValue={() => analytics.topCustomer ?? SALES_PLACEHOLDER}
      />
      <StatCard
        label="Staff Count"
        value={analytics.staffCount}
        formatValue={() => formatSalesCount(analytics.staffCount)}
      />
      <StatCard
        label="Low Stock"
        value={analytics.lowStock}
        formatValue={() => formatSalesCount(analytics.lowStock)}
      />
    </section>
  );
}
