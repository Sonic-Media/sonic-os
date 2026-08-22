"use client";

import { formatCurrency } from "@/lib/format";
import type { BranchTotals } from "@/types";
import { cn } from "@/lib/utils";

interface BranchCardProps {
  name: string;
  totals: BranchTotals;
}

export function BranchCard({ name, totals }: BranchCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:shadow-lg">
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
  subtitle?: string;
  date: string;
  className?: string;
}

export function DashboardGreeting({
  greeting,
  subtitle,
  date,
  className,
}: DashboardGreetingProps) {
  return (
    <section className={cn("mb-8", className)}>
      <p className="text-sm font-medium text-zinc-500 mb-1">Sonic OS</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
        {greeting} 👋
      </h1>
      {subtitle ? (
        <p className="text-sm text-zinc-400 mt-3">{subtitle}</p>
      ) : null}
      <p className="text-sm text-zinc-500 mt-2">{date}</p>
    </section>
  );
}
