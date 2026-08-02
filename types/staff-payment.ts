import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";
import type { StaffActionRecord } from "@/types/staff-session";
import type { ExpensePaymentMethod } from "@/types/expenses-module";

export type StaffPaymentType =
  | "daily-wage"
  | "weekly-wage"
  | "salary"
  | "bonus"
  | "advance"
  | "deduction";

export interface StaffPaymentInput {
  staffId: string;
  amount: number;
  date: string;
  paymentType: StaffPaymentType;
  paymentMethod: ExpensePaymentMethod;
  notes?: string;
}

export interface StaffPaymentRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: StaffRoleId;
  amount: number;
  paymentType: StaffPaymentType;
  paymentMethod: ExpensePaymentMethod;
  branch: Branch;
  date: string;
  paidBy?: StaffActionRecord;
  notes?: string;
  expenseId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPaymentValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
  payment?: StaffPaymentRecord;
}

export interface StaffPaymentSummary {
  staffId: string;
  staffName: string;
  branch: Branch;
  role: StaffRoleId;
  paidToday: boolean;
  lastPaymentDate: string | null;
  monthTotal: number;
}

export interface StaffTodayStatus extends StaffPaymentSummary {
  status: import("@/types/staff-role").StaffStatus;
  username?: string;
  phone?: string;
  loggedInToday: boolean;
  todaySalesTotal: number;
  todaySalesCount: number;
  lastActivityAt: string | null;
  lastActivityLabel: string | null;
}

export interface StaffReportsData {
  totalPaidThisMonth: number;
  highestPaid: { staffId: string; staffName: string; total: number } | null;
  mostActiveEmployee: { staffId: string; staffName: string; actionCount: number } | null;
  salesByEmployee: { staffId: string; staffName: string; total: number; count: number }[];
  expensesRecorded: { staffId: string; staffName: string; count: number; total: number }[];
  purchasesRecorded: { staffId: string; staffName: string; count: number; total: number }[];
  inventoryAdjustments: { staffId: string; staffName: string; count: number }[];
}

export interface StaffPaymentReportSummary {
  totalStaffPayments: number;
  byBranch: { branch: string; total: number }[];
  byStaff: { staffId: string; staffName: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
}
