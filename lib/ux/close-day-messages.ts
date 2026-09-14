import { isApiError } from "@/lib/api/errors";
import { getDataSourceErrorMessage } from "@/lib/data-source/errors";

const TECHNICAL_PATTERNS = [
  "unexpected server error",
  "internal_error",
  "business data request failed",
  "postgresql is unavailable",
  "prisma",
  "unique constraint",
  "network error",
  "failed to fetch",
  "econnrefused",
  "timeout",
];

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

/**
 * Maps close-day API and validation messages to staff-facing copy.
 * Never exposes raw codes, stack traces, or database errors.
 */
export function mapCloseDayError(message: string, code?: string): string {
  const normalized = normalizeMessage(message);
  const normalizedCode = code?.trim().toLowerCase();

  if (
    normalizedCode === "previous_business_day_open" ||
    normalized.includes("previous business day still open") ||
    normalized.includes("previous_business_day_open")
  ) {
    return "Another business day is still open. Close that day before continuing.";
  }

  if (
    normalizedCode === "day_closed" ||
    normalizedCode === "day_already_closed" ||
    normalized.includes("already closed") ||
    normalized.includes("day_already_closed")
  ) {
    return "This business day is already closed.";
  }

  if (
    normalizedCode === "shop_not_opened" ||
    normalized.includes("open the shop before closing") ||
    normalized.includes("start today's shift before closing") ||
    normalized.includes("start today")
  ) {
    return "The shop has not been opened for this business day.";
  }

  if (
    normalizedCode === "close_request_already_pending" ||
    normalized.includes("closing request has already been submitted")
  ) {
    return "A closing request has already been submitted for this business day.";
  }

  if (
    normalizedCode === "close_request_not_pending" ||
    normalized.includes("no pending closing request")
  ) {
    return "No pending closing request exists for this business day.";
  }

  if (
    normalizedCode === "close_request_pending" ||
    normalized.includes("pending closing request")
  ) {
    return "This business day has a pending closing request. Records cannot be changed.";
  }

  if (
    normalizedCode === "forbidden" ||
    normalized.includes("do not have permission to close") ||
    normalized.includes("do not have permission to submit") ||
    normalized.includes("do not have permission to approve") ||
    normalized.includes("must be signed in to close") ||
    normalized.includes("must be signed in to submit")
  ) {
    return "You don't have permission to perform this closing action.";
  }

  if (
    normalizedCode === "day_already_open" ||
    normalized.includes("already open")
  ) {
    return "Today's shift has already been started.";
  }

  if (
    normalizedCode === "staff_on_shift" ||
    normalized.includes("staff are still on shift")
  ) {
    return message.trim();
  }

  if (
    normalizedCode === "validation_error" ||
    normalized.includes("validation failed")
  ) {
    return "Close data could not be validated. Refresh the page and try again.";
  }

  if (normalizedCode === "csrf_blocked") {
    return "We couldn't close the business day. Check your connection and try again.";
  }

  if (
    normalized.includes("this branch day is closed. records cannot be changed")
  ) {
    return "This business day is already closed.";
  }

  if (
    normalized.includes("reconciliation") ||
    normalized.includes("cash is short or over")
  ) {
    return message.trim();
  }

  if (
    normalized.includes("already been paid today") ||
    normalized.includes("paid today")
  ) {
    return message.trim();
  }

  if (
    TECHNICAL_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    !message.trim()
  ) {
    return "We couldn't complete this closing action. Check your connection and try again.";
  }

  return message.trim();
}

export function toCloseDayFacingError(error: unknown): string {
  if (isApiError(error)) {
    return mapCloseDayError(error.message, error.code);
  }

  if (typeof error === "string") {
    return mapCloseDayError(error);
  }

  return mapCloseDayError(getDataSourceErrorMessage(error));
}
