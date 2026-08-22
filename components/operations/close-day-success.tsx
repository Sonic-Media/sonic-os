"use client";

import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { DayClosingRecord } from "@/types/day-closing";

interface CloseDaySuccessProps {
  staffName: string;
  record: DayClosingRecord;
  movieRevenue: number;
  accessorySales: number;
  savings: number;
  onDone: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-b-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

function formatClosingTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CloseDaySuccess({
  staffName,
  record,
  movieRevenue,
  accessorySales,
  savings,
  onDone,
}: CloseDaySuccessProps) {
  const totalRevenue = movieRevenue + accessorySales;

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">
          Great work today, {staffName} 👏
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Today&apos;s operations have been recorded successfully.
        </p>
      </div>

      <Card className="px-5 py-2">
        <SummaryRow label="Movie Revenue" value={formatCurrency(movieRevenue)} />
        <SummaryRow
          label="Accessory Sales"
          value={formatCurrency(accessorySales)}
        />
        <SummaryRow label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <SummaryRow
          label="Total Expenses"
          value={formatCurrency(record.summary.expenses)}
        />
        <SummaryRow
          label="Staff Payment"
          value={formatCurrency(record.summary.staffPayments)}
        />
        <SummaryRow label="Savings" value={formatCurrency(savings)} />
        <SummaryRow
          label="Closing Time"
          value={formatClosingTime(record.closedAt)}
        />
      </Card>

      <Button type="button" size="lg" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
