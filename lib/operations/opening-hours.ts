import type { UserRole } from "@/types/auth";

export const SHOP_OPEN_HOUR = 9;
export const SHOP_CLOSE_HOUR = 23;

export type ShopSchedulePhase = "before-open" | "open" | "after-close";

export interface ShopScheduleState {
  phase: ShopSchedulePhase;
  canOpen: boolean;
  countdownLabel: string;
  targetTime: Date;
  statusMessage: string;
  detailMessage: string;
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function ownerExemptFromShopOpenGate(
  role: UserRole | null | undefined
): boolean {
  return role === "owner";
}

export function isWithinOpeningHours(date = new Date()): boolean {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const openMinutes = SHOP_OPEN_HOUR * 60;
  const closeMinutes = SHOP_CLOSE_HOUR * 60;
  return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
}

export function getOpeningHoursLabel(): string {
  return "9:00 AM – 11:00 PM";
}

function atHour(date: Date, hour: number, dayOffset = 0): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + dayOffset);
  next.setHours(hour, 0, 0, 0);
  next.setMilliseconds(0);
  return next;
}

export function getShopScheduleState(now = new Date()): ShopScheduleState {
  const openToday = atHour(now, SHOP_OPEN_HOUR);
  const closeToday = atHour(now, SHOP_CLOSE_HOUR);

  if (now < openToday) {
    return {
      phase: "before-open",
      canOpen: false,
      countdownLabel: "Shop opens in",
      targetTime: openToday,
      statusMessage: "Opening begins at 9:00 AM.",
      detailMessage: getOpeningHoursLabel(),
    };
  }

  if (now < closeToday) {
    return {
      phase: "open",
      canOpen: true,
      countdownLabel: "Shop closes in",
      targetTime: closeToday,
      statusMessage: "Ready to open today's shop.",
      detailMessage: getOpeningHoursLabel(),
    };
  }

  return {
    phase: "after-close",
    canOpen: false,
    countdownLabel: "Shop opens in",
    targetTime: atHour(now, SHOP_OPEN_HOUR, 1),
    statusMessage: "Today's business has ended.",
    detailMessage: "Next opening at 9:00 AM.",
  };
}

export function getCountdownParts(now: Date, targetTime: Date): CountdownParts {
  const totalMs = Math.max(0, targetTime.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalMs };
}

export function formatCountdownParts(parts: CountdownParts): string {
  const segments: string[] = [];

  if (parts.hours > 0) {
    segments.push(`${parts.hours}h`);
  }

  segments.push(`${String(parts.minutes).padStart(2, "0")}m`);
  segments.push(`${String(parts.seconds).padStart(2, "0")}s`);

  return segments.join(" ");
}

export function getOpeningHoursStatus(date = new Date()): {
  canOpen: boolean;
  message: string;
} {
  const schedule = getShopScheduleState(date);
  return {
    canOpen: schedule.canOpen,
    message: schedule.statusMessage,
  };
}
