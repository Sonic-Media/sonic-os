"use client";

import { useMemo, useState } from "react";
import { StaffEditDialog } from "@/components/staff/staff-edit-dialog";
import { StaffPaymentDialog } from "@/components/staff/staff-payment-dialog";
import { StaffPaymentHistory } from "@/components/staff/staff-payment-history";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { Button } from "@/components/shared/ui/button";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPayments } from "@/hooks/use-staff-payments";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { DATE_FORMATS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  formatAttendanceHours,
  formatClockTime,
} from "@/lib/staff/attendance";
import { getStaffRoleName } from "@/lib/staff/roles";
import { getUserInitials } from "@/lib/ui/user-avatar";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StaffManagementRow } from "@/hooks/use-staff-management-page";
import { cn } from "@/lib/utils";

type DetailTab = "overview" | "attendance" | "payments" | "activity";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance" },
  { id: "payments", label: "Payments" },
  { id: "activity", label: "Activity" },
];

interface StaffDetailPanelProps {
  row: StaffManagementRow | null;
  getBranchName: (code: string) => string;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-UG", DATE_FORMATS.entryDisplay);
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    ...DATE_FORMATS.entryDisplay,
    ...DATE_FORMATS.time,
  });
}

export function StaffDetailPanel({ row, getBranchName }: StaffDetailPanelProps) {
  const { canManageUsers } = useAuth();
  const { deactivateStaff, updateStaff } = useStaff();
  const { getStaffDashboard } = useStaffPayments();
  const { getAttendanceForStaff } = useStaffAttendance();

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const dashboard = useMemo(
    () => (row ? getStaffDashboard(row.member) : null),
    [getStaffDashboard, row]
  );

  const attendance = useMemo(
    () => (row ? getAttendanceForStaff(row.member.id) : undefined),
    [getAttendanceForStaff, row]
  );

  if (!row || !dashboard) {
    return (
      <div className={cn(uiSurface.card, "flex h-full min-h-[320px] items-center justify-center p-8")}>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">Select a staff member</p>
          <p className="mt-1 text-xs text-zinc-600">
            Choose someone from the team list to view their profile and activity.
          </p>
        </div>
      </div>
    );
  }

  const { member, todayStatus, onShift } = row;
  const initials = getUserInitials(member.name);

  async function handleDeactivate() {
    const confirmed = window.confirm(`Deactivate ${member.name}?`);
    if (!confirmed) return;

    const result = await deactivateStaff(member.id);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to deactivate staff.");
    }
  }

  async function handleActivate() {
    const result = await updateStaff(member.id, { status: "active", active: true });
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to activate staff.");
    }
  }

  return (
    <>
      <div className={cn(uiSurface.card, "flex h-full flex-col overflow-hidden p-0")}>
        <div className="border-b border-white/[0.06] p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-sm font-semibold text-white ring-1 ring-white/10">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white">{member.name}</h3>
              <p className="mt-0.5 text-sm text-zinc-500">
                {getStaffRoleName(member.role)} · {getBranchName(member.branch)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StaffPaymentStatusBadge paidToday={todayStatus.paidToday} />
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
                    onShift
                      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                      : "bg-zinc-800/60 text-zinc-400 ring-white/[0.06]"
                  )}
                >
                  {onShift ? "On Shift" : "Off Shift"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canManageUsers ? (
              <>
                <Button
                  type="button"
                  size="default"
                  variant="secondary"
                  onClick={() => setShowEditDialog(true)}
                >
                  Edit Staff
                </Button>
                {member.status === "active" ? (
                  <Button type="button" variant="ghost" onClick={() => void handleDeactivate()}>
                    Deactivate
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => void handleActivate()}>
                    Activate
                  </Button>
                )}
              </>
            ) : null}
            <Button type="button" onClick={() => setShowPaymentDialog(true)}>
              Pay Staff
            </Button>
          </div>
        </div>

        <div className="border-b border-white/[0.06] px-3 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/25"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "overview" ? (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Full Name</dt>
                <dd className="text-white">{member.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Username</dt>
                <dd className="text-white">{member.username ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Role</dt>
                <dd className="text-white">{getStaffRoleName(member.role)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Branch</dt>
                <dd className="text-white">{getBranchName(member.branch)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd className="capitalize text-white">{member.status}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Phone</dt>
                <dd className="text-white">{member.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="text-white">{member.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Daily Wage</dt>
                <dd className="text-white">
                  {member.dailyWage != null ? formatCurrency(member.dailyWage) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Paid This Month</dt>
                <dd className="text-white tabular-nums">
                  {formatCurrency(todayStatus.monthTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Today&apos;s Sales</dt>
                <dd className="text-white tabular-nums">
                  {formatCurrency(todayStatus.todaySalesTotal)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Notes</dt>
                <dd className="text-white">{member.notes ?? "—"}</dd>
              </div>
            </dl>
          ) : null}

          {activeTab === "attendance" && attendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Today&apos;s Hours</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatAttendanceHours(attendance.todayTotalHours)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Presence</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-white">
                    {attendance.presence.replace("-", " ")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {attendance.sessions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No attendance sessions recorded today.</p>
                ) : (
                  attendance.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3 text-sm"
                    >
                      <p className="font-medium text-white">
                        {formatClockTime(session.clockInAt)}
                        {session.clockOutAt
                          ? ` → ${formatClockTime(session.clockOutAt)}`
                          : " → Active"}
                      </p>
                      {session.openedBranch ? (
                        <p className="mt-0.5 text-xs text-emerald-400">Opened branch</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <StaffPaymentHistory payments={dashboard.payments} />
          ) : null}

          {activeTab === "activity" ? (
            <div className="space-y-2">
              {dashboard.activity.length === 0 ? (
                <p className="text-sm text-zinc-500">No activity recorded yet.</p>
              ) : (
                dashboard.activity.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3"
                  >
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatTimestamp(item.timestamp)} · {item.module} · {item.branch}
                    </p>
                    {item.detail ? (
                      <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {showEditDialog ? (
        <StaffEditDialog member={member} onClose={() => setShowEditDialog(false)} />
      ) : null}

      {showPaymentDialog ? (
        <StaffPaymentDialog staff={member} onClose={() => setShowPaymentDialog(false)} />
      ) : null}
    </>
  );
}
