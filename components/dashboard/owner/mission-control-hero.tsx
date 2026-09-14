"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranch } from "@/context/branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useActiveBranchOperations } from "@/hooks/use-all-branches-operations";
import { formatBranchOperationsStatusLabel } from "@/lib/branch/operations-state";
import { formatEntryDisplayDate, getTodayISO } from "@/lib/dates";
import { getPersonalizedGreetingLine } from "@/lib/ux/greeting";
import { cn } from "@/lib/utils";

interface MissionControlHeroProps {
  displayName: string;
}

export function MissionControlHero({ displayName }: MissionControlHeroProps) {
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useBranch();
  const { getActiveOpenRecord, isLoaded } = useDayClosing();
  const branchOps = useActiveBranchOperations();
  const calendarToday = getTodayISO();

  const businessDate = useMemo(() => {
    const openRecord = getActiveOpenRecord(activeBranch);
    return openRecord?.date ?? calendarToday;
  }, [activeBranch, calendarToday, getActiveOpenRecord]);

  const greeting = `${getPersonalizedGreetingLine(displayName)} 👋`;
  const branchLabel = getBranchName(activeBranch);
  const statusLabel = isLoaded
    ? formatBranchOperationsStatusLabel(branchOps.status)
    : "Loading…";
  const isOpen = branchOps.status === "open";

  return (
    <header className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
        {greeting}
      </h1>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
        <span className="font-medium text-zinc-300">{branchLabel}</span>
        <span className="text-zinc-600" aria-hidden>
          •
        </span>
        <span>{formatEntryDisplayDate(businessDate)}</span>
        <span className="text-zinc-600" aria-hidden>
          •
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            isOpen
              ? "text-emerald-400"
              : branchOps.status === "waiting"
                ? "text-orange-400"
                : "text-zinc-500"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isOpen
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                : branchOps.status === "waiting"
                  ? "bg-orange-400"
                  : "bg-zinc-500"
            )}
          />
          Shop {statusLabel}
        </span>
      </div>
    </header>
  );
}
