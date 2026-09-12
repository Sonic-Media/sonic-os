"use client";

import { formatCurrency } from "@/lib/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { ExpenseBreakdownItem } from "@/types";
import { cn } from "@/lib/utils";

interface ReportsCategoryPanelProps {
  items: ExpenseBreakdownItem[];
  title?: string;
  subtitle?: string;
}

export function ReportsCategoryPanel({
  items,
  title = "Sales by Category",
  subtitle = "Category totals from completed daily operations",
}: ReportsCategoryPanelProps) {
  const ranked = [...items]
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount);
  const maxAmount = ranked[0]?.amount ?? 0;

  return (
    <aside className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>

      {ranked.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No category totals for this period.
        </div>
      ) : (
        <ul className="space-y-4 p-5">
          {ranked.map((item) => {
            const width =
              maxAmount > 0 ? Math.max(8, (item.amount / maxAmount) * 100) : 0;

            return (
              <li key={item.key}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">
                    {item.label}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-300">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-indigo-400/80"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
