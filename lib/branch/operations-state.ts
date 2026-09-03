import {
  getClosedDayRecord,
  getOpenDayRecord,
  isBranchDayClosed,
  isBranchDayOpened,
} from "@/lib/day-closing/storage";
import { getActiveStaffAttendance } from "@/lib/staff/attendance";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { Staff } from "@/types";
import type { StaffAttendanceStatus } from "@/types/staff-attendance";
import type { StaffAuditRecord } from "@/types/staff-audit";

export type BranchOperationsStatus = "open" | "closed" | "waiting";

export interface BranchOperationsSnapshot {
  branch: Branch;
  status: BranchOperationsStatus;
  openedByName: string | null;
  openedAt: string | null;
  closedByName: string | null;
  closedAt: string | null;
  activeStaff: StaffAttendanceStatus[];
}

export function computeBranchOperationsSnapshot(
  branch: Branch,
  dateISO: string,
  closings: DayClosingRecord[],
  staff: Staff[],
  auditRecords: StaffAuditRecord[]
): BranchOperationsSnapshot {
  const openRecord = getOpenDayRecord(branch, dateISO, closings);
  const closedRecord = getClosedDayRecord(branch, dateISO, closings);
  const isClosed = isBranchDayClosed(branch, dateISO, closings);
  const isOpen = isBranchDayOpened(branch, dateISO, closings);
  const status: BranchOperationsStatus = isClosed
    ? "closed"
    : isOpen
      ? "open"
      : "waiting";

  return {
    branch,
    status,
    openedByName: openRecord?.openedByName ?? null,
    openedAt: openRecord?.openedAt ?? openRecord?.reopenedAt ?? null,
    closedByName: closedRecord?.closedByName ?? null,
    closedAt: closedRecord?.closedAt ?? null,
    activeStaff: getActiveStaffAttendance(staff, branch, dateISO, auditRecords),
  };
}

export function formatBranchOperationsStatusLabel(
  status: BranchOperationsStatus
): string {
  if (status === "closed") return "Closed";
  if (status === "open") return "Open";
  return "Not Open";
}
