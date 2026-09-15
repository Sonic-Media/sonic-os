"use client";

import { useMemo, useState } from "react";
import { BusinessInsightsDialog } from "@/components/dashboard/owner/business-insights-dialog";
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

const MAX_VISIBLE = 3;

/** Hide infrastructure/system insights from the owner dashboard surface. */
function isBusinessInsight(insight: BIInsight): boolean {
  const normalized = insight.text.trim().toLowerCase();
  if (insight.id.includes("backup")) return false;
  if (normalized.includes("backup")) return false;
  return true;
}

/** Prefer actionable insights over technically true but low-value comparisons. */
function isActionableInsight(insight: BIInsight): boolean {
  const text = insight.text.toLowerCase();

  if (text.includes("100% lower than yesterday")) return false;
  if (text.includes("100% below yesterday")) return false;
  if (text.includes("operating expenses are 100% below")) return false;
  if (text.includes("total revenue is 100%")) return false;

  return true;
}

function insightTitle(insight: BIInsight): string {
  switch (insight.category) {
    case "stock":
      return "Stock attention";
    case "sales":
      return "Sales insight";
    case "expenses":
      return "Expense insight";
    case "revenue":
      return "Revenue insight";
    case "staff":
      return "Staff insight";
    case "branches":
      return "Branch insight";
    case "warning":
      return "Attention";
    case "recommendation":
      return "Recommendation";
    default:
      return "Insight";
  }
}

export function BusinessIntelligenceCard() {
  const { feed, isLoaded } = useBusinessIntelligence();
  const [allInsightsOpen, setAllInsightsOpen] = useState(false);

  const businessInsights = useMemo(
    () => feed.insights.filter(isBusinessInsight),
    [feed.insights]
  );

  const actionableInsights = useMemo(
    () => businessInsights.filter(isActionableInsight),
    [businessInsights]
  );

  const visibleInsights = useMemo(
    () => actionableInsights.slice(0, MAX_VISIBLE),
    [actionableInsights]
  );

  return (
    <>
      <OwnerCard accent="purple" className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <OwnerSectionTitle>Business Insights</OwnerSectionTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Up to three actionable insights from today&apos;s Sonic OS data
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
        ) : visibleInsights.length === 0 ? (
          <DashboardEmptyState
            className="mt-4 py-6"
            title="All clear for now"
            description="Useful insights will appear as sales, stock, and expenses are recorded."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {visibleInsights.map((insight) => {
              const accent = severityAccent[insight.severity];

              return (
                <li
                  key={insight.id}
                  className={cn(
                    "rounded-xl border border-white/[0.05] px-3.5 py-3",
                    accent.bg
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {insightTitle(insight)}
                  </p>
                  <div className="mt-1.5 flex items-start gap-3 text-sm leading-snug">
                    <span
                      className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", accent.dot)}
                      aria-hidden
                    />
                    <span className={cn("text-zinc-300", accent.text)}>{insight.text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {businessInsights.length > MAX_VISIBLE ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAllInsightsOpen(true)}
              className="text-sm font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
            >
              View all insights →
            </button>
          </div>
        ) : null}
      </OwnerCard>

      {allInsightsOpen ? (
        <BusinessInsightsDialog
          insights={businessInsights}
          onClose={() => setAllInsightsOpen(false)}
        />
      ) : null}
    </>
  );
}
