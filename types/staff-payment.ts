import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";

export type StaffPaymentType =
  | "daily-wage"
  | "salary"
  | "bonus"
  | "advance"
  | "deduction";

export interface StaffPaymentInput {
  staffId: string;
  amount: number;
  date: string;
  paymentType: StaffPaymentType;
  paymentMethod: import("@/types/expenses-module").ExpensePaymentMethod;
  notes?: string;
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

export interface StaffPaymentReportSummary {
  totalStaffPayments: number;
  byBranch: { branch: string; total: number }[];
  byStaff: { staffId: string; staffName: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
}
