"use client";

import { formatEntryDisplayDate } from "@/lib/dates";
import { readCloseRequestRejection } from "@/lib/day-closing/close-request";
import { cn } from "@/lib/utils";
import type { DayClosingRecord, DayClosingStatus } from "@/types/day-closing";

interface StaffActiveBusinessDayBannerProps {
  businessDate: string;
  calendarDate: string;
  status: DayClosingStatus;
  record?: DayClosingRecord;
}

export function StaffActiveBusinessDayBanner({
  businessDate,
  calendarDate,
  status,
  record,
}: StaffActiveBusinessDayBannerProps) {
  const rejection = readCloseRequestRejection(record?.summary);
  const showDateMismatch = businessDate !== calendarDate;

  if (!showDateMismatch && status !== "needs_correction") {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5",
        status === "close_requested"
          ? "border-indigo-500/20 bg-indigo-500/[0.08]"
          : status === "needs_correction"
            ? "border-amber-500/20 bg-amber-500/[0.08]"
            : "border-amber-500/20 bg-amber-500/[0.08]"
      )}
    >
      {status === "needs_correction" ? (
        <>
          <p className="text-sm font-medium text-white">
            Returned for correction — {formatEntryDisplayDate(businessDate)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {rejection?.reason
              ? rejection.reason
              : "The owner returned this business day for correction. Update the records and resubmit."}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-white">
            Active business day: {formatEntryDisplayDate(businessDate)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {status === "close_requested"
              ? "Your closing request for this business day is awaiting review. A new day can open after it is approved and closed."
              : "This branch still has an open business day from a previous calendar date. Finish operations here and submit for closing before opening a new day."}
          </p>
        </>
      )}
    </div>
  );
}
