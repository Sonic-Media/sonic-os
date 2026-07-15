import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";

interface EntrySummaryProps {
  sales: number;
  totalExpenses: number;
  balance: number;
}

export function EntrySummary({
  sales,
  totalExpenses,
  balance,
}: EntrySummaryProps) {
  return (
    <Card variant="elevated" className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Sales</span>
        <span className="text-lg font-semibold text-white">
          {formatCurrency(sales)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Total Expenses</span>
        <span className="text-lg font-semibold text-white">
          {formatCurrency(totalExpenses)}
        </span>
      </div>
      <div className="h-px bg-zinc-800" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">Balance</span>
        <span
          className={cn(
            "text-2xl font-semibold tracking-tight transition-colors",
            balance >= 0 ? "text-white" : "text-red-400"
          )}
        >
          {formatCurrency(balance)}
        </span>
      </div>
    </Card>
  );
}
