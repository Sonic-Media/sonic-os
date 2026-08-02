import Link from "next/link";
import { Card } from "@/components/shared/ui/card";
import { StockStatusBadge } from "@/components/stock/stock-status-badge";
import type { OwnerLowStockAlert } from "@/lib/owner-command-center/calculations";

interface OwnerLowStockAlertsProps {
  products: OwnerLowStockAlert[];
}

export function OwnerLowStockAlerts({ products }: OwnerLowStockAlertsProps) {
  const alerts = products.slice(0, 5);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Low Stock Alerts
      </h2>

      {alerts.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">All products are adequately stocked.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((product) => (
            <Link key={product.id} href={`/stock/products/${product.id}`}>
              <Card className="flex items-center justify-between gap-3 py-4 transition-colors hover:border-zinc-700">
                <div>
                  <p className="text-sm font-medium text-white">{product.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {product.currentStock} in stock · min {product.minimumStockLevel}
                  </p>
                </div>
                <StockStatusBadge status={product.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
