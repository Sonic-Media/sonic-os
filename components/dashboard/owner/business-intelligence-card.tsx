"use client";

import { useMemo } from "react";
import { useBusinessIntelligence } from "@/hooks/use-business-intelligence";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import type { BIInsight, BIInsightSeverity } from "@/lib/business-intelligence/types";
import { cn } from "@/lib/utils";

const severityAccent: Record<
  BIInsightSeverity,
  { dot: string; text: string; bg: string }
> = {
  critical: {
    dot: "bg-red-400",
    text: "text-red-300",
    bg: "bg-red-500/[0.06]",
  },
  warning: {
    dot: "bg-orange-400",
    text: "text-orange-300",
    bg: "bg-orange-500/[0.06]",
  },
  positive: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-500/[0.06]",
  },
  info: {
    dot: "bg-blue-400",
    text: "text-blue-300",
    bg: "bg-blue-500/[0.06]",
  },
};

/** Hide infrastructure/system insights from the owner dashboard surface. */
function isBusinessInsight(insight: BIInsight): boolean {
  const normalized = insight.text.trim().toLowerCase();
  if (insight.id.includes("backup")) return false;
  if (normalized.includes("backup")) return false;
  return true;
}

const MAX_VISIBLE = 4;

export function BusinessIntelligenceCard() {
  const { feed, isLoaded } = useBusinessIntelligence();

  const insights = useMemo(
    () => feed.insights.filter(isBusinessInsight).slice(0, MAX_VISIBLE),
    [feed.insights]
  );

  return (
    <OwnerCard accent="purple" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <OwnerSectionTitle>Business Intelligence</OwnerSectionTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Actionable insights from today&apos;s Sonic OS data
          </p>
        </div>
        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-300">
          Live
        </span>
      </div>

      {!isLoaded ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-xl border border-white/[0.04] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <DashboardEmptyState
          className="mt-4 py-6"
          title="All clear for now"
          description="Business insights will appear as sales, stock, and expenses are recorded."
        />
      ) : (
        <ul className="mt-4 space-y-2">
          {insights.map((insight) => {
            const accent = severityAccent[insight.severity];

            return (
              <li
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-white/[0.05] px-3.5 py-3 text-sm leading-snug",
                  accent.bg
                )}
              >
                <span
                  className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", accent.dot)}
                  aria-hidden
                />
                <span className={cn("text-zinc-300", accent.text)}>{insight.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </OwnerCard>
  );
}
