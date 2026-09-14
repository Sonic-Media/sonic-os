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
    <div className="rounded-[14px] border border-white/[0.08] bg-[rgba(12,14,26,0.72)] p-5 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]">
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
    <section className={cn("space-y-2", className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
        {greeting} 👋
      </h1>
      {subtitle ? (
        <p className="text-sm text-zinc-400">{subtitle}</p>
      ) : null}
      <p className="text-sm text-zinc-500">{date}</p>
    </section>
  );
}
