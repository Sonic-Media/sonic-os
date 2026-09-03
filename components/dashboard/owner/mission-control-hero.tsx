"use client";

import { useEffect, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useActiveBranchOperations } from "@/hooks/use-all-branches-operations";
import { formatBranchOperationsStatusLabel } from "@/lib/branch/operations-state";
import { formatClockTime } from "@/lib/staff/attendance";
import { cn } from "@/lib/utils";
import { OwnerCard, ownerSectionTitleClass } from "@/components/dashboard/owner/primitives";

interface MissionControlHeroProps {
  displayName: string;
}

function useLiveClock(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function staffWorkingLabel(
  status: "open" | "closed" | "waiting",
  staffNames: string[]
): string {
  if (staffNames.length === 0) {
    return status === "waiting" ? "Waiting for staff" : "No one on shift right now";
  }

  const names = staffNames.join(", ");
  if (status === "waiting") {
    return `${names} (on shift; branch not opened)`;
  }

  return names;
}

export function MissionControlHero({ displayName }: MissionControlHeroProps) {
  const now = useLiveClock(1000);
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const { isLoaded } = useDayClosing();
  const branchOps = useActiveBranchOperations();

  const firstName = displayName.split(" ")[0] ?? displayName;
  const staffNames = branchOps.activeStaff.map((staff) => staff.staffName);
  const statusLabel = formatBranchOperationsStatusLabel(branchOps.status);
  const statusEmoji = branchOps.status === "open" ? "🟢" : "⚫";

  return (
    <OwnerCard hero className="overflow-hidden p-0">
      <div className="px-6 py-8 sm:px-8 sm:py-10">
        <p className={ownerSectionTitleClass}>Mission Control</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Welcome back, {firstName} 👋
        </h1>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={ownerSectionTitleClass}>Current Branch</p>
            <p className="mt-3 text-lg font-medium text-white">
              {getBranchName(activeBranch)}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Business Status</p>
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-2 text-lg font-medium",
                branchOps.status === "open"
                  ? "text-emerald-400"
                  : branchOps.status === "waiting"
                    ? "text-amber-400"
                    : "text-zinc-400"
              )}
            >
              <span aria-hidden>{statusEmoji}</span>
              {isLoaded ? statusLabel : "Loading..."}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Opened By</p>
            <p className="mt-3 text-lg font-medium text-white">
              {branchOps.openedByName ?? "—"}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Opened At</p>
            <p className="mt-3 text-lg font-medium tabular-nums text-white">
              {formatClockTime(branchOps.openedAt)}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Current Time</p>
            <p className="mt-3 text-lg font-medium tabular-nums text-white">
              {formatClock(now)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">Live clock</p>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <p className={ownerSectionTitleClass}>Staff Working</p>
            <p className="mt-3 text-lg font-medium text-white">
              {staffWorkingLabel(branchOps.status, staffNames)}
            </p>
          </div>
        </div>
      </div>
    </OwnerCard>
  );
}
