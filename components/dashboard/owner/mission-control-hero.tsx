"use client";

import { useEffect, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useSettings } from "@/context/settings-context";
import { useBranchState } from "@/hooks/use-branch-state";
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

export function MissionControlHero({ displayName }: MissionControlHeroProps) {
  const now = useLiveClock(1000);
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const branchState = useBranchState();

  const firstName = displayName.split(" ")[0] ?? displayName;
  const staffWorking = branchState.activeStaff.map((staff) => staff.staffName);

  const statusLabel =
    branchState.status === "closed"
      ? "Closed"
      : branchState.status === "open"
        ? "Open"
        : "Not Open";

  const statusEmoji =
    branchState.status === "open" ? "🟢" : "⚫";

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
                branchState.status === "open"
                  ? "text-emerald-400"
                  : "text-zinc-400"
              )}
            >
              <span aria-hidden>{statusEmoji}</span>
              {branchState.isLoaded ? statusLabel : "Loading..."}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Opened By</p>
            <p className="mt-3 text-lg font-medium text-white">
              {branchState.openedByName ?? "—"}
            </p>
          </div>

          <div>
            <p className={ownerSectionTitleClass}>Opened At</p>
            <p className="mt-3 text-lg font-medium tabular-nums text-white">
              {formatClockTime(branchState.openedAt)}
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
              {staffWorking.length > 0
                ? staffWorking.join(", ")
                : branchState.status === "waiting"
                  ? "Waiting for staff"
                  : "No one on shift right now"}
            </p>
          </div>
        </div>
      </div>
    </OwnerCard>
  );
}
