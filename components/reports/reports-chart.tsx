"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ChartDataPoint } from "@/types";

interface ReportsChartProps {
  data: ChartDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl">
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function ReportsChart({ data }: ReportsChartProps) {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Charts
      </h2>
      <Card className="!p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
              <Bar dataKey="sales" name="Sales" fill="#ffffff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#52525b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
