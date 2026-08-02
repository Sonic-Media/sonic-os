import { StockEmptyState } from "@/components/stock/stock-empty-state";
import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";
import type { StockMovement, StockMovementType } from "@/types/stock";

interface StockMovementTableProps {
  movements: StockMovement[];
}

const MOVEMENT_STYLES: Record<StockMovementType, string> = {
  in: "text-emerald-400",
  out: "text-red-400",
};

function formatMovementLabel(movement: StockMovementType): string {
  return movement === "in" ? "Stock In" : "Stock Out";
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

export function StockMovementTable({ movements }: StockMovementTableProps) {
  if (movements.length === 0) {
    return <StockEmptyState message="No stock movements yet." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Date
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Product
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Movement
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Quantity
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Reason
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr
                key={movement.id}
                className="relative border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="relative px-5 py-4 text-zinc-400">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-zinc-700"
                  />
                  {formatMovementDate(movement.date)}
                </td>
                <td className="px-5 py-4 font-medium text-white">
                  {movement.productName}
                </td>
                <td
                  className={cn(
                    "px-5 py-4 font-medium",
                    MOVEMENT_STYLES[movement.movement]
                  )}
                >
                  {formatMovementLabel(movement.movement)}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {movement.quantity.toLocaleString("en-UG")}
                </td>
                <td className="px-5 py-4 text-zinc-400">{movement.reason}</td>
                <td className="px-5 py-4 text-zinc-500">
                  {movement.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
