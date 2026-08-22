import type { Branch } from "@/types";
import type { UserRole } from "@/types/auth";
import type { StaffActionModule } from "@/types/staff-audit";

export type AuditModule = StaffActionModule;

export type AuditAction =
  | "Create"
  | "Edit"
  | "Delete"
  | "Deactivate"
  | "Activate"
  | "Complete Sale"
  | "Complete Purchase"
  | "Stock In"
  | "Stock Out"
  | "Expense Added"
  | "Expense Edited"
  | "Staff Payment"
  | "Role Changed"
  | "Branch Changed"
  | "Login"
  | "Logout"
  | "Close Day"
  | "Reopen Day"
  | "Open Shop";

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole | string;
  branch: Branch;
  action: string;
  module: AuditModule;
  recordId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface AuditLogInput {
  userId?: string;
  userName?: string;
  role?: UserRole | string;
  branch?: Branch;
  action: string;
  module: AuditModule;
  recordId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface AuditLogFilterCriteria {
  dateStart: string;
  dateEnd: string;
  branch: Branch | "all";
  staffId: string | "all";
  module: AuditModule | "all";
  action: string | "all";
}
