import type { AuditAction } from "@/types/audit-log";
import type { AuditModule } from "@/types/audit-log";

export const AUDIT_LOG_STORAGE_KEY = "sonic-os-audit-log";

export const AUDIT_ACTIONS = {
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  DEACTIVATE: "Deactivate",
  ACTIVATE: "Activate",
  COMPLETE_SALE: "Complete Sale",
  COMPLETE_PURCHASE: "Complete Purchase",
  STOCK_IN: "Stock In",
  STOCK_OUT: "Stock Out",
  EXPENSE_ADDED: "Expense Added",
  EXPENSE_EDITED: "Expense Edited",
  STAFF_PAYMENT: "Staff Payment",
  ROLE_CHANGED: "Role Changed",
  BRANCH_CHANGED: "Branch Changed",
  LOGIN: "Login",
  LOGOUT: "Logout",
  CLOSE_DAY: "Close Day",
  REOPEN_DAY: "Reopen Day",
} as const satisfies Record<string, AuditAction>;

export const AUDIT_MODULE_OPTIONS: { value: AuditModule | "all"; label: string }[] =
  [
    { value: "all", label: "All Modules" },
    { value: "sales", label: "Sales" },
    { value: "purchasing", label: "Purchasing" },
    { value: "stock", label: "Stock" },
    { value: "expenses", label: "Expenses" },
    { value: "staff", label: "Staff" },
    { value: "operations", label: "Operations" },
    { value: "settings", label: "Settings" },
    { value: "auth", label: "Auth" },
    { value: "reports", label: "Reports" },
  ];

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Actions" },
  ...Object.values(AUDIT_ACTIONS).map((action) => ({
    value: action,
    label: action,
  })),
];

export const MAX_AUDIT_LOG_RECORDS = 2000;

export const AUDIT_LOG_UPDATED_EVENT = "sonic-os-audit-log-updated";
