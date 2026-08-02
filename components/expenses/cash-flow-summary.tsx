"use client";

import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import { CASH_FLOW_PERIOD_OPTIONS } from "@/lib/expenses-module/constants";
import { cn } from "@/lib/utils";
import type { CashFlowPeriod, CashFlowSummary } from "@/types/expenses-module";

interface CashFlowSummaryProps {
  summary: CashFlowSummary;
  period: CashFlowPeriod;
  onPeriodChange: (period: CashFlowPeriod) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

const periodOptions = CASH_FLOW_PERIOD_OPTIONS.map((option) => ({
  id: option.id,
  label: option.label,
}));

export function CashFlowSummaryPanel({
  summary,
  period,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: CashFlowSummaryProps) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Period
        </h2>
        <SegmentedControl
          options={periodOptions}
          value={period}
          onChange={(value) => onPeriodChange(value as CashFlowPeriod)}
        />
        {period === "custom" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={customStart}
              onChange={(event) => onCustomStartChange(event.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={customEnd}
              onChange={(event) => onCustomEndChange(event.target.value)}
            />
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <TotalsField
            label="Sales Income"
            value={formatCurrency(summary.salesIncome)}
            valueClassName="text-emerald-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Purchase Cost"
            value={formatCurrency(summary.purchaseCost)}
            valueClassName="text-amber-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Operating Expenses"
            value={formatCurrency(summary.operatingExpenses)}
            valueClassName="text-red-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Net Cash Flow"
            value={formatCurrency(summary.netCashFlow)}
            size="lg"
            valueClassName={cn(
              summary.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          />
        </Card>
        <Card className="sm:col-span-2">
          <TotalsField
            label="Net Profit"
            value={formatCurrency(summary.netProfit)}
            size="lg"
            valueClassName={cn(
              summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          />
        </Card>
      </section>

      <p className="text-xs text-zinc-500">
        Inventory purchases are included in Purchase Cost only — not duplicated
        in Operating Expenses.
      </p>
    </div>
  );
}
