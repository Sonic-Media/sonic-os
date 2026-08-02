"use client";

import { cn } from "@/lib/utils";

interface StaffPaymentStatusBadgeProps {
  paidToday: boolean;
  className?: string;
}

export function StaffPaymentStatusBadge({
  paidToday,
  className,
}: StaffPaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        paidToday
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400",
        className
      )}
    >
      {paidToday ? "Paid" : "Unpaid"}
    </span>
  );
}
