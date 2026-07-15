"use client";

import { formatCurrency, formatPercent } from "@/lib/format";
import { calculateChartProfitMargin } from "@/lib/chart-utils";
import type { ChartDataPoint } from "@/types";

interface ChartAnalyticsTooltipProps {
  active?: boolean;
  payload?: { payload?: ChartDataPoint & { profit?: number; branch?: string } }[];
  label?: string;
  showProfit?: boolean;
}

export function ChartAnalyticsTooltip({
  active,
  payload,
  label,
  showProfit = true,
}: ChartAnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const dateLabel = point.branch ?? label ?? "—";
  const profitMargin =
    point.profit ?? calculateChartProfitMargin(point.sales, point.savings);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl animate-in fade-in duration-200">
      <p className="mb-2 text-xs text-zinc-500">{dateLabel}</p>
      <div className="space-y-1.5">
        <TooltipRow label="Sales" value={formatCurrency(point.sales)} />
        <TooltipRow label="Expenses" value={formatCurrency(point.expenses)} />
        <TooltipRow label="Savings" value={formatCurrency(point.savings)} />
        {showProfit && (
          <TooltipRow
            label="Profit Margin"
            value={formatPercent(profitMargin)}
          />
        )}
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
