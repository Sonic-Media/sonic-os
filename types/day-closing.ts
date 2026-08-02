import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";

export type DayClosingStatus = "open" | "closed";

export type CashReconciliationStatus = "balanced" | "short" | "over";

export interface DayClosingStaffPayout {
  staffId: string;
  staffName: string;
  role: StaffRoleId;
  dailyWage: number;
  paidToday: boolean;
  selected: boolean;
  amount: number;
  notes?: string;
}

export interface DayClosingMetrics {
  todaySales: number;
  todayPurchases: number;
  todayOperatingExpenses: number;
  todayInventoryInvestment: number;
  todayStaffPaymentsRecorded: number;
  cashBeforeClosing: number;
}

export interface DayClosingSummary {
  sales: number;
  expenses: number;
  inventoryInvestment: number;
  staffPayments: number;
  remainingCash: number;
  inventoryFund: number;
  operatingFund: number;
}

export interface DayClosingRecord {
  id: string;
  date: string;
  branch: Branch;
  status: DayClosingStatus;
  metrics: DayClosingMetrics;
  staffPayouts: DayClosingStaffPayout[];
  expectedCash: number;
  actualCashCounted: number;
  cashDifference: number;
  cashStatus: CashReconciliationStatus;
  reconciliationNotes?: string;
  summary: DayClosingSummary;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenedAt?: string;
  closingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayClosingStatusInfo {
  branch: Branch;
  branchName: string;
  date: string;
  status: DayClosingStatus;
  closedByName?: string;
  closedAt?: string;
}
