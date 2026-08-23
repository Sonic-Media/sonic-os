"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useStaff } from "@/context/staff-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { useStaffPayments } from "@/hooks/use-staff-payments";
import { getActiveStaffForBranch } from "@/lib/staff-storage";
import { formatClockTime } from "@/lib/staff/attendance";
import { getTodayISO } from "@/lib/dates";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

export function MissionControlStaffStatus() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { activeStaff } = useStaff();
  const { getAttendanceForStaff } = useStaffAttendance(today);
  const { todayStatuses } = useStaffPayments();

  const cards = useMemo(() => {
    return getActiveStaffForBranch(activeStaff, activeBranch)
      .map((member) => {
        const attendance = getAttendanceForStaff(member.id);
        const status = todayStatuses.find((item) => item.staffId === member.id);
        const hasActivity =
          attendance &&
          (attendance.presence === "on-shift" ||
            attendance.sessions.length > 0 ||
            attendance.lastClockInAt);

        if (!hasActivity) return null;

        return {
          staffId: member.id,
          staffName: member.name,
          onShift: attendance?.presence === "on-shift",
          clockLabel: attendance?.presence === "on-shift"
            ? formatClockTime(attendance.lastClockInAt)
            : formatClockTime(attendance?.lastClockOutAt),
          clockCaption:
            attendance?.presence === "on-shift" ? "Clocked In" : "Clocked Out",
          lastActivity: status?.lastActivityLabel ?? "No activity yet",
        };
      })
      .filter(Boolean) as Array<{
      staffId: string;
      staffName: string;
      onShift: boolean;
      clockLabel: string;
      clockCaption: string;
      lastActivity: string;
    }>;
  }, [activeBranch, activeStaff, getAttendanceForStaff, todayStatuses]);

  return (
    <section className="space-y-4">
      <OwnerSectionTitle>Staff Status</OwnerSectionTitle>

      {cards.length === 0 ? (
        <OwnerCard>
          <DashboardEmptyState
            title="No staff activity yet"
            description="Staff cards will appear here when someone clocks in or opens the shop."
          />
        </OwnerCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <OwnerCard key={card.staffId} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {card.staffName}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 inline-flex items-center gap-2 text-sm font-medium",
                      card.onShift ? "text-emerald-400" : "text-zinc-400"
                    )}
                  >
                    <span aria-hidden>{card.onShift ? "🟢" : "⚫"}</span>
                    {card.onShift ? "On Shift" : "Off Shift"}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {card.clockCaption}
                  </p>
                  <p className="mt-2 text-base font-medium text-white tabular-nums">
                    {card.clockLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Last Activity
                  </p>
                  <p className="mt-2 text-base font-medium text-white">
                    {card.lastActivity}
                  </p>
                </div>
              </div>
            </OwnerCard>
          ))}
        </div>
      )}
    </section>
  );
}
