"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

interface ChartTooltipEntry {
  name: string;
  value: number;
  color: string;
  payload?: { percent?: number };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
  showPercent?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  showPercent = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl animate-in fade-in duration-200">
      {label && <p className="mb-2 text-xs text-zinc-500">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="space-y-0.5">
          <p className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}
          </p>
          <p className="text-sm text-white">{formatCurrency(entry.value)}</p>
          {showPercent && entry.payload?.percent !== undefined && (
            <p className="text-xs text-zinc-500">
              {formatPercent(entry.payload.percent)} of total
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
