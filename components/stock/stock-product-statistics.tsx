import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatStockCount,
  formatStockCurrency,
} from "@/lib/stock/format";
import type { StockProductMetrics } from "@/types/stock";

interface StockProductStatisticsProps {
  metrics: StockProductMetrics;
}

export function StockProductStatistics({ metrics }: StockProductStatisticsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Statistics
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Units Purchased"
          value={metrics.totalUnitsPurchased}
          formatValue={() => formatStockCount(metrics.totalUnitsPurchased)}
        />
        <StatCard
          label="Total Units Sold"
          value={metrics.totalUnitsSold}
          formatValue={() => formatStockCount(metrics.totalUnitsSold)}
        />
        <StatCard
          label="Current Stock"
          value={metrics.currentStock}
          formatValue={() => formatStockCount(metrics.currentStock)}
        />
        <StatCard
          label="Total Inventory Value"
          value={metrics.totalInventoryValue}
          formatValue={() => formatStockCurrency(metrics.totalInventoryValue)}
        />
        <StatCard
          label="Potential Profit"
          value={metrics.potentialProfit}
          formatValue={() => formatStockCurrency(metrics.potentialProfit)}
          detailTone={metrics.potentialProfit >= 0 ? "positive" : "negative"}
        />
      </div>
    </section>
  );
}
