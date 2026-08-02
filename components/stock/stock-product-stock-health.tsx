import { Card } from "@/components/shared/ui/card";
import { StockStatusBadge } from "@/components/stock/stock-status-badge";
import { STOCK_PLACEHOLDER } from "@/lib/stock/format";
import type { StockMovement, StockProduct } from "@/types/stock";

interface StockProductStockHealthProps {
  product: StockProduct;
  lastStockIn?: StockMovement;
  lastStockOut?: StockMovement;
}

function formatMovementDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLastMovement(movement?: StockMovement): string {
  if (!movement) return STOCK_PLACEHOLDER;
  return `${formatMovementDate(movement.date)} · ${movement.quantity.toLocaleString("en-UG")} units`;
}

export function StockProductStockHealth({
  product,
  lastStockIn,
  lastStockOut,
}: StockProductStockHealthProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Stock Health
      </h2>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">Current Status</p>
          <StockStatusBadge status={product.status} />
        </div>
        <div className="grid grid-cols-1 gap-4 border-t border-zinc-800/80 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Last Stock In
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {formatLastMovement(lastStockIn)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Last Stock Out
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {formatLastMovement(lastStockOut)}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
