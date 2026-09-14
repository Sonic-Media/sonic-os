import { getTodayISO } from "@/lib/dates";

/**
 * Attendance and shift state must use the persisted open business day when one
 * exists — not the browser calendar date alone (after-midnight operations).
 */
export function resolveStaffAttendanceDateISO(
  businessDate?: string,
  calendarDate: string = getTodayISO()
): string {
  return businessDate?.trim() ? businessDate : calendarDate;
}
