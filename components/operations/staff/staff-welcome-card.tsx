"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { getTodayISO } from "@/lib/dates";
import { formatRelativeTime, getGreeting } from "@/lib/format";
import {
  formatClockTime,
  recordStaffClockOut,
} from "@/lib/staff/attendance";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import {
  StaffCard,
  StaffSectionLabel,
  StaffStatusBadge,
} from "@/components/operations/staff/primitives";

export function StaffWelcomeCard() {
  const today = getTodayISO();
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const { staff } = useStaff();
  const { getOpenRecord } = useDayClosing();
  const { currentAttendance } = useStaffAttendance(today);
  const [now, setNow] = useState(() => new Date());
  const [isClockingOut, setIsClockingOut] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const firstName = staffName.split(" ")[0] ?? staffName;
  const onShift = currentAttendance?.presence === "on-shift";
  const openRecord = getOpenRecord(activeBranch, today);
  const openedAt = openRecord?.openedAt ?? openRecord?.reopenedAt;

  const sessionLabel = useMemo(() => {
    if (!openedAt) return "Just opened";
    return formatRelativeTime(openedAt);
  }, [openedAt, now]);

  async function handleClockOut() {
    setIsClockingOut(true);
    recordStaffClockOut(activeBranch);
    setIsClockingOut(false);
  }

  return (
    <StaffCard accent="hero" hero>
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <StaffSectionLabel>Staff Dashboard</StaffSectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">
            {getGreeting(firstName)} 👋
          </h2>
        </div>

        {onShift ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isClockingOut}
            loading={isClockingOut}
            loadingLabel="Clocking Out..."
            onClick={() => void handleClockOut()}
            className="relative shrink-0 rounded-2xl border-white/[0.08] bg-white/[0.04] px-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:shadow-[0_0_20px_-6px_rgba(255,255,255,0.2)]"
          >
            {isClockingOut ? "Clocking Out..." : "Clock Out"}
          </Button>
        ) : null}
      </div>

      <div className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <StaffSectionLabel>Branch</StaffSectionLabel>
          <p className="mt-2 text-lg font-semibold text-white">
            {getBranchName(activeBranch)}
          </p>
        </div>
        <div>
          <StaffSectionLabel>On Shift</StaffSectionLabel>
          <p className="mt-2 text-lg font-semibold text-white">
            {onShift ? "Yes" : "No"}
          </p>
        </div>
        <div>
          <StaffSectionLabel>Started</StaffSectionLabel>
          <p className="mt-2 text-lg font-semibold tabular-nums text-white">
            {formatClockTime(currentAttendance?.lastClockInAt) || "—"}
          </p>
        </div>
        <div>
          <StaffSectionLabel>Shop</StaffSectionLabel>
          <div className="mt-2">
            <StaffStatusBadge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Open
            </StaffStatusBadge>
            {openedAt ? (
              <p className="mt-2 text-xs text-zinc-500">{sessionLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </StaffCard>
  );
}
