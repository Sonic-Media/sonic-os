"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import { formatSalesCount } from "@/lib/sales/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface SalesPageKpisProps {
  transactions: number;
  totalRevenue: number;
  accessoryRevenue: number;
  movieRevenue: number;
}

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

export function SalesPageKpis({
  transactions,
  totalRevenue,
  accessoryRevenue,
  movieRevenue,
}: SalesPageKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Transactions"
        value={formatSalesCount(transactions)}
        accent="purple"
      />
      <KpiCard
        label="Total Revenue"
        value={<AnimatedMoney value={totalRevenue} className="text-2xl font-semibold" />}
        accent="green"
      />
      <KpiCard
        label="Accessories"
        value={<AnimatedMoney value={accessoryRevenue} className="text-2xl font-semibold" />}
        accent="blue"
      />
      <KpiCard
        label="Movies"
        value={<AnimatedMoney value={movieRevenue} className="text-2xl font-semibold" />}
        accent="orange"
      />
    </section>
  );
}
