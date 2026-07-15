"use client";

import { useMemo } from "react";
import { Card } from "@/components/shared/ui/card";
import { useDashboardContext } from "@/context/dashboard-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { getTodayBranchProgress } from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { generateBusinessPulse } from "@/lib/dashboard-intelligence";
import type { BusinessPulseStatus } from "@/lib/dashboard-intelligence";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<BusinessPulseStatus, string> = {
  healthy: "text-emerald-400",
  attention: "text-amber-400",
  critical: "text-red-400",
};

interface BusinessPulseCardProps {
  className?: string;
}

export function BusinessPulseCard({ className }: BusinessPulseCardProps) {
  const {
    analytics,
    chartData,
    branchNames,
    filteredEntries,
    previousFilteredEntries,
  } = useDashboardContext();
  const { entries } = useEntriesContext();
  const { branches } = useSettings();

  const todayProgress = useMemo(
    () => getTodayBranchProgress(entries, getTodayISO(), branches),
    [entries, branches]
  );

  const pulse = useMemo(
    () =>
      generateBusinessPulse({
        analytics,
        chartData,
        branchNames,
        currentEntries: filteredEntries,
        previousEntries: previousFilteredEntries,
        todayProgress,
      }),
    [
      analytics,
      chartData,
      branchNames,
      filteredEntries,
      previousFilteredEntries,
      todayProgress,
    ]
  );

  return (
    <Card
      className={cn(
        "mb-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:shadow-lg",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Business Pulse
          </h2>
          <p
            className={cn(
              "mt-1 text-lg font-semibold",
              STATUS_STYLES[pulse.status]
            )}
          >
            {pulse.statusEmoji} {pulse.statusLabel}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {pulse.summaryLines.map((line) => (
          <li key={line} className="text-sm leading-relaxed text-zinc-300">
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recommendation
        </p>
        <p className="text-sm leading-relaxed text-white">
          {pulse.recommendation}
        </p>
      </div>
    </Card>
  );
}
