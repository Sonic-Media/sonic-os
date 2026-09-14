"use client";

import { Button } from "@/components/shared/ui/button";
import { uiSurface } from "@/lib/ui/design-tokens";
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

interface BusinessInsightsDialogProps {
  insights: BIInsight[];
  onClose: () => void;
}

export function BusinessInsightsDialog({
  insights,
  onClose,
}: BusinessInsightsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close business insights"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08]",
          uiSurface.modal
        )}
      >
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-white">All Business Insights</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Full insight feed generated from today&apos;s Sonic OS data.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {insights.length === 0 ? (
            <p className="text-sm text-zinc-500">No insights available right now.</p>
          ) : (
            <ul className="space-y-2">
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
        </div>

        <div className="border-t border-white/[0.06] px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
