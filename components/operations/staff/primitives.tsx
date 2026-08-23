"use client";

import { useState, type ReactNode } from "react";
import { useAnimatedValue } from "@/components/dashboard/analytics/animated-value";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StaffCardAccent =
  | "default"
  | "hero"
  | "revenue"
  | "expenses"
  | "cash"
  | "closed";

const accentTopBorder: Record<StaffCardAccent, string> = {
  default: "border-t-white/[0.08]",
  hero: "border-t-violet-500/35",
  revenue: "border-t-emerald-500/40",
  expenses: "border-t-amber-500/40",
  cash: "border-t-blue-500/40",
  closed: "border-t-red-500/40",
};

const accentGlow: Record<StaffCardAccent, string> = {
  default: "",
  hero: "shadow-[0_24px_80px_-48px_rgba(139,92,246,0.28)]",
  revenue: "shadow-[0_24px_80px_-48px_rgba(52,211,153,0.22)]",
  expenses: "shadow-[0_24px_80px_-48px_rgba(245,158,11,0.2)]",
  cash: "shadow-[0_24px_80px_-48px_rgba(59,130,246,0.22)]",
  closed: "shadow-[0_24px_80px_-48px_rgba(239,68,68,0.2)]",
};

export const staffSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500";

export const staffSectionTitleClass =
  "text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]";

export function StaffSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(staffSectionLabelClass, className)}>{children}</p>;
}

export function StaffAnimatedMoney({
  value,
  className,
  fromZero = true,
  duration = 320,
}: {
  value: number;
  className?: string;
  fromZero?: boolean;
  duration?: number;
}) {
  const animated = useAnimatedValue(value, {
    duration,
    fromZeroOnMount: fromZero,
  });

  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {formatCurrency(animated)}
    </span>
  );
}

export function StaffSuccessFlash({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 animate-in zoom-in-95 fade-in duration-300"
      aria-hidden
    >
      ✓
    </span>
  );
}

export function StaffCard({
  children,
  className,
  accent = "default",
  hero = false,
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: StaffCardAccent;
  hero?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-3xl border border-white/[0.06] duration-500",
        "bg-zinc-950/55 backdrop-blur-md transition-all duration-300 ease-out",
        "border-t-[3px]",
        accentTopBorder[accent],
        accentGlow[accent],
        interactive &&
          "hover:-translate-y-0.5 hover:border-white/[0.09] hover:shadow-[0_28px_80px_-40px_rgba(0,0,0,0.85)]",
        hero
          ? "relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-black p-8 sm:p-9"
          : "p-6 sm:p-7",
        className
      )}
    >
      {hero ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/[0.07] blur-3xl"
        />
      ) : null}
      {children}
    </div>
  );
}

export function StaffMetricTile({
  label,
  value,
  sublabel,
  highlight,
  className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  highlight?: "positive" | "neutral" | "muted" | "pending";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.05] bg-black/20 px-5 py-4 transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-white/[0.08] hover:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      <StaffSectionLabel>{label}</StaffSectionLabel>
      <div
        className={cn(
          "mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem]",
          highlight === "positive" && "text-emerald-400",
          highlight === "pending" && "text-zinc-500",
          highlight === "muted" && "text-zinc-500",
          !highlight || highlight === "neutral" ? "text-white" : undefined
        )}
      >
        {value}
      </div>
      {sublabel ? (
        <p className="mt-1.5 text-xs font-normal text-zinc-500">{sublabel}</p>
      ) : null}
    </div>
  );
}

export function StaffStatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        tone === "success" &&
          "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
        tone === "warning" &&
          "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
        tone === "neutral" &&
          "bg-zinc-800/80 text-zinc-400 ring-1 ring-white/[0.06]"
      )}
    >
      {children}
    </span>
  );
}

export function StaffCollapsedSummary({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className="text-sm font-semibold tabular-nums text-white">
        {primary}
      </span>
      {secondary ? (
        <>
          <span className="text-zinc-600" aria-hidden>
            •
          </span>
          <span className="text-sm font-semibold tabular-nums text-zinc-300">
            {secondary}
          </span>
        </>
      ) : null}
    </div>
  );
}

export function StaffDotLeaderRow({
  title,
  value,
  className,
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-2 py-2", className)}>
      <span className="shrink-0 text-sm text-zinc-300">{title}</span>
      <span
        className="min-w-[1rem] flex-1 border-b border-dotted border-zinc-700/80"
        aria-hidden
      />
      <span className="shrink-0 text-sm font-bold tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

export function StaffPremiumButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold",
        "bg-white text-zinc-950 transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)]",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface StaffCollapsibleCardProps {
  title: string;
  description?: string;
  collapsedPreview?: ReactNode;
  children?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  collapsible?: boolean;
  accent?: StaffCardAccent;
  className?: string;
  headerAction?: ReactNode;
}

export function StaffCollapsibleCard({
  title,
  description,
  collapsedPreview,
  children,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  collapsible = true,
  accent = "default",
  className,
  headerAction,
}: StaffCollapsibleCardProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : uncontrolledExpanded;
  const isOpen = !collapsible || expanded;

  function setExpanded(next: boolean) {
    if (!isControlled) {
      setUncontrolledExpanded(next);
    }
    onExpandedChange?.(next);
  }

  return (
    <StaffCard
      accent={accent}
      interactive={collapsible}
      className={cn("overflow-hidden p-0", className)}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-4 px-6 py-5 text-left sm:px-7 sm:py-6",
          collapsible && "transition-colors hover:bg-white/[0.02]"
        )}
        onClick={() => {
          if (collapsible) setExpanded(!expanded);
        }}
        disabled={!collapsible}
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex-1">
          <h3 className={staffSectionTitleClass}>{title}</h3>
          {isOpen && description ? (
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
          {!isOpen && collapsedPreview ? (
            <div className="mt-3">{collapsedPreview}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {collapsible ? (
            <span
              className={cn(
                "mt-1 text-zinc-500 transition-transform duration-250 ease-out",
                isOpen && "rotate-180"
              )}
              aria-hidden
            >
              ▾
            </span>
          ) : null}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-250 ease-out",
          isOpen && children
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {children ? (
            <div className="border-t border-white/[0.05] px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </StaffCard>
  );
}
