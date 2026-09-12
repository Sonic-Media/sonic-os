"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import type { ReportsPresentationKpis } from "@/lib/reports/presentation-kpis";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface ReportsPageKpisProps extends ReportsPresentationKpis {}

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

export function ReportsPageKpis({
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  tertiaryLabel,
  tertiaryValue,
  quaternaryLabel,
  quaternaryValue,
}: ReportsPageKpisProps) {
  const tertiaryIsMoney =
    tertiaryLabel.includes("Average") ||
    tertiaryLabel.includes("Spend") ||
    tertiaryLabel.includes("Payments") ||
    tertiaryLabel.includes("Sale");

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={primaryLabel}
        value={
          <AnimatedMoney
            value={primaryValue}
            className="text-2xl font-semibold"
          />
        }
        accent="green"
      />
      <KpiCard
        label={secondaryLabel}
        value={secondaryValue.toLocaleString("en-UG")}
        accent="purple"
      />
      <KpiCard
        label={tertiaryLabel}
        value={
          tertiaryIsMoney ? (
            <AnimatedMoney
              value={tertiaryValue}
              className="text-2xl font-semibold"
            />
          ) : (
            tertiaryValue.toLocaleString("en-UG")
          )
        }
        accent="blue"
      />
      <KpiCard
        label={quaternaryLabel}
        value={quaternaryValue}
        accent="orange"
      />
    </section>
  );
}
