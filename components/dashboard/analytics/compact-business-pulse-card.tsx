"use client";

import { useMemo } from "react";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { getDashboardChartData } from "@/lib/chart-data";
import { getTodayISO } from "@/lib/dates";
import {
  filterEntriesByDate,
  filterEntriesByPreviousPeriod,
  getTodayBranchProgress,
} from "@/lib/entry-helpers";
import {
  generateCompactBusinessPulse,
  type BusinessPulseStatus,
} from "@/lib/dashboard-intelligence";
import { getDashboardAnalytics } from "@/lib/report-insights";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<BusinessPulseStatus, string> = {
  healthy: "text-emerald-400",
  attention: "text-amber-400",
  critical: "text-red-400",
};

interface CompactBusinessPulseCardProps {
  className?: string;
}

export function CompactBusinessPulseCard({
  className,
}: CompactBusinessPulseCardProps) {
  const { entries } = useEntriesContext();
  const { branches, settings } = useSettings();
  const today = getTodayISO();

  const pulse = useMemo(() => {
    const currentEntries = filterEntriesByDate(entries, today);
    const previousEntries = filterEntriesByPreviousPeriod(entries, "daily");
    const branchIds = branches.map((branch) => branch.id);
    const analytics = getDashboardAnalytics(entries, "daily", {
      branchIds,
      branchNames: settings.branchNames,
      staff: [],
    });
    const chartData = getDashboardChartData(
      entries,
      "daily",
      settings.branchNames,
      branchIds
    );
    const todayProgress = getTodayBranchProgress(entries, today, branches);

    return generateCompactBusinessPulse({
      analytics,
      chartData,
      branchNames: settings.branchNames,
      currentEntries,
      previousEntries,
      todayProgress,
    });
  }, [entries, today, branches, settings.branchNames]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 shadow-lg shadow-black/20 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80",
        className
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          STATUS_STYLES[pulse.status]
        )}
      >
        {pulse.statusEmoji} {pulse.statusLabel}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">
        {pulse.insight}
      </p>
    </div>
  );
}
