import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";

export type StaffActionModule =
  | "sales"
  | "expenses"
  | "purchasing"
  | "stock"
  | "staff"
  | "auth"
  | "reports"
  | "operations"
  | "settings";

export interface StaffAuditRecord {
  id: string;
  timestamp: string;
  staffId: string;
  staffName: string;
  role: StaffRoleId;
  branch: Branch;
  action: string;
  module: StaffActionModule;
  detail?: string;
}

export interface StaffAuditInput {
  staffId?: string;
  staffName?: string;
  role?: StaffRoleId;
  branch?: Branch;
  action: string;
  module: StaffActionModule;
  detail?: string;
  recordId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}
