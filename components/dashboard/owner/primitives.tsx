"use client";

import { useAnimatedValue } from "@/components/dashboard/analytics/animated-value";
import { formatCurrency } from "@/lib/format";
import {
  uiInteraction,
  uiRadius,
  uiSpacing,
  uiSurface,
  uiTypography,
} from "@/lib/ui/design-tokens";
import { EmptyState } from "@/components/shared/ui/empty-state";
import { cn } from "@/lib/utils";

export const ownerCardClass = cn(
  uiRadius.lg,
  uiSurface.cardSubtle,
  uiSpacing.cardPadding,
  "shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)]",
  uiInteraction.cardHover
);

export const ownerHeroClass = cn(
  uiRadius.lg,
  "border border-white/[0.08] bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-black p-8 shadow-[0_32px_100px_-48px_rgba(0,0,0,1)] backdrop-blur-md"
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
}: {
  children: React.ReactNode;
  className?: string;
  hero?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
        hero ? ownerHeroClass : ownerCardClass,
        className
      )}
    >
      {children}
    </div>
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
