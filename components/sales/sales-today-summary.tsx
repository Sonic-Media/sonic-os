"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import { formatSalesCount } from "@/lib/sales/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface SalesTodaySummaryProps {
  transactions: number;
  totalRevenue: number;
  accessoryRevenue: number;
  movieRevenue: number;
  operatingExpenses: number;
  netSales: number;
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          tone === "warning" && "text-orange-400",
          tone === "default" && "text-white"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SalesTodaySummary({
  transactions,
  totalRevenue,
  accessoryRevenue,
  movieRevenue,
  operatingExpenses,
  netSales,
}: SalesTodaySummaryProps) {
  return (
    <div className={cn(uiSurface.card, "p-5 border-blue-500/15")}>
      <h3 className="text-sm font-semibold text-white">Today&apos;s Summary</h3>
      <p className="mt-0.5 text-xs text-zinc-500">Live branch sales performance</p>

      <div className="mt-4 space-y-2">
        <SummaryRow label="Transactions" value={formatSalesCount(transactions)} />
        <SummaryRow
          label="Accessory Sales"
          value={<AnimatedMoney value={accessoryRevenue} className="text-sm font-semibold" />}
          tone="positive"
        />
        <SummaryRow
          label="Movie Revenue"
          value={<AnimatedMoney value={movieRevenue} className="text-sm font-semibold" />}
        />
        <SummaryRow
          label="Total Revenue"
          value={<AnimatedMoney value={totalRevenue} className="text-sm font-semibold" />}
        />
        <SummaryRow
          label="Operating Expenses"
          value={<AnimatedMoney value={operatingExpenses} className="text-sm font-semibold" />}
          tone="warning"
        />
        <div className="border-t border-white/[0.06] pt-2">
          <SummaryRow
            label="Net Sales"
            value={<AnimatedMoney value={netSales} className="text-sm font-semibold" />}
            tone={netSales >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>
    </div>
  );
}
