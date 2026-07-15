export type Branch = "kansanga" | "salaama";

export type EntryStatus = "draft" | "completed";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type HistorySortOrder = "newest" | "oldest";

export type HistoryBranchFilter = Branch | "all";

export type BranchEntryStatus = "pending" | "draft" | "completed";

export interface Expense {
  id: string;
  name: string;
  amount: number;
}

export interface Entry {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  branch: Branch;
  sales: number;
  expenses: Expense[];
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
  staffName: string;
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
}

export interface DashboardSummary {
  summary: ReportSummary;
  progress: BranchProgress[];
  draftEntry?: Entry;
  completedEntry?: Entry;
  allEntriesCompleted: boolean;
}

export interface HistoryFilter {
  date?: string;
  branch: HistoryBranchFilter;
  sortOrder: HistorySortOrder;
}

export interface BranchProgress {
  branch: Branch;
  name: string;
  status: BranchEntryStatus;
  completed: boolean;
  entryId?: string;
}
