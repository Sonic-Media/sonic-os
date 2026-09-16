import type { UserRole } from "@/types/auth";

/** Informational defaults only — not used to block open/close. */
export const SHOP_OPEN_HOUR = 9;
export const SHOP_CLOSE_HOUR = 23;

export type ShopSchedulePhase = "ready";

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

/**
 * Owners may record stock/purchases before staff open the shop (business-day gate).
 * This is unrelated to clock time.
 */
export function ownerExemptFromShopOpenGate(
  role: UserRole | null | undefined
): boolean {
  return role === "owner";
}

/** @deprecated Clock time does not restrict shop open/close. Always true. */
export function isWithinOpeningHours(_date = new Date()): boolean {
  return true;
}

export function getOpeningHoursLabel(): string {
  return "9:00 AM – 11:00 PM";
}

/**
 * Open Shop UI status — non-blocking. Staff may open at any time of day.
 * Business-day guards (previous day open, permissions, branch) remain server-side.
 */
export function getShopScheduleState(now = new Date()): ShopScheduleState {
  return {
    phase: "ready",
    canOpen: true,
    countdownLabel: "Ready to open",
    targetTime: now,
    statusMessage:
      "Open the shop whenever you're ready to start today's business day.",
    detailMessage: "",
  };
}

/** @deprecated Countdown removed — kept for compatibility with older imports. */
export function getCountdownParts(now: Date, targetTime: Date): CountdownParts {
  const totalMs = Math.max(0, targetTime.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalMs };
}

/** @deprecated Countdown removed — kept for compatibility with older imports. */
export function formatCountdownParts(parts: CountdownParts): string {
  const segments: string[] = [];

  if (parts.hours > 0) {
    segments.push(`${parts.hours}h`);
  }

  segments.push(`${String(parts.minutes).padStart(2, "0")}m`);
  segments.push(`${String(parts.seconds).padStart(2, "0")}s`);

  return segments.join(" ");
}

export function getOpeningHoursStatus(_date = new Date()): {
  canOpen: boolean;
  message: string;
} {
  const schedule = getShopScheduleState();
  return {
    canOpen: schedule.canOpen,
    message: schedule.statusMessage,
  };
}
