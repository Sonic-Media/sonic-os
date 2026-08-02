"use client";

import { useMemo, useState } from "react";
import { StockEmptyState } from "@/components/stock/stock-empty-state";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { cn } from "@/lib/utils";
import type { StockMovement, StockMovementType } from "@/types/stock";

interface StockProductMovementHistoryProps {
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

function matchesSearch(movement: StockMovement, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    movement.reason.toLowerCase().includes(normalized) ||
    (movement.notes?.toLowerCase().includes(normalized) ?? false) ||
    formatMovementLabel(movement.movement).toLowerCase().includes(normalized) ||
    movement.quantity.toString().includes(normalized) ||
    formatMovementDate(movement.date).toLowerCase().includes(normalized)
  );
}

export function StockProductMovementHistory({
  movements,
}: StockProductMovementHistoryProps) {
  const [search, setSearch] = useState("");

  const filteredMovements = useMemo(
    () => movements.filter((movement) => matchesSearch(movement, search)),
    [movements, search]
  );

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Movement History
        </h2>
        <div className="w-full sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search movements..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search movement history"
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <StockEmptyState message="No stock movements for this item yet." />
      ) : filteredMovements.length === 0 ? (
        <StockEmptyState message="No movements match your search." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Date
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
                {filteredMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-5 py-4 text-zinc-400">
                      {formatMovementDate(movement.date)}
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
                    <td className="px-5 py-4 text-zinc-400">
                      {movement.reason}
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {movement.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
