"use client";

import { useOwnerWorkflow } from "@/hooks/use-owner-workflow";
import {
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/types";

interface TodayWorkflowProps {
  summary: ReportSummary;
}

export function TodayWorkflow({ summary }: TodayWorkflowProps) {
  const { steps, completedCount, totalCount, progressPercent, nextStep } =
    useOwnerWorkflow(summary);

  return (
    <OwnerCard>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <OwnerSectionTitle>Today&apos;s Workflow</OwnerSectionTitle>
          <p className="mt-2 text-sm text-zinc-500">
            {nextStep
              ? `Next up: ${nextStep.label}`
              : "Today's workflow is complete."}
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums text-zinc-400">
          {completedCount}/{totalCount}
        </p>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className="h-full rounded-full bg-white/90 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300",
              step.complete
                ? "border-emerald-500/10 bg-emerald-500/[0.04]"
                : step.pending
                  ? "border-amber-500/15 bg-amber-500/[0.04]"
                  : "border-white/[0.04] bg-zinc-900/30"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                step.complete
                  ? "bg-emerald-500/15 text-emerald-400"
                  : step.pending
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-zinc-800 text-zinc-500"
              )}
            >
              {step.complete ? "✓" : step.pending ? "!" : "○"}
            </span>
            <span
              className={cn(
                "text-sm",
                step.complete
                  ? "text-zinc-200"
                  : step.pending
                    ? "font-medium text-amber-200"
                    : "text-zinc-500"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </OwnerCard>
  );
}
