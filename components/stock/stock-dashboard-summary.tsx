import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatStockCount,
  formatStockCurrency,
} from "@/lib/stock/format";
import type { StockDashboardMetrics } from "@/types/stock";

interface StockDashboardSummaryProps {
  metrics: StockDashboardMetrics;
}

export function StockDashboardSummary({ metrics }: StockDashboardSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Inventory Value"
        value={metrics.inventoryValue ?? 0}
        size="large"
        formatValue={() => formatStockCurrency(metrics.inventoryValue)}
        className="sm:col-span-2 lg:col-span-3"
      />
      <StatCard
        label="Total Products"
        value={metrics.totalProducts ?? 0}
        formatValue={() => formatStockCount(metrics.totalProducts)}
      />
      <StatCard
        label="Low Stock"
        value={metrics.lowStock ?? 0}
        formatValue={() => formatStockCount(metrics.lowStock)}
      />
      <StatCard
        label="Out of Stock"
        value={metrics.outOfStock ?? 0}
        formatValue={() => formatStockCount(metrics.outOfStock)}
      />
      <StatCard
        label="Today's Stock In"
        value={metrics.todayStockIn ?? 0}
        formatValue={() => formatStockCount(metrics.todayStockIn)}
      />
      <StatCard
        label="Today's Stock Out"
        value={metrics.todayStockOut ?? 0}
        formatValue={() => formatStockCount(metrics.todayStockOut)}
      />
    </section>
  );
}
