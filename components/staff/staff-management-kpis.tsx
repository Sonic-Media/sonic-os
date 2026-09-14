"use client";

import { AnimatedMoney } from "@/components/dashboard/owner/primitives";
import { uiSurface } from "@/lib/ui/design-tokens";
import { formatAttendanceHours } from "@/lib/staff/attendance";
import { cn } from "@/lib/utils";

interface StaffManagementKpisProps {
  totalStaff: number;
  onShiftNow: number;
  totalHoursToday: number;
  pendingPayments: number;
}

function KpiCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  accent: "green" | "blue" | "purple" | "orange";
}) {
  const accentBorder = {
    green: "border-emerald-500/15",
    blue: "border-blue-500/15",
    purple: "border-violet-500/15",
    orange: "border-orange-500/15",
  }[accent];

  return (
    <div className={cn(uiSurface.card, "p-5", accentBorder)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export function StaffManagementKpis({
  totalStaff,
  onShiftNow,
  totalHoursToday,
  pendingPayments,
}: StaffManagementKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Staff"
        value={totalStaff}
        accent="purple"
        detail="Matching current filters"
      />
      <KpiCard
        label="On Shift Now"
        value={onShiftNow}
        accent="green"
        detail="Currently clocked in"
      />
      <KpiCard
        label="Total Hours Today"
        value={formatAttendanceHours(totalHoursToday)}
        accent="blue"
        detail="Combined shift time"
      />
      <KpiCard
        label="Pending Payments"
        value={pendingPayments}
        accent="orange"
        detail="Not yet paid today"
      />
    </section>
  );
}

export function StaffMonthlyCostsCard({ amount }: { amount: number }) {
  return (
    <div className={cn(uiSurface.card, "p-5 border-violet-500/15")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Monthly Staff Costs
      </p>
      <AnimatedMoney
        value={amount}
        className="mt-3 block text-2xl font-semibold text-white"
      />
      <p className="mt-1 text-xs text-zinc-500">Staff payments this month</p>
    </div>
  );
}
