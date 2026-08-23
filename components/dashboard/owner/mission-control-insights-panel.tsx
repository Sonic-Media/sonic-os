"use client";

import { useMissionControlInsights } from "@/hooks/use-mission-control-insights";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";

export function MissionControlInsightsPanel() {
  const insights = useMissionControlInsights();

  return (
    <OwnerCard>
      <OwnerSectionTitle>Business Insights</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Short, useful signals from today&apos;s activity.
      </p>

      <div className="mt-6 space-y-4">
        {insights.map((insight) => (
          <p
            key={insight.id}
            className="rounded-2xl border border-white/[0.05] bg-zinc-950/40 px-4 py-4 text-sm leading-relaxed text-zinc-300"
          >
            {insight.text}
          </p>
        ))}
      </div>
    </OwnerCard>
  );
}
