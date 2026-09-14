"use client";

import { CalendarActivityMarkers } from "@/components/calendar/calendar-activity-markers";
import type { CalendarDayCell } from "@/lib/calendar/date-utils";
import type { CalendarActivityMarkers as ActivityMarkers } from "@/lib/calendar/activity-index";
import { parseDateISO } from "@/lib/calendar/date-utils";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface CalendarWeekViewProps {
  days: CalendarDayCell[];
  selectedDate: string;
  getMarkers: (date: string) => ActivityMarkers;
  onSelectDate: (date: string) => void;
}

export function CalendarWeekView({
  days,
  selectedDate,
  getMarkers,
  onSelectDate,
}: CalendarWeekViewProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const isSelected = day.date === selectedDate;
        const weekday = parseDateISO(day.date).toLocaleDateString("en-US", {
          weekday: "short",
        });

        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={cn(
              uiSurface.card,
              "p-4 text-left transition-colors",
              isSelected
                ? "ring-1 ring-indigo-500/30"
                : "hover:border-white/[0.12]"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {weekday}
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold",
                day.isToday ? "text-indigo-300" : "text-white"
              )}
            >
              {day.dayNumber}
            </p>
            <CalendarActivityMarkers
              markers={getMarkers(day.date)}
              className="mt-4 justify-start"
            />
          </button>
        );
      })}
    </section>
  );
}
