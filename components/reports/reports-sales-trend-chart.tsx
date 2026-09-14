"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatChartAxisValue } from "@/lib/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";

interface ReportsSalesTrendChartProps {
  data: ChartDataPoint[];
  dataKey?: "sales" | "expenses" | "savings";
  title?: string;
  subtitle?: string;
  color?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,18,0.98)] px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-white">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
}

export function ReportsSalesTrendChart({
  data,
  dataKey = "sales",
  title = "Sales Trend",
  subtitle = "Performance over the selected period",
  color = "#34d399",
}: ReportsSalesTrendChartProps) {
  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>

      <div className="h-72 w-full p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reportsTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatChartAxisValue(Number(value))}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill="url(#reportsTrendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
