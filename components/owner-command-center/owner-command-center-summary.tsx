import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatSalesCount,
  formatSalesCurrency,
  SALES_PLACEHOLDER,
} from "@/lib/sales/format";
import type { OwnerCommandCenterMetrics } from "@/lib/owner-command-center/calculations";

interface OwnerCommandCenterSummaryProps {
  metrics: OwnerCommandCenterMetrics;
}

export function OwnerCommandCenterSummary({
  metrics,
}: OwnerCommandCenterSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Today's Revenue"
        value={metrics.todayRevenue}
        size="large"
        formatValue={() => formatSalesCurrency(metrics.todayRevenue)}
        className="sm:col-span-2 lg:col-span-3"
      />
      <StatCard
        label="Today's Expenses"
        value={metrics.todayExpenses}
        formatValue={() => formatSalesCurrency(metrics.todayExpenses)}
      />
      <StatCard
        label="Today's Purchases"
        value={metrics.todayPurchases}
        formatValue={() => formatSalesCurrency(metrics.todayPurchases)}
      />
      <StatCard
        label="Today's Profit"
        value={metrics.todayProfit}
        formatValue={() => formatSalesCurrency(metrics.todayProfit)}
        detailTone={metrics.todayProfit >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Inventory Value"
        value={metrics.inventoryValue}
        formatValue={() => formatSalesCurrency(metrics.inventoryValue)}
      />
      <StatCard
        label="Cash Available"
        value={metrics.cashAvailable}
        formatValue={() => formatSalesCurrency(metrics.cashAvailable)}
        detailTone={metrics.cashAvailable >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Top Selling Product"
        value={0}
        formatValue={() => metrics.topSellingProduct ?? SALES_PLACEHOLDER}
        className="sm:col-span-2"
      />
      <StatCard
        label="Low Stock Alerts"
        value={metrics.lowStockAlerts}
        formatValue={() => formatSalesCount(metrics.lowStockAlerts)}
      />
    </section>
  );
}
