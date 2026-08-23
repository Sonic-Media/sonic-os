"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useActiveBranch } from "@/context/active-branch-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import {
  formatAttendanceHours,
  formatClockTime,
  recordStaffClockOut,
} from "@/lib/staff/attendance";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StaffAttendanceBar() {
  const { activeBranch } = useActiveBranch();
  const { currentAttendance } = useStaffAttendance();
  const [isClockingOut, setIsClockingOut] = useState(false);

  const presence = currentAttendance?.presence ?? "off-shift";
  const onShift = presence === "on-shift";

  const sessionLabel = useMemo(() => {
    if (!currentAttendance?.currentSessionDurationMinutes) return null;
    return formatAttendanceHours(
      currentAttendance.currentSessionDurationMinutes / 60
    );
  }, [currentAttendance?.currentSessionDurationMinutes]);

  async function handleClockOut() {
    setIsClockingOut(true);
    recordStaffClockOut(activeBranch);
    setIsClockingOut(false);
  }

  if (!currentAttendance) return null;

  return (
    <Card className="mb-6 flex flex-col gap-4 border-zinc-800/80 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              onShift
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                onShift ? "bg-emerald-400" : "bg-zinc-500"
              )}
            />
            {onShift ? "On Shift" : "Off Shift"}
          </span>
          {sessionLabel ? (
            <span className="text-xs text-zinc-500">
              Current session · {sessionLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Clock In
            </p>
            <p className="mt-1 text-white tabular-nums">
              {formatClockTime(currentAttendance.lastClockInAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Clock Out
            </p>
            <p className="mt-1 text-white tabular-nums">
              {formatClockTime(currentAttendance.lastClockOutAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today&apos;s Hours
            </p>
            <p className="mt-1 text-white tabular-nums">
              {formatAttendanceHours(currentAttendance.todayTotalHours)}
            </p>
          </div>
        </div>

        {currentAttendance.lastClockInAt ? (
          <p className="mt-2 text-xs text-zinc-500">
            Last activity{" "}
            {formatRelativeTime(currentAttendance.lastClockInAt)}
          </p>
        ) : null}
      </div>

      {onShift ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isClockingOut}
          onClick={() => void handleClockOut()}
          className="shrink-0"
        >
          {isClockingOut ? "Clocking Out..." : "Clock Out"}
        </Button>
      ) : null}
    </Card>
  );
}
