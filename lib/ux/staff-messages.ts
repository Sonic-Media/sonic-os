const TECHNICAL_PATTERNS = [
  "unexpected server error",
  "internal_error",
  "business data request failed",
  "postgresql is unavailable",
  "prisma",
  "unique constraint",
  "network error",
  "failed to fetch",
];

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

export interface StaffMessageOptions {
  ownerName?: string;
  context?: "start-shift" | "close-day" | "general";
}

export function toStaffFacingError(
  message: string,
  options: StaffMessageOptions = {}
): string {
  const normalized = normalizeMessage(message);
  const ownerName = options.ownerName?.trim() || "your manager";
  const context = options.context ?? "general";

  if (
    normalized.includes("already open") ||
    normalized.includes("already started") ||
    normalized.includes("day_already_open")
  ) {
    return "Today's shift has already been started.";
  }

  if (
    normalized.includes("already closed") ||
    normalized.includes("day_already_closed")
  ) {
    return "Today's shift has already been completed.";
  }

  if (
    TECHNICAL_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    !message.trim()
  ) {
    if (context === "start-shift") {
      return "Couldn't start today's shift.\nPlease try again.";
    }

    return `Unable to complete this action.\nPlease contact ${ownerName} if the problem continues.`;
  }

  if (context === "start-shift" && normalized.includes("open the shop")) {
    return "Couldn't start today's shift.\nPlease try again.";
  }

  return message;
}
