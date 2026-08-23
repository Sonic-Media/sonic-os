import type { Branch } from "@/types";

export type StaffShiftPresence = "on-shift" | "off-shift";

export interface StaffAttendanceSession {
  id: string;
  staffId: string;
  staffName: string;
  branch: Branch;
  date: string;
  clockInAt: string;
  clockOutAt?: string;
  openedBranch: boolean;
}

export interface StaffAttendanceStatus {
  staffId: string;
  staffName: string;
  branch: Branch;
  date: string;
  presence: StaffShiftPresence;
  openedBranchToday: boolean;
  lastClockInAt: string | null;
  lastClockOutAt: string | null;
  shiftStartedAt: string | null;
  todayTotalHours: number;
  currentSessionDurationMinutes: number | null;
  sessions: StaffAttendanceSession[];
}
