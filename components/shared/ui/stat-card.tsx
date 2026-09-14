import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";

interface StatCardProps {
  label: string;
  value: number;
  className?: string;
  variant?: "default" | "accent";
  size?: "default" | "large";
  detail?: string;
  detailTone?: "positive" | "negative" | "neutral";
  formatValue?: (value: number) => string;
}

export function StatCard({
  label,
  value,
  className,
  variant = "default",
  size = "default",
  detail,
  detailTone = "neutral",
  formatValue = formatCurrency,
}: StatCardProps) {
  return (
    <div
      className={cn(
        uiSurface.card,
        "p-5 transition-all duration-200",
        variant === "accent" &&
          "border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5",
        className
      )}
    >
      <p
        className={cn(
          uiTypography.sectionLabel,
          variant === "accent" && "text-indigo-300/70"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          uiTypography.money,
          "mt-2",
          size === "large" ? "text-3xl sm:text-4xl" : "text-2xl",
          variant === "accent" && "text-white"
        )}
      >
        {formatValue(value)}
      </p>
      {detail && (
        <p
          className={cn(
            "mt-1.5 text-sm",
            detailTone === "positive" && "text-emerald-400",
            detailTone === "negative" && "text-red-400",
            detailTone === "neutral" && "text-zinc-500"
          )}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
