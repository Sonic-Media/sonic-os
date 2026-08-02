"use client";

import Link from "next/link";
import { Card } from "@/components/shared/ui/card";
import { StaffPaymentStatusBadge } from "@/components/staff/staff-payment-status-badge";
import { formatCurrency } from "@/lib/format";
import { getStaffRoleName } from "@/lib/staff/roles";
import type { StaffPaymentSummary } from "@/types/staff-payment";

interface StaffMemberCardProps {
  summary: StaffPaymentSummary;
  branchName: string;
}

function formatLastPaymentDate(date: string | null): string {
  if (!date) return "No payments yet";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StaffMemberCard({ summary, branchName }: StaffMemberCardProps) {
  const initials = summary.staffName.split(" ").pop()?.[0] ?? "?";

  return (
    <Link href={`/staff/${summary.staffId}`} className="block">
      <Card className="flex flex-col gap-4 transition-colors hover:border-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">{summary.staffName}</p>
              <StaffPaymentStatusBadge paidToday={summary.paidToday} />
            </div>
            <p className="text-sm text-zinc-500">
              {branchName} · {getStaffRoleName(summary.role)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-2 sm:gap-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Payment
            </p>
            <p className="mt-1 text-white">
              {formatLastPaymentDate(summary.lastPaymentDate)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Paid This Month
            </p>
            <p className="mt-1 font-medium text-white tabular-nums">
              {formatCurrency(summary.monthTotal)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
