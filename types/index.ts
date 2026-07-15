export type Branch = "kansanga" | "salaama";

export type EntryStatus = "draft" | "completed";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type HistorySortOrder = "newest" | "oldest";

export type HistoryBranchFilter = Branch | "all";

export type BranchEntryStatus = "pending" | "draft" | "completed";

export type ExpenseBreakdownKey = "rent" | "lunch" | "staff-payments" | "other";

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
  staffId: string;
  staffName: string;
  notes: string;
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
  branch: Branch;
  active: boolean;
}
