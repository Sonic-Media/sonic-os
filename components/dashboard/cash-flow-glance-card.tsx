"use client";

import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { cn } from "@/lib/utils";

function CashFlowRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className={cn("text-sm font-semibold text-white", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function CashFlowGlanceCard({ className }: { className?: string }) {
  const { summary } = useCashFlow("today");

  return (
    <Card
      className={cn(
        "transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:shadow-lg",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Cash Flow Today
      </h2>

      <div className="space-y-3">
        <CashFlowRow
          label="Sales Income"
          value={formatCurrency(summary.salesIncome)}
          valueClassName="text-emerald-400"
        />
        <CashFlowRow
          label="Purchases"
          value={formatCurrency(summary.purchaseCost)}
          valueClassName="text-amber-400"
        />
        <CashFlowRow
          label="Operating Expenses"
          value={formatCurrency(summary.operatingExpenses)}
        />
        <CashFlowRow
          label="Net Cash Flow"
          value={formatCurrency(summary.netCashFlow)}
          valueClassName={
            summary.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
          }
        />
      </div>
    </Card>
  );
}
