"use client";

import { useBranchState } from "@/hooks/use-branch-state";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <OwnerCard className="p-7 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <AnimatedMoney
        value={value}
        className={cn(
          "mt-5 block text-3xl font-semibold tracking-tight sm:text-4xl",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          tone === "default" && "text-white"
        )}
      />
    </OwnerCard>
  );
}

export function BusinessPulseKpis() {
  const branchState = useBranchState();

  return (
    <section className="space-y-4">
      <OwnerSectionTitle>Today Overview</OwnerSectionTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Movie Revenue" value={branchState.movieRevenue} />
        <KpiCard label="Accessory Revenue" value={branchState.accessoryRevenue} />
        <KpiCard
          label="Operating Expenses"
          value={branchState.operatingExpenses}
        />
        <KpiCard
          label="Net Cash"
          value={branchState.netCash}
          tone={branchState.netCash >= 0 ? "positive" : "negative"}
        />
      </div>
    </section>
  );
}
