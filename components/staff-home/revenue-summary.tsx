"use client";

import { formatCurrency } from "@/lib/format";
import { getServiceRevenueLabel, type StaffServiceId } from "@/lib/staff-home/services";
import type { StaffHomeRevenueBreakdown } from "@/lib/staff-home/revenue";
import { cn } from "@/lib/utils";

const REVENUE_ROWS: Array<{
  key: keyof Omit<StaffHomeRevenueBreakdown, "total">;
  id: StaffServiceId;
}> = [
  { key: "movies", id: "movies" },
  { key: "accessories", id: "accessories" },
  { key: "services", id: "services" },
  { key: "printing", id: "printing" },
  { key: "windows", id: "windows" },
  { key: "other", id: "other" },
];

interface RevenueSummaryProps {
  revenue: StaffHomeRevenueBreakdown;
  className?: string;
}

export function RevenueSummary({ revenue, className }: RevenueSummaryProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[rgba(16,18,30,0.95)] to-[rgba(8,10,18,0.9)] p-5 sm:p-6",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Today&apos;s Revenue
      </p>

      <div className="mt-5 space-y-3">
        {REVENUE_ROWS.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-zinc-400">{getServiceRevenueLabel(row.id)}</span>
            <span className="font-semibold tabular-nums text-white">
              {formatCurrency(revenue[row.key])}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/[0.08] pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-300">Total Revenue</span>
          <span className="text-base font-bold tabular-nums text-white">
            {formatCurrency(revenue.total)}
          </span>
        </div>
      </div>
    </section>
  );
}
