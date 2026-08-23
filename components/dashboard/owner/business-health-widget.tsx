"use client";

import { useBusinessHealth } from "@/hooks/use-business-health";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/types";

interface BusinessHealthWidgetProps {
  summary: ReportSummary;
}

export function BusinessHealthWidget({ summary }: BusinessHealthWidgetProps) {
  const health = useBusinessHealth(summary);
  const filledSegments = Math.round((health.percent / 100) * 16);

  return (
    <OwnerCard>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <OwnerSectionTitle>Business Health</OwnerSectionTitle>
          <div className="mt-5 flex items-end gap-4">
            <p className="text-5xl font-semibold tracking-tight text-white">
              {health.percent}%
            </p>
            <p
              className={cn(
                "pb-1 text-sm font-medium",
                health.label === "Healthy" && "text-emerald-400",
                health.label === "In Progress" && "text-amber-400",
                health.label === "Needs Attention" && "text-red-400"
              )}
            >
              {health.label}
            </p>
          </div>

          <div className="mt-6 flex gap-1">
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors duration-500",
                  index < filledSegments
                    ? "bg-white/90"
                    : "bg-zinc-800/90"
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          {health.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-zinc-900/40 px-4 py-3"
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  check.complete
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {check.complete ? "✓" : "·"}
              </span>
              <span className="text-sm text-zinc-300">{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {health.percent === 0 ? (
        <DashboardEmptyState
          className="mt-6"
          title="Today's workflow hasn't started yet."
          description="Start the branch shift and record the first revenue, expense, or sale to begin tracking business health."
        />
      ) : null}
    </OwnerCard>
  );
}
