import { Card } from "@/components/shared/ui/card";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthlySummary } from "@/types/expenses-module";

interface MonthlySummaryCardsProps {
  summary: MonthlySummary;
}

export function MonthlySummaryCards({ summary }: MonthlySummaryCardsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Monthly Summary
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <TotalsField
            label="Income"
            value={formatCurrency(summary.income)}
            valueClassName="text-emerald-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Expenses"
            value={formatCurrency(summary.expenses)}
            valueClassName="text-red-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Purchases"
            value={formatCurrency(summary.purchases)}
            valueClassName="text-amber-400"
          />
        </Card>
        <Card>
          <TotalsField
            label="Profit"
            value={formatCurrency(summary.profit)}
            valueClassName={cn(
              summary.profit >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          />
        </Card>
      </div>
    </section>
  );
}
