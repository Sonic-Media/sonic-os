"use client";

import { StaffMonthlyCostsCard } from "@/components/staff/staff-management-kpis";
import { formatAttendanceHours } from "@/lib/staff/attendance";
import { formatCurrency } from "@/lib/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StaffManagementRow } from "@/hooks/use-staff-management-page";
import type { StaffActivityItem } from "@/lib/staff/dashboard";
import { cn } from "@/lib/utils";

interface StaffManagementBottomSectionsProps {
  todayAttendance: StaffManagementRow[];
  recentActivity: StaffActivityItem[];
  monthlyStaffCosts: number;
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StaffManagementBottomSections({
  todayAttendance,
  recentActivity,
  monthlyStaffCosts,
}: StaffManagementBottomSectionsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,0.55fr)]">
      <div className={cn(uiSurface.card, "p-5")}>
        <h3 className="text-sm font-semibold text-white">Today&apos;s Attendance</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Staff with recorded shift time today</p>

        <div className="mt-4 space-y-2">
          {todayAttendance.length === 0 ? (
            <p className="text-sm text-zinc-500">No attendance recorded yet today.</p>
          ) : (
            todayAttendance.slice(0, 6).map((row) => (
              <div
                key={row.member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{row.member.name}</p>
                  <p className="text-xs text-zinc-500">
                    {row.onShift ? "On shift" : "Off shift"}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums text-emerald-400">
                  {formatAttendanceHours(row.todayHours)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={cn(uiSurface.card, "p-5")}>
        <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Latest actions across the filtered team</p>

        <div className="mt-4 space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent activity yet.</p>
          ) : (
            recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.module} · {item.branch}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {formatTimestamp(item.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <StaffMonthlyCostsCard amount={monthlyStaffCosts} />
    </section>
  );
}
