import { getStockStatusLabel } from "@/lib/stock/constants";
import { cn } from "@/lib/utils";
import type { StockProductStatus } from "@/types/stock";

const STATUS_STYLES: Record<StockProductStatus, string> = {
  "in-stock": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "low-stock": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "out-of-stock": "bg-red-500/10 text-red-400 border-red-500/20",
};

interface StockStatusBadgeProps {
  status: StockProductStatus;
}

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {getStockStatusLabel(status)}
    </span>
  );
}
