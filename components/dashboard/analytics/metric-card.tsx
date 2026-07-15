"use client";

import { useAnimatedValue } from "@/components/dashboard/analytics/animated-value";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  detail?: string;
  detailTone?: "positive" | "negative" | "neutral";
  formatValue?: (value: number) => string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "accent";
  animateFromZeroOnMount?: boolean;
}

export function MetricCard({
  label,
  value,
  detail,
  detailTone = "neutral",
  formatValue,
  isSelected = false,
  onClick,
  className,
  variant = "default",
  animateFromZeroOnMount = false,
}: MetricCardProps) {
  const animatedValue = useAnimatedValue(value, {
    duration: 200,
    fromZeroOnMount: animateFromZeroOnMount,
  });
  const formatted =
    formatValue?.(animatedValue) ?? formatCurrency(animatedValue);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "group relative w-full cursor-pointer rounded-2xl border p-5 text-left",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:scale-[1.02]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        variant === "default" &&
          "border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20",
        variant === "default" &&
          !isSelected &&
          "hover:border-zinc-700/80 hover:bg-zinc-900/75 hover:shadow-lg",
        variant === "accent" &&
          "border-white/10 bg-white text-black shadow-xl shadow-white/5",
        variant === "accent" &&
          !isSelected &&
          "hover:shadow-lg hover:shadow-white/10",
        isSelected &&
          variant === "default" &&
          "border-white/30 bg-zinc-900/90 shadow-lg shadow-white/5 ring-1 ring-white/20",
        isSelected &&
          variant === "accent" &&
          "ring-2 ring-black/15 shadow-lg",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200",
          variant === "default" && "bg-white/5",
          variant === "accent" && "bg-black/[0.03]",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <p
        className={cn(
          "relative text-sm font-medium tracking-wide",
          variant === "default" ? "text-zinc-500" : "text-zinc-600"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "relative mt-1 text-3xl font-semibold tracking-tight sm:text-4xl",
          variant === "default" ? "text-white" : "text-black"
        )}
      >
        {formatted}
      </p>
      {detail && (
        <p
          className={cn(
            "relative mt-1 text-sm",
            detailTone === "positive" && "text-emerald-400",
            detailTone === "negative" && "text-red-400",
            detailTone === "neutral" &&
              (variant === "default" ? "text-zinc-500" : "text-zinc-600")
          )}
        >
          {detail}
        </p>
      )}
    </button>
  );
}
