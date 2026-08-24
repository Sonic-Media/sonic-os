import { cn } from "@/lib/utils";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        compact ? "py-6 text-center" : cn(uiSurface.cardInset, "px-5 py-8 text-center"),
        className
      )}
    >
      <p className={cn(uiTypography.bodyMuted, "font-medium text-zinc-400")}>
        {title}
      </p>
      {description ? (
        <p className={cn("mt-2", uiTypography.bodyMuted)}>{description}</p>
      ) : null}
    </div>
  );
}
