function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDateISO(date: Date): string {
  return formatDateISO(date);
}

export function parseDateISO(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function addMonths(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  return next;
}

export function addWeeks(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta * 7);
  return next;
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(12, 0, 0, 0);
  return start;
}

export function endOfWeek(date: Date): Date {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  return end;
}

export interface CalendarDayCell {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(
  anchor: Date,
  todayISO: string
): CalendarDayCell[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0, 0);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateISO = formatDateISO(cellDate);

    cells.push({
      date: dateISO,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === month,
      isToday: dateISO === todayISO,
    });
  }

  return cells;
}

export function buildWeekDays(
  anchor: Date,
  todayISO: string
): CalendarDayCell[] {
  const start = startOfWeek(anchor);
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 7; index += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + index);
    const dateISO = formatDateISO(cellDate);

    cells.push({
      date: dateISO,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: true,
      isToday: dateISO === todayISO,
    });
  }

  return cells;
}

export function isDateInRange(
  date: string,
  start: string,
  end: string
): boolean {
  return date >= start && date <= end;
}
