const STAFF_ON_SHIFT_ERROR_FRAGMENT = "staff are still on shift";

export function isStaffOnShiftCloseError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.toLowerCase().includes(STAFF_ON_SHIFT_ERROR_FRAGMENT);
}

export function shouldClearStaffOnShiftCloseError(
  message: string | null | undefined,
  staffOnShiftCount: number
): boolean {
  return isStaffOnShiftCloseError(message) && staffOnShiftCount === 0;
}
