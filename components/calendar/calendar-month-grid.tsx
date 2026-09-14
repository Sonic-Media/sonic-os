"use client";

import { CalendarActivityMarkers } from "@/components/calendar/calendar-activity-markers";
import type { CalendarDayCell } from "@/lib/calendar/date-utils";
import type { CalendarActivityMarkers as ActivityMarkers } from "@/lib/calendar/activity-index";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface CalendarMonthGridProps {
  days: CalendarDayCell[];
  selectedDate: string;
  getMarkers: (date: string) => ActivityMarkers;
  onSelectDate: (date: string) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonthGrid({
  days,
  selectedDate,
  getMarkers,
  onSelectDate,
}: CalendarMonthGridProps) {
  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={cn(
                "min-h-[88px] border-b border-r border-white/[0.04] p-2 text-left transition-colors last:border-r-0",
                day.inCurrentMonth ? "bg-transparent" : "bg-black/10",
                isSelected
                  ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30"
                  : "hover:bg-white/[0.02]"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-medium",
                    day.isToday
                      ? "bg-indigo-500/20 text-indigo-200"
                      : day.inCurrentMonth
                        ? "text-white"
                        : "text-zinc-600"
                  )}
                >
                  {day.dayNumber}
                </span>
              </div>
              <CalendarActivityMarkers
                markers={getMarkers(day.date)}
                className="mt-3"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
