import type { Branch } from "@/types";

export type BusinessTransactionType =
  | "Revenue"
  | "AccessorySale"
  | "Expense"
  | "Purchase"
  | "StaffPayment"
  | "BranchOpen"
  | "BranchClose"
  | "Login"
  | "Logout"
  | "InventoryAdjustment";

export interface BusinessTransaction {
  id: string;
  type: BusinessTransactionType;
  timestamp: string;
  sortKey: number;
  timeLabel: string;
  title: string;
  detail?: string;
  amount?: number;
  actorName?: string;
  branch: Branch;
  source?: string;
}

export const LATE_ENTRY_NOTE_PREFIX = "[Late Entry]";

export function isLateEntryExpense(notes?: string | null): boolean {
  return notes?.includes(LATE_ENTRY_NOTE_PREFIX) ?? false;
}

export function getExpenseRecordSource(options: {
  notes?: string | null;
  staffPaymentId?: string | null;
  date: string;
  createdAt: string;
  today?: string;
}): string {
  if (isLateEntryExpense(options.notes)) {
    return "Late Entry";
  }

  if (options.staffPaymentId) {
    return "Today's Operations";
  }

  const today = options.today;
  if (today && options.date === today) {
    const createdDate = options.createdAt.slice(0, 10);
    if (createdDate === today) {
      return "Today's Operations";
    }
  }

  return "Expense Management";
}
