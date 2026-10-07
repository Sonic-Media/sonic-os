import type { DayClosingStatus } from "@/types/day-closing";

export const DAY_CLOSING_STATUS = {
  OPEN: "open",
  CLOSE_REQUESTED: "close_requested",
  NEEDS_CORRECTION: "needs_correction",
  CLOSED: "closed",
} as const satisfies Record<string, DayClosingStatus>;

export function isWritableBusinessDayStatus(status: string | null | undefined): boolean {
  return status === DAY_CLOSING_STATUS.OPEN || status === DAY_CLOSING_STATUS.NEEDS_CORRECTION;
}

export function isActiveBusinessDayStatus(status: string | null | undefined): boolean {
  return (
    status === DAY_CLOSING_STATUS.OPEN ||
    status === DAY_CLOSING_STATUS.CLOSE_REQUESTED ||
    status === DAY_CLOSING_STATUS.NEEDS_CORRECTION
  );
}

export function isClosedBusinessDayStatus(status: string | null | undefined): boolean {
  return status === DAY_CLOSING_STATUS.CLOSED;
}
