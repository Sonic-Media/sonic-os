"use client";

import { useAnimatedValue } from "@/components/dashboard/analytics/animated-value";
import { formatCurrency } from "@/lib/format";
import {
  uiAccent,
  uiAccentBg,
  uiInteraction,
  uiRadius,
  uiSpacing,
  uiSurface,
  uiTypography,
  type SonicAccent,
} from "@/lib/ui/design-tokens";
import { EmptyState } from "@/components/shared/ui/empty-state";
import { cn } from "@/lib/utils";

export const ownerCardClass = cn(
  uiRadius.lg,
  uiSurface.card,
  uiSpacing.cardPadding,
  "shadow-lg shadow-black/30",
  uiInteraction.cardHover
);

export const ownerHeroClass = cn(
  uiRadius.lg,
  "border border-white/[0.08] bg-gradient-to-br from-[rgba(16,18,32,0.9)] via-[rgba(10,12,22,0.85)] to-[rgba(5,6,13,0.95)] p-6 shadow-xl shadow-black/40 backdrop-blur-md sm:p-7"
);

export const ownerSectionTitleClass = uiTypography.sectionLabel;

export function OwnerSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn(ownerSectionTitleClass, className)}>{children}</h2>;
}

export function OwnerCard({
  children,
  className,
  hero = false,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  hero?: boolean;
  accent?: SonicAccent;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
        hero ? ownerHeroClass : ownerCardClass,
        accent &&
          cn(
            "border",
            accent === "green" && "border-emerald-500/15",
            accent === "blue" && "border-blue-500/15",
            accent === "purple" && "border-violet-500/15",
            accent === "orange" && "border-orange-500/15",
            accent === "red" && "border-red-500/15"
          ),
        className
      )}
    >
      {children}
    </div>
  );
}

export function OwnerKpiIcon({
  accent,
  children,
}: {
  accent: SonicAccent;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
        uiAccentBg[accent],
        uiAccent[accent]
      )}
    >
      {children}
    </span>
  );
}

export function AnimatedMoney({
  value,
  className,
  fromZero = true,
}: {
  value: number;
  className?: string;
  fromZero?: boolean;
}) {
  const animated = useAnimatedValue(value, {
    duration: 650,
    fromZeroOnMount: fromZero,
  });

  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {formatCurrency(animated)}
    </span>
  );
}

export function DashboardEmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <EmptyState title={title} description={description} className={className} />
  );
}
