"use client";

import { useOwnerSmartInsights } from "@/hooks/use-owner-smart-insights";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

const toneStyles = {
  positive: "border-emerald-500/10 bg-emerald-500/[0.04] text-emerald-300",
  neutral: "border-white/[0.06] bg-zinc-900/40 text-zinc-300",
  warning: "border-amber-500/10 bg-amber-500/[0.04] text-amber-200",
};

export function SmartInsights() {
  const insights = useOwnerSmartInsights();

  return (
    <OwnerCard>
      <OwnerSectionTitle>Smart Insights</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Contextual signals drawn from today&apos;s operating data.
      </p>

      {insights.length === 0 ? (
        <DashboardEmptyState
          className="mt-6"
          title="Insights will appear as the day progresses."
          description="Start recording revenue, sales, and expenses to unlock intelligent guidance."
        />
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "rounded-2xl border px-4 py-4 text-sm leading-relaxed transition-all duration-300 hover:-translate-y-0.5",
                toneStyles[insight.tone]
              )}
            >
              {insight.text}
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}
