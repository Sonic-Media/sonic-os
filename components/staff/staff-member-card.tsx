"use client";

import Link from "next/link";
import { Card } from "@/components/shared/ui/card";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import type { StaffTodayStatus } from "@/types/staff-payment";

interface StaffMemberCardProps {
  status: StaffTodayStatus;
  branchName: string;
}

function formatLastActivity(timestamp: string | null): string {
  if (!timestamp) return "No activity yet";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString("en-UG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StaffMemberCard({ status, branchName }: StaffMemberCardProps) {
  const initials = status.staffName.split(" ").pop()?.[0] ?? "?";

  return (
    <Link href={`/staff/${status.staffId}`} className="block">
      <Card className="flex flex-col gap-4 transition-colors hover:border-zinc-600">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">{status.staffName}</p>
              <StaffPaymentStatusBadge paidToday={status.paidToday} />
            </div>
            <p className="text-sm text-zinc-500">
              {getStaffRoleName(status.role)} · {branchName} ·{" "}
              <span className="capitalize">{status.status}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today&apos;s Login
            </p>
            <p className="mt-1 text-white">
              {status.loggedInToday ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today&apos;s Payment
            </p>
            <p className="mt-1 text-white">
              {status.paidToday ? "Paid" : "Not paid"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today&apos;s Sales
            </p>
            <p className="mt-1 font-medium text-white tabular-nums">
              {formatCurrency(status.todaySalesTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Activity
            </p>
            <p className="mt-1 text-white">
              {status.lastActivityLabel
                ? `${status.lastActivityLabel} · ${formatLastActivity(status.lastActivityAt)}`
                : formatLastActivity(status.lastActivityAt)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
