"use client";

import { formatEntryDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface StaffActiveBusinessDayBannerProps {
  businessDate: string;
  calendarDate: string;
  status: "open" | "close_requested";
}

export function StaffActiveBusinessDayBanner({
  businessDate,
  calendarDate,
  status,
}: StaffActiveBusinessDayBannerProps) {
  if (businessDate === calendarDate) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5",
        status === "close_requested"
          ? "border-indigo-500/20 bg-indigo-500/[0.08]"
          : "border-amber-500/20 bg-amber-500/[0.08]"
      )}
    >
      <p className="text-sm font-medium text-white">
        Active business day: {formatEntryDisplayDate(businessDate)}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">
        {status === "close_requested"
          ? "Your closing request for this business day is awaiting review. A new day can open after it is approved and closed."
          : "This branch still has an open business day from a previous calendar date. Finish operations here and submit for closing before opening a new day."}
      </p>
    </div>
  );
}
