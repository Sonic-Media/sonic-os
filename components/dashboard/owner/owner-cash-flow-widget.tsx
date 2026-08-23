"use client";

import { useCashFlow } from "@/hooks/use-cash-flow";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function CashFlowRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.04] bg-zinc-900/40 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <AnimatedMoney
        value={value}
        className={cn(
          "text-sm font-semibold",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          tone === "warning" && "text-amber-400",
          tone === "default" && "text-white"
        )}
      />
    </div>
  );
}

export function OwnerCashFlowWidget() {
  const { summary } = useCashFlow("today");

  return (
    <OwnerCard>
      <OwnerSectionTitle>Cash Flow Today</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Live cash movement across sales, purchases, and expenses.
      </p>

      <div className="mt-5 space-y-2">
        <CashFlowRow
          label="Sales Income"
          value={summary.salesIncome}
          tone="positive"
        />
        <CashFlowRow
          label="Purchases"
          value={summary.purchaseCost}
          tone="warning"
        />
        <CashFlowRow
          label="Operating Expenses"
          value={summary.operatingExpenses}
        />
        <CashFlowRow
          label="Net Cash Flow"
          value={summary.netCashFlow}
          tone={summary.netCashFlow >= 0 ? "positive" : "negative"}
        />
      </div>
    </OwnerCard>
  );
}
