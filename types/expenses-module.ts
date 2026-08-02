import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";
import type { StaffPaymentType } from "@/types/staff-payment";
import type { StaffActionRecord } from "@/types/staff-session";

export type ExpensePaymentMethod =
  | "cash"
  | "mobile-money"
  | "card"
  | "bank-transfer"
  | "other";

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  branch: Branch;
  staffId?: string;
  staffName?: string;
  staffRole?: StaffRoleId;
  staffPaymentType?: StaffPaymentType;
  staffPaymentId?: string;
  createdBy?: StaffActionRecord;
  paidBy?: StaffActionRecord;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesDashboardMetrics {
  todaysExpenses: number | null;
  monthExpenses: number | null;
  highestExpenseCategory: string | null;
  averageDailyExpense: number | null;
}

export type CashFlowPeriod = "today" | "week" | "month" | "year" | "custom";

export interface CashFlowDateRange {
  start: string;
  end: string;
}

export interface CashFlowSummary {
  salesIncome: number;
  purchaseCost: number;
  operatingExpenses: number;
  netCashFlow: number;
  netProfit: number;
}

export interface MonthlySummary {
  income: number;
  expenses: number;
  purchases: number;
  profit: number;
}

export interface ExpenseRecordInput {
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  branch: Branch;
  notes?: string;
}

export type ExpenseRecordUpdateInput = ExpenseRecordInput;

export interface ExpenseCategoryInput {
  name: string;
}

export type ExpenseCategoryUpdateInput = ExpenseCategoryInput;

export type ExpenseDateFilter = "all" | "today" | "week" | "month";

export type ExpenseCategoryFilter = string | "all";

export type ExpenseBranchFilter = Branch | "all";

export type ExpensePaymentFilter = ExpensePaymentMethod | "all";

export interface ExpenseFilterCriteria {
  search: string;
  date: ExpenseDateFilter;
  category: ExpenseCategoryFilter;
  branch: ExpenseBranchFilter;
  paymentMethod: ExpensePaymentFilter;
}

export interface ExpenseValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
}
