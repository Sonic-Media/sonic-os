import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TotalsFieldProps {
  label: string;
  value: string;
  size?: "sm" | "md" | "lg";
  valueClassName?: string;
}

export function TotalsField({
  label,
  value,
  size = "md",
  valueClassName,
}: TotalsFieldProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "font-semibold text-white mt-1",
          sizeClasses[size],
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface TotalsGridProps {
  sales: number;
  expenses: number;
  savings: number;
  size?: "sm" | "md" | "lg";
}

export function TotalsGrid({ sales, expenses, savings, size = "md" }: TotalsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <TotalsField label="Sales" value={formatCurrency(sales)} size={size} />
      <TotalsField label="Expenses" value={formatCurrency(expenses)} size={size} />
      <TotalsField
        label="Savings"
        value={formatCurrency(savings)}
        size={size}
        valueClassName={savings >= 0 ? undefined : "text-red-400"}
      />
    </div>
  );
}
