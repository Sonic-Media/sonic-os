import { cn } from "@/lib/utils";
import { uiRadius } from "@/lib/ui/design-tokens";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-zinc-800/80 text-zinc-400 ring-1 ring-white/[0.06]",
  success: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
  danger: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
  info: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20",
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 text-xs font-medium",
        uiRadius.full,
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
