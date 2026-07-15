import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number;
  className?: string;
  variant?: "default" | "accent";
  size?: "default" | "large";
  detail?: string;
}

export function StatCard({
  label,
  value,
  className,
  variant = "default",
  size = "default",
  detail,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-colors",
        variant === "default" &&
          "border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20",
        variant === "accent" &&
          "border-white/10 bg-white text-black shadow-xl shadow-white/5",
        className
      )}
    >
      <p
        className={cn(
          "text-sm font-medium tracking-wide",
          variant === "default" ? "text-zinc-500" : "text-zinc-600"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tracking-tight mt-1",
          size === "large" ? "text-3xl sm:text-4xl" : "text-2xl",
          variant === "default" ? "text-white" : "text-black"
        )}
      >
        {formatCurrency(value)}
      </p>
      {detail && (
        <p
          className={cn(
            "text-sm mt-1",
            variant === "default" ? "text-zinc-500" : "text-zinc-600"
          )}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
