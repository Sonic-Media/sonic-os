"use client";

import { useMemo } from "react";
import { Card } from "@/components/shared/ui/card";
import { useDashboardContext } from "@/context/dashboard-context";
import { generateDashboardIntelligence } from "@/lib/dashboard-intelligence";
import type {
  IntelligenceIcon,
  IntelligenceTone,
} from "@/lib/dashboard-intelligence";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<IntelligenceTone, string> = {
  positive: "text-emerald-400/90",
  negative: "text-red-400/90",
  neutral: "text-zinc-400",
  warning: "text-amber-400/90",
};

function IntelligenceIconGlyph({
  icon,
  tone,
}: {
  icon: IntelligenceIcon;
  tone: IntelligenceTone;
}) {
  const className = cn("h-4 w-4", TONE_STYLES[tone]);

  switch (icon) {
    case "sales":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-10" />
        </svg>
      );
    case "branch":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
        </svg>
      );
    case "expenses":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L2.82 17a2 2 0 001.71 3h15.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case "savings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m6-9H6" />
        </svg>
      );
    case "profit":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h3M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      );
    case "compare":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h5M8 17h8M5 6v12" />
        </svg>
      );
  }
}

function RecommendationIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

export function IntelligenceCard() {
  const {
    analytics,
    chartData,
    branchNames,
    filteredEntries,
    previousFilteredEntries,
  } = useDashboardContext();

  const intelligence = useMemo(
    () =>
      generateDashboardIntelligence({
        analytics,
        chartData,
        branchNames,
        currentEntries: filteredEntries,
        previousEntries: previousFilteredEntries,
      }),
    [
      analytics,
      chartData,
      branchNames,
      filteredEntries,
      previousFilteredEntries,
    ]
  );

  return (
    <Card className="mb-6">
      <div className="mb-4">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Intelligence
        </h2>
        <p className="mt-1 text-xs text-zinc-600">
          Observations from your current business data
        </p>
      </div>

      <ul className="space-y-3">
        {intelligence.insights.map((insight) => (
          <li key={insight.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5",
                insight.tone === "positive" && "bg-emerald-500/10",
                insight.tone === "negative" && "bg-red-500/10",
                insight.tone === "warning" && "bg-amber-500/10"
              )}
            >
              <IntelligenceIconGlyph icon={insight.icon} tone={insight.tone} />
            </span>
            <p className="text-sm leading-relaxed text-zinc-300">{insight.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recommendation
        </p>
        <div className="flex items-start gap-3">
          <RecommendationIcon />
          <p className="text-sm leading-relaxed text-white">
            {intelligence.recommendation}
          </p>
        </div>
      </div>
    </Card>
  );
}
