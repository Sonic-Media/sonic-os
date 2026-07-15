"use client";

import { StatCard } from "@/components/shared/ui/stat-card";
import { formatCurrency } from "@/lib/format";
import type { BranchTotals } from "@/types";
import { cn } from "@/lib/utils";

interface BranchCardProps {
  name: string;
  totals: BranchTotals;
}

export function BranchCard({ name, totals }: BranchCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-lg shadow-black/20">
      <h3 className="text-base font-semibold text-white mb-4">{name}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Today&apos;s Sales
          </p>
          <p className="text-xl font-semibold text-white mt-1 tracking-tight">
            {formatCurrency(totals.sales)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Today&apos;s Savings
          </p>
          <p
            className={cn(
              "text-xl font-semibold mt-1 tracking-tight",
              totals.savings >= 0 ? "text-white" : "text-red-400"
            )}
          >
            {formatCurrency(totals.savings)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface DashboardGreetingProps {
  greeting: string;
  date: string;
}

export function DashboardGreeting({ greeting, date }: DashboardGreetingProps) {
  return (
    <section className="mb-8">
      <p className="text-sm font-medium text-zinc-500 mb-1">Sonic OS</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
        {greeting} 👋
      </h1>
      <p className="text-sm text-zinc-500 mt-2">{date}</p>
    </section>
  );
}

export function DashboardStats({
  sales,
  expenses,
  savings,
}: {
  sales: number;
  expenses: number;
  savings: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-8">
      <StatCard label="Today's Sales" value={sales} size="large" />
      <StatCard label="Today's Expenses" value={expenses} size="large" />
      <StatCard
        label="Today's Savings"
        value={savings}
        size="large"
        variant={savings >= 0 ? "accent" : "default"}
        className="col-span-2 sm:col-span-1"
      />
    </section>
  );
}
