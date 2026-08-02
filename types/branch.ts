export interface BranchEntity {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  manager?: string;
  active: boolean;
  createdAt: string;
}

export interface BranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  manager?: string;
}

export type BranchUpdateInput = BranchInput;

export interface BranchValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
}

export interface BranchDashboardMetrics {
  totalBranches: number;
  activeBranches: number;
}

export interface BranchRevenueRow {
  branchCode: string;
  branchName: string;
  revenue: number;
}

export interface BranchInventoryRow {
  branchCode: string;
  branchName: string;
  inventoryValue: number;
}

export interface BranchActivityItem {
  id: string;
  type: "sale" | "purchase" | "expense" | "entry" | "movement";
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
}

export interface BranchAnalyticsSnapshot {
  branchCode: string;
  branchName: string;
  todayRevenue: number;
  todayProfit: number;
  inventoryValue: number;
  purchases: number;
  expenses: number;
  cashFlow: number;
  topSellingProduct: string | null;
  topCustomer: string | null;
  staffCount: number;
  lowStock: number;
  recentActivity: BranchActivityItem[];
}
