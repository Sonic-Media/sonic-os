"use client";

import { AnimatedMoney, OwnerCard } from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/types";

interface BusinessPulseHeroProps {
  summary: ReportSummary;
  accessorySales?: number;
}

function PulseMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <AnimatedMoney
        value={value}
        className={cn(
          "block text-4xl font-semibold sm:text-5xl",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          tone === "default" && "text-white"
        )}
      />
    </div>
  );
}

export function BusinessPulseHero({
  summary,
  accessorySales = 0,
}: BusinessPulseHeroProps) {
  const totalRevenue = summary.totalSales + accessorySales;
  const netProfit = summary.totalSavings;

  return (
    <OwnerCard hero className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Business Pulse
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          How your business is performing today.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <PulseMetric label="Today's Revenue" value={totalRevenue} tone="default" />
          <PulseMetric
            label="Today's Expenses"
            value={summary.totalExpenses}
            tone="default"
          />
          <PulseMetric
            label="Today's Net Profit"
            value={netProfit}
            tone={netProfit >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>
    </OwnerCard>
  );
}
