"use client";

import { useBusinessIntelligence } from "@/hooks/use-business-intelligence";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import {
  BI_SEVERITY_EMOJI,
  type BIInsight,
} from "@/lib/business-intelligence/types";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "border-red-500/10 bg-red-500/[0.04] text-red-200",
  warning: "border-amber-500/10 bg-amber-500/[0.04] text-amber-200",
  positive: "border-emerald-500/10 bg-emerald-500/[0.04] text-emerald-300",
  info: "border-white/[0.06] bg-zinc-900/40 text-zinc-300",
};

export function BusinessIntelligenceCard() {
  const { feed, isLoaded } = useBusinessIntelligence();

  return (
    <OwnerCard>
      <OwnerSectionTitle>Business Intelligence</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Operational insights from today&apos;s Sonic OS data — no external AI.
      </p>

      {!isLoaded ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-2xl border border-white/[0.04] bg-zinc-900/50"
            />
          ))}
        </div>
      ) : feed.insights.length === 0 ? (
        <DashboardEmptyState
          className="mt-6"
          title="Insights will appear as the day progresses."
          description="Record sales, revenue, and expenses to unlock operational intelligence."
        />
      ) : (
        <div className="mt-6 space-y-3">
          {feed.insights.map((insight: BIInsight) => (
            <div
              key={insight.id}
              className={cn(
                "rounded-2xl border px-4 py-4 text-sm leading-relaxed transition-all duration-300",
                severityStyles[insight.severity]
              )}
            >
              <span aria-hidden className="mr-2">
                {BI_SEVERITY_EMOJI[insight.severity]}
              </span>
              {insight.text}
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}
