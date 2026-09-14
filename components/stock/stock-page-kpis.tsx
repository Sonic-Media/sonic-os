"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import { formatStockCount } from "@/lib/stock/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StockPageKpis } from "@/hooks/use-stock-page";
import { cn } from "@/lib/utils";

interface StockPageKpisProps extends StockPageKpis {}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent: "blue" | "green" | "purple" | "orange";
}) {
  const border = {
    blue: "border-blue-500/15",
    green: "border-emerald-500/15",
    purple: "border-violet-500/15",
    orange: "border-orange-500/15",
  }[accent];

  return (
    <div className={cn(uiSurface.card, "p-5", border)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function StockPageKpis({
  totalItems,
  lowStock,
  outOfStock,
  totalStockValue,
}: StockPageKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Items"
        value={formatStockCount(totalItems)}
        accent="purple"
      />
      <KpiCard
        label="Low Stock"
        value={formatStockCount(lowStock)}
        accent="orange"
      />
      <KpiCard
        label="Out of Stock"
        value={formatStockCount(outOfStock)}
        accent="blue"
      />
      <KpiCard
        label="Total Stock Value"
        value={
          <AnimatedMoney
            value={totalStockValue}
            className="text-2xl font-semibold"
          />
        }
        accent="green"
      />
    </section>
  );
}
