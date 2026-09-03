import type { BranchEntity } from "@/types/branch";
import type { Entry, Staff } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StaffPayment } from "@/types/staff-payment";
import type { StockMovement, StockProduct } from "@/types/stock";
import type { Branch } from "@/types";

export interface BackupSummary {
  createdAt: string;
  status: string;
}

export interface BIAnalysisContext {
  today: string;
  yesterday: string;
  weekStart: string;
  lastWeekStart: string;
  monthStart: string;
  lastMonthStart: string;
  branches: BranchEntity[];
  branchNames: Record<Branch, string>;
  sales: Sale[];
  purchases: Purchase[];
  expenses: ExpenseRecord[];
  entries: Entry[];
  products: StockProduct[];
  movements: StockMovement[];
  staff: Staff[];
  payments: StaffPayment[];
  closings: DayClosingRecord[];
  backups: BackupSummary[];
  nowMs: number;
}

export function resolveBranchName(
  context: BIAnalysisContext,
  branchCode: string
): string {
  return (
    context.branchNames[branchCode as Branch] ??
    context.branches.find((branch) => branch.code === branchCode)?.name ??
    branchCode
  );
}
