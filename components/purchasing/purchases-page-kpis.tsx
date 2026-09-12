"use client";

import {
  formatPurchasingCount,
  PURCHASING_PLACEHOLDER,
} from "@/lib/purchasing/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { PurchasesPageKpis } from "@/hooks/use-purchases-page";
import { cn } from "@/lib/utils";

interface PurchasesPageKpisProps extends PurchasesPageKpis {}

function formatLastPurchase(
  date: string | null,
  label: string | null
): string {
  if (!date) return PURCHASING_PLACEHOLDER;

  const parsed = new Date(date + "T12:00:00");
  const dateLabel = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-UG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return label ? `${dateLabel} · ${label}` : dateLabel;
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
      <div className="mt-3 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function PurchasesPageKpis({
  totalPurchases,
  suppliers,
  pendingDeliveries,
  lastPurchaseDate,
  lastPurchaseLabel,
}: PurchasesPageKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Purchases"
        value={formatPurchasingCount(totalPurchases)}
        accent="blue"
      />
      <KpiCard
        label="Suppliers"
        value={formatPurchasingCount(suppliers)}
        accent="purple"
      />
      <KpiCard
        label="Pending Deliveries"
        value={formatPurchasingCount(pendingDeliveries)}
        accent="orange"
      />
      <KpiCard
        label="Last Purchase"
        value={formatLastPurchase(lastPurchaseDate, lastPurchaseLabel)}
        accent="green"
      />
    </section>
  );
}
