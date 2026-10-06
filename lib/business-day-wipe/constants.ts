import { ApiError } from "@/lib/api/errors";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getBusinessDayWipeConfirmationPhrase(date: string): string {
  return `WIPE ${date.trim()}`;
}

export function assertBusinessDayWipeConfirmation(
  date: string,
  confirmation: string
): void {
  const expected = getBusinessDayWipeConfirmationPhrase(date);
  if (confirmation.trim() !== expected) {
    throw new ApiError(
      `Type ${expected} to confirm wiping this business day.`,
      {
        status: 400,
        code: "confirmation_mismatch",
      }
    );
  }
}

export function assertIsoBusinessDate(date: string): string {
  const trimmed = date.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw new ApiError("Business date must be YYYY-MM-DD.", {
      status: 400,
      code: "validation_error",
    });
  }
  return trimmed;
}
