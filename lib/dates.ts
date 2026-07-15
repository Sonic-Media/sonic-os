import { DATE_FORMATS } from "@/lib/constants";
import type { ReportPeriod } from "@/types";

export function formatEntryTime(date: Date): string {
  return date.toLocaleTimeString("en-US", DATE_FORMATS.time);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

export function formatEntryDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", DATE_FORMATS.entryDisplay);
}

export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", DATE_FORMATS.display);
}

export function formatChartLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", DATE_FORMATS.chart);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isInPeriod(
  dateStr: string,
  period: ReportPeriod,
  ref = new Date()
): boolean {
  const date = new Date(dateStr + "T12:00:00");
  const refDate = new Date(ref);

  switch (period) {
    case "daily":
      return dateStr === formatDateISO(refDate);
    case "weekly": {
      const start = startOfWeek(refDate);
      const end = endOfWeek(refDate);
      return date >= start && date <= end;
    }
    case "monthly":
      return (
        date.getFullYear() === refDate.getFullYear() &&
        date.getMonth() === refDate.getMonth()
      );
    case "yearly":
      return date.getFullYear() === refDate.getFullYear();
  }
}
