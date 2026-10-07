import type { Branch } from "@/types";

export type FinancialCorrectionKind =
  | "expense_correction"
  | "close_request_rejected"
  | "business_day_wipe";

export type FinancialCorrectionSourceType =
  | "expense_record"
  | "daily_operation_expense"
  | "day_closing";

export interface FinancialCorrectionRecord {
  id: string;
  kind: FinancialCorrectionKind;
  sourceType: FinancialCorrectionSourceType;
  sourceId: string;
  originalAmount?: number | null;
  newAmount?: number | null;
  originalDescription?: string | null;
  newDescription?: string | null;
  changedFields: string[];
  reason: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  branchCode: Branch;
  businessDate: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ClosedDayExpenseCorrectionInput {
  sourceType: Exclude<FinancialCorrectionSourceType, "day_closing">;
  sourceId: string;
  amount?: number;
  description?: string;
  reason: string;
}

export interface BusinessDayWipeInput {
  branch: Branch | string;
  date: string;
  confirmation: string;
}

export interface BusinessDayWipeCounts {
  dailyOperations: number;
  dailyOperationExpenses: number;
  expenseRecords: number;
  sales: number;
  saleLineItems: number;
  staffPayments: number;
  stockRestored: number;
  dayClosings: number;
}

export interface BusinessDayWipePreview {
  branch: Branch;
  branchName: string;
  date: string;
  confirmationPhrase: string;
  counts: BusinessDayWipeCounts;
}

export interface BusinessDayWipeReport {
  branch: Branch;
  branchName: string;
  date: string;
  wiped: BusinessDayWipeCounts;
  correctionId: string;
}

export interface FinancialDetailLine {
  id: string;
  sourceType:
    | "expense_record"
    | "daily_operation_expense"
    | "sale"
    | "movie_revenue";
  serviceOrCategory: string;
  description: string;
  amount: number;
  timestamp: string;
  staffName: string | null;
  branch: Branch;
  branchName: string;
  businessDate: string;
  category?: string | null;
  status?: string | null;
}

export interface FinancialDetailStaffGroup {
  staffName: string;
  lines: FinancialDetailLine[];
  total: number;
}

export interface FinancialDetailResponse {
  branch: Branch;
  branchName: string;
  date: string;
  totals: {
    movieRevenue: number;
    accessoryRevenue: number;
    totalRevenue: number;
    totalExpenditure: number;
    net: number;
  };
  incomeBySource: { source: string; amount: number; lines: FinancialDetailLine[] }[];
  expenditureByCategory: {
    category: string;
    amount: number;
    lines: FinancialDetailLine[];
  }[];
  expenditureByStaff: FinancialDetailStaffGroup[];
  corrections: FinancialCorrectionRecord[];
  limitations: string[];
}
