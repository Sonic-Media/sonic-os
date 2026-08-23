import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { cn } from "@/lib/utils";

interface CashSummaryProps {
  movieRevenue: number;
  accessorySales?: number;
  totalExpenses: number;
  staffPayouts?: number;
  netCash: number;
  savingsAllocation: string;
  onSavingsAllocationChange?: (value: string) => void;
  readOnly?: boolean;
  payrollLabel?: string;
}

function SummaryRow({
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
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={cn("text-sm font-semibold text-white", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function CashSummary({
  movieRevenue,
  accessorySales = 0,
  totalExpenses,
  staffPayouts = 0,
  netCash,
  savingsAllocation,
  onSavingsAllocationChange,
  readOnly = false,
  payrollLabel = "Payroll",
}: CashSummaryProps) {
  const allocation = Number(savingsAllocation) || 0;
  const remainingCash = netCash - allocation;
  const totalRevenue = movieRevenue + accessorySales;

  return (
    <Card variant="elevated" className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Cash Summary
      </h3>

      <SummaryRow label="Movie Revenue" value={formatCurrency(movieRevenue)} />
      <SummaryRow
        label="Accessory Sales"
        value={formatCurrency(accessorySales)}
      />
      <SummaryRow
        label="Total Revenue"
        value={formatCurrency(totalRevenue)}
        valueClassName="text-emerald-400"
      />
      <SummaryRow label="Total Expenses" value={formatCurrency(totalExpenses)} />
      {(staffPayouts > 0 || payrollLabel === "Daily Wage") && (
        <SummaryRow
          label={payrollLabel}
          value={formatCurrency(staffPayouts)}
        />
      )}
      <div className="h-px bg-zinc-800" />
      <SummaryRow
        label="Net Cash"
        value={formatCurrency(netCash)}
        valueClassName={netCash < 0 ? "text-red-400" : undefined}
      />

      {readOnly ? (
        <SummaryRow
          label="Savings Allocation"
          value={formatCurrency(allocation)}
        />
      ) : (
        <Input
          label="Savings Allocation"
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={savingsAllocation}
          onChange={(event) => onSavingsAllocationChange?.(event.target.value)}
        />
      )}

      <SummaryRow
        label="Remaining Cash"
        value={formatCurrency(remainingCash)}
        valueClassName={remainingCash < 0 ? "text-red-400" : "text-zinc-300"}
      />
    </Card>
  );
}
