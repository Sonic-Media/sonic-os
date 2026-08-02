export type Branch = string;

import type { StaffRoleId, StaffStatus } from "@/types/staff-role";

export type { StaffRoleId, StaffStatus } from "@/types/staff-role";

export type EntryStatus = "draft" | "completed";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type DashboardPeriod = Extract<ReportPeriod, "daily" | "weekly" | "monthly">;

export type TrendDirection = "up" | "down" | "flat";

export interface TrendResult {
  percent: number;
  direction: TrendDirection;
  isPositive: boolean;
  label: string;
}

export interface DashboardMetricWithTrend {
  value: number;
  trend: TrendResult;
}

export interface BestBranchResult {
  branch: Branch;
  name: string;
  totalSales: number;
  revenuePercentage: number;
}

export interface BestStaffResult {
  staffName: string;
  totalSales: number;
  branch: Branch;
  branchName: string;
}

export interface DashboardQuickInsights {
  highestExpenseCategory: { label: string; amount: number } | null;
  mostExpensiveDay: ReportDayInsight | null;
  highestSalesDay: ReportDayInsight | null;
  highestSavingsDay: ReportDayInsight | null;
  averageDailySales: number;
  averageDailyExpenses: number;
  averageDailySavings: number;
}

export interface DashboardAnalytics {
  period: DashboardPeriod;
  sales: DashboardMetricWithTrend;
  expenses: DashboardMetricWithTrend;
  savings: DashboardMetricWithTrend;
  profitMargin: DashboardMetricWithTrend;
  bestBranch: BestBranchResult | null;
  bestStaff: BestStaffResult | null;
  quickInsights: DashboardQuickInsights;
}

export type HistorySortOrder = "newest" | "oldest";

export type HistoryBranchFilter = Branch | "all";

export type BranchEntryStatus = "pending" | "draft" | "completed";

export type ExpenseBreakdownKey =
  | "rent"
  | "staff-payments"
  | "lunch"
  | "electricity"
  | "internet"
  | "transport"
  | "repairs"
  | "inventory"
  | "other";

export interface Expense {
  id: string;
  name: string;
  amount: number;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  defaultAmount?: number;
  category: ExpenseBreakdownKey;
  active: boolean;
}

export interface Entry {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  branch: Branch;
  sales: number;
  expenses: Expense[];
  staffId?: string;
  staffName?: string;
  createdBy?: import("@/types/staff-session").StaffActionRecord;
  notes: string;
  savingsAllocation?: number;
  createdAt: string;
  status: EntryStatus;
}

export interface EntryFormData {
  date: string;
  branch: Branch;
  sales: string;
  expenses: Expense[];
  staffId: string;
  notes: string;
  savingsAllocation: string;
}

export interface BranchTotals {
  sales: number;
  expenses: number;
  savings: number;
}

export interface ChartDataPoint {
  label: string;
  sales: number;
  expenses: number;
  savings: number;
}

export interface ReportSummary {
  totalSales: number;
  totalExpenses: number;
  totalSavings: number;
  byBranch: Record<Branch, BranchTotals>;
  chartData: ChartDataPoint[];
  insights: ReportInsights;
}

export interface ReportDayInsight {
  label: string;
  value: number;
}


export interface ExpenseBreakdownItem {
  key: ExpenseBreakdownKey;
  label: string;
  amount: number;
}

export interface ReportInsights {
  highestSalesDay?: ReportDayInsight;
  highestSavingsDay?: ReportDayInsight;
  highestExpenseDay?: ReportDayInsight;
  averageDailySales: number;
  averageDailySavings: number;
  bestPerformingBranch?: Branch;
  bestPerformingBranchSavings: number;
  expenseBreakdown: ExpenseBreakdownItem[];
}

export interface DashboardSummary {
  summary: ReportSummary;
  progress: BranchProgress[];
  draftEntry?: Entry;
  completedEntry?: Entry;
  allEntriesCompleted: boolean;
}

export type HistoryStaffFilter = "all" | string;

export type HistoryStatusFilter = "all" | EntryStatus;

export interface HistoryFilterCriteria {
  date?: string;
  branch: HistoryBranchFilter;
  staff: HistoryStaffFilter;
  status: HistoryStatusFilter;
  search?: string;
  minSales?: number;
  maxSales?: number;
  minExpenses?: number;
  maxExpenses?: number;
}

export interface HistoryFilter extends HistoryFilterCriteria {
  sortOrder: HistorySortOrder;
}

export interface BranchProgress {
  branch: Branch;
  name: string;
  status: BranchEntryStatus;
  completed: boolean;
  entryId?: string;
}

export interface BranchConfig {
  id: Branch;
  name: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  branchNames: Record<Branch, string>;
  defaultLunchAmount: number;
}

export interface Staff {
  id: string;
  name: string;
  username?: string;
  branch: Branch;
  role: StaffRoleId;
  loginEnabled: boolean;
  status: StaffStatus;
  userId?: string;
  active: boolean;
  phone?: string;
  email?: string;
  dailyWage?: number;
  monthlySalary?: number;
  dateJoined: string;
  emergencyContact?: string;
  notes?: string;
}
