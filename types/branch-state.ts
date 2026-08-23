import type { Branch } from "@/types";
import type { StaffAttendanceStatus } from "@/types/staff-attendance";

export type BranchOperationalStatus = "waiting" | "open" | "closed";

export interface BranchStateSnapshot {
  branch: Branch;
  date: string;
  status: BranchOperationalStatus;
  openedByName: string | null;
  openedAt: string | null;
  closedByName: string | null;
  closedAt: string | null;
  activeStaffCount: number;
  activeStaff: StaffAttendanceStatus[];
  movieRevenue: number;
  accessoryRevenue: number;
  operatingExpenses: number;
  staffWages: number;
  expenses: number;
  purchases: number;
  netCash: number;
  netCashFlow: number;
  isLoaded: boolean;
}
