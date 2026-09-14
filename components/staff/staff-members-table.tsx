"use client";

import Link from "next/link";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { getStaffRoleName } from "@/lib/staff/roles";
import { formatAttendanceHours } from "@/lib/staff/attendance";
import { getUserInitials } from "@/lib/ui/user-avatar";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StaffManagementRow } from "@/hooks/use-staff-management-page";
import { cn } from "@/lib/utils";

interface StaffMembersTableProps {
  rows: StaffManagementRow[];
  selectedStaffId: string | null;
  onSelect: (staffId: string) => void;
  getBranchName: (code: string) => string;
}

function PresenceBadge({ onShift }: { onShift: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
        onShift
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
          : "bg-zinc-800/60 text-zinc-400 ring-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          onShift ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-zinc-500"
        )}
      />
      {onShift ? "On Shift" : "Off Shift"}
    </span>
  );
}

export function StaffMembersTable({
  rows,
  selectedStaffId,
  onSelect,
  getBranchName,
}: StaffMembersTableProps) {
  if (rows.length === 0) {
    return (
      <div className={cn(uiSurface.card, "p-8 text-center")}>
        <p className="text-sm text-zinc-400">No staff members match the current filters.</p>
      </div>
    );
  }

  return (
    <div className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Staff Members</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{rows.length} team members</p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Branch</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Today&apos;s Hours</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row.member.id === selectedStaffId;
              const initials = getUserInitials(row.member.name);

              return (
                <tr
                  key={row.member.id}
                  className={cn(
                    "border-b border-white/[0.04] transition-colors last:border-b-0",
                    isSelected
                      ? "bg-indigo-500/[0.08]"
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => onSelect(row.member.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/15 text-xs font-semibold text-white ring-1 ring-white/10">
                        {initials}
                      </span>
                      <span>
                        <span className="block font-medium text-white">{row.member.name}</span>
                        <StaffPaymentStatusBadge
                          paidToday={row.todayStatus.paidToday}
                          className="mt-1"
                        />
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 text-zinc-300">
                    {getStaffRoleName(row.member.role)}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-400">
                    {getBranchName(row.member.branch)}
                  </td>
                  <td className="px-3 py-3.5">
                    <PresenceBadge onShift={row.onShift} />
                  </td>
                  <td className="px-3 py-3.5 tabular-nums text-zinc-300">
                    {formatAttendanceHours(row.todayHours)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/staff/${row.member.id}`}
                      className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 lg:hidden">
        {rows.map((row) => {
          const isSelected = row.member.id === selectedStaffId;
          const initials = getUserInitials(row.member.name);

          return (
            <button
              key={row.member.id}
              type="button"
              onClick={() => onSelect(row.member.id)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-indigo-500/25 bg-indigo-500/[0.08]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/15 text-xs font-semibold text-white ring-1 ring-white/10">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{row.member.name}</p>
                    <PresenceBadge onShift={row.onShift} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getStaffRoleName(row.member.role)} · {getBranchName(row.member.branch)} ·{" "}
                    {formatAttendanceHours(row.todayHours)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
