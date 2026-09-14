"use client";

import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

const LEGEND_ITEMS = [
  { label: "Sales", color: "bg-emerald-400" },
  { label: "Expenses", color: "bg-red-400" },
  { label: "Purchases", color: "bg-violet-400" },
  { label: "Notes / Other", color: "bg-blue-400" },
] as const;

export function CalendarLegend() {
  return (
    <div className={cn(uiSurface.cardSubtle, "flex flex-wrap gap-4 px-4 py-3")}>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs text-zinc-400">
          <span className={cn("h-2 w-2 rounded-full", item.color)} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
