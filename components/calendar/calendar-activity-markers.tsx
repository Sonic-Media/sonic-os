"use client";

import {
  hasCalendarActivity,
  type CalendarActivityMarkers,
} from "@/lib/calendar/activity-index";
import { cn } from "@/lib/utils";

interface CalendarActivityMarkersProps {
  markers: CalendarActivityMarkers;
  className?: string;
}

const MARKER_STYLES = {
  sales: "bg-emerald-400",
  expenses: "bg-red-400",
  purchases: "bg-violet-400",
  other: "bg-blue-400",
} as const;

export function CalendarActivityMarkers({
  markers,
  className,
}: CalendarActivityMarkersProps) {
  if (!hasCalendarActivity(markers)) {
    return <div className={cn("h-2", className)} />;
  }

  return (
    <div className={cn("flex flex-wrap justify-center gap-1", className)}>
      {markers.sales ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", MARKER_STYLES.sales)}
          title="Sales"
        />
      ) : null}
      {markers.expenses ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", MARKER_STYLES.expenses)}
          title="Expenses"
        />
      ) : null}
      {markers.purchases ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", MARKER_STYLES.purchases)}
          title="Purchases"
        />
      ) : null}
      {markers.other ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", MARKER_STYLES.other)}
          title="Other activity"
        />
      ) : null}
    </div>
  );
}
