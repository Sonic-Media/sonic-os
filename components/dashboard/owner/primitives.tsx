"use client";

import { useAnimatedValue } from "@/components/dashboard/analytics/animated-value";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const ownerCardClass =
  "rounded-3xl border border-white/[0.06] bg-zinc-950/50 p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_32px_96px_-40px_rgba(0,0,0,0.95)]";

export const ownerHeroClass =
  "rounded-3xl border border-white/[0.08] bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-black p-8 shadow-[0_32px_100px_-48px_rgba(0,0,0,1)] backdrop-blur-md";

export const ownerSectionTitleClass =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500";

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
    <div
      className={cn(
        "rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-5 py-8 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}
