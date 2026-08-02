import { StatCard } from "@/components/shared/ui/stat-card";
import {
  formatPurchasingCount,
  formatPurchasingCurrency,
  PURCHASING_PLACEHOLDER,
} from "@/lib/purchasing/format";
import type { PurchasingDashboardMetrics } from "@/types/purchasing";

interface PurchasingDashboardSummaryProps {
  metrics: PurchasingDashboardMetrics;
}

export function PurchasingDashboardSummary({
  metrics,
}: PurchasingDashboardSummaryProps) {
  return (
    <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2">
      <StatCard
        label="Today's Purchases"
        value={metrics.todaysPurchases ?? 0}
        formatValue={() => formatPurchasingCount(metrics.todaysPurchases)}
      />
      <StatCard
        label="Monthly Purchases"
        value={metrics.monthlyPurchases ?? 0}
        formatValue={() => formatPurchasingCount(metrics.monthlyPurchases)}
      />
      <StatCard
        label="Total Purchase Value"
        value={metrics.totalPurchaseValue ?? 0}
        size="large"
        formatValue={() => formatPurchasingCurrency(metrics.totalPurchaseValue)}
        className="sm:col-span-2"
      />
      <StatCard
        label="Top Supplier"
        value={0}
        formatValue={() => metrics.topSupplier ?? PURCHASING_PLACEHOLDER}
        className="sm:col-span-2"
      />
    </section>
  );
}
