import { cn } from "@/lib/utils";
import { uiInteraction, uiRadius, uiSpacing, uiSurface } from "@/lib/ui/design-tokens";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent";
  interactive?: boolean;
}

export function Card({
  children,
  className,
  variant = "default",
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        uiSpacing.cardPadding,
        uiRadius.md,
        "border transition-colors duration-200",
        variant === "default" && uiSurface.card,
        variant === "elevated" && uiSurface.cardElevated,
        variant === "accent" &&
          "border-white/10 bg-white text-black shadow-xl shadow-white/5",
        interactive && uiInteraction.cardHover,
        className
      )}
    >
      {children}
    </div>
  );
}
