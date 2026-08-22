import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatSalesCount,
  formatSalesCurrency,
  SALES_PLACEHOLDER,
} from "@/lib/sales/format";
import type { SalesDashboardMetrics } from "@/types/sales";

interface SalesDashboardSummaryProps {
  metrics: SalesDashboardMetrics;
}

export function SalesDashboardSummary({ metrics }: SalesDashboardSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Today's Revenue"
        value={metrics.todayRevenue ?? 0}
        size="large"
        formatValue={() => formatSalesCurrency(metrics.todayRevenue)}
        className="sm:col-span-2 lg:col-span-3"
      />
      <StatCard
        label="Today's Profit"
        value={metrics.todayProfit ?? 0}
        formatValue={() => formatSalesCurrency(metrics.todayProfit)}
        detailTone={
          metrics.todayProfit !== null && metrics.todayProfit >= 0
            ? "positive"
            : "negative"
        }
      />
      <StatCard
        label="Items Sold Today"
        value={metrics.itemsSoldToday ?? 0}
        formatValue={() => formatSalesCount(metrics.itemsSoldToday)}
      />
      <StatCard
        label="Transactions Today"
        value={metrics.transactionsToday ?? 0}
        formatValue={() => formatSalesCount(metrics.transactionsToday)}
      />
      <StatCard
        label="Average Accessory Sale"
        value={metrics.averageSaleValue ?? 0}
        formatValue={() => formatSalesCurrency(metrics.averageSaleValue)}
      />
      <StatCard
        label="Top Selling Item"
        value={0}
        formatValue={() => metrics.topSellingItem ?? SALES_PLACEHOLDER}
        className="sm:col-span-2"
      />
    </section>
  );
}
