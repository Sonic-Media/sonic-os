"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { getTodayISO } from "@/lib/dates";
import { formatRelativeTime, getGreeting } from "@/lib/format";
import { formatClockTime } from "@/lib/staff/attendance";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import {
  StaffCard,
  StaffSectionLabel,
  StaffStatusBadge,
} from "@/components/operations/staff/primitives";

export function StaffWelcomeCard({
  businessDate,
}: {
  businessDate?: string;
} = {}) {
  const today = getTodayISO();
  const resolvedDate = businessDate ?? today;
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const { staff } = useStaff();
  const {
    getActiveOpenRecord,
    getOpenRecord,
    isBranchDayClosed,
    isCloseRequestPending,
  } = useDayClosing();
  const { currentAttendance } = useStaffAttendance(resolvedDate);
  const [now, setNow] = useState(() => new Date());

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
  const activeOpenRecord = getActiveOpenRecord(activeBranch);
  const closeRequestPending = isCloseRequestPending(activeBranch, resolvedDate);
  const shopOpen = activeOpenRecord?.status === "open";
  const shopClosed = isBranchDayClosed(activeBranch, resolvedDate);
  const openRecord =
    getOpenRecord(activeBranch, resolvedDate) ?? activeOpenRecord;
  const openedAt = openRecord?.openedAt ?? openRecord?.reopenedAt;

  const sessionLabel = useMemo(() => {
    if (!openedAt) return "Just opened";
    return formatRelativeTime(openedAt);
  }, [openedAt, now]);

  const shopStatusLabel = shopClosed
    ? "Closed"
    : closeRequestPending
      ? "Closing Request Sent"
      : shopOpen
        ? "Open"
        : "Not Open";
  const shopStatusTone = shopClosed
    ? "neutral"
    : closeRequestPending
      ? "warning"
      : shopOpen
        ? "success"
        : "warning";

  return (
    <StaffCard accent="hero" hero>
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <StaffSectionLabel>Staff Dashboard</StaffSectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">
            {getGreeting(firstName)} 👋
          </h2>
        </div>
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
          <StaffSectionLabel>Shift Start Time</StaffSectionLabel>
          <p className="mt-2 text-lg font-semibold tabular-nums text-white">
            {formatClockTime(currentAttendance?.lastClockInAt) || "—"}
          </p>
        </div>
        <div>
          <StaffSectionLabel>Shop Status</StaffSectionLabel>
          <div className="mt-2">
            <StaffStatusBadge tone={shopStatusTone}>
              <span
                className={
                  shopOpen
                    ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                    : shopClosed
                      ? "h-1.5 w-1.5 rounded-full bg-zinc-400"
                      : "h-1.5 w-1.5 rounded-full bg-amber-400"
                }
              />
              {shopStatusLabel}
            </StaffStatusBadge>
            {shopOpen && openedAt ? (
              <p className="mt-2 text-xs text-zinc-500">{sessionLabel}</p>
            ) : onShift && !shopOpen ? (
              <p className="mt-2 text-xs text-zinc-500">
                You are on shift; branch not opened
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </StaffCard>
  );
}
