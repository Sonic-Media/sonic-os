import { resolveStaffFromSession } from "@/lib/staff/audit";
import { isStaffRoleId } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffActionRecord } from "@/types/staff-session";
import type { Entry } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StockMovement } from "@/types/stock";

export function buildStaffActionRecord(
  staff: Staff,
  timestamp = new Date().toISOString(),
  branchOverride?: Branch
): StaffActionRecord {
  return {
    staffId: staff.id,
    staffName: staff.name,
    role: staff.role,
    branch: branchOverride ?? staff.branch,
    timestamp,
  };
}

export function resolveCurrentStaffAction(
  branchOverride?: Branch
): StaffActionRecord | undefined {
  const staff = resolveStaffFromSession();
  if (!staff) return undefined;
  return buildStaffActionRecord(staff, new Date().toISOString(), branchOverride);
}

export function normalizeStaffActionRecord(
  value: unknown
): StaffActionRecord | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const staffId = typeof raw.staffId === "string" ? raw.staffId.trim() : "";
  const staffName = typeof raw.staffName === "string" ? raw.staffName.trim() : "";
  const role = typeof raw.role === "string" ? raw.role.trim() : "";
  const branch = typeof raw.branch === "string" ? raw.branch.trim() : "";
  const timestamp = typeof raw.timestamp === "string" ? raw.timestamp.trim() : "";

  if (!staffId || !staffName || !isStaffRoleId(role) || !branch || !timestamp) {
    return undefined;
  }

  return {
    staffId,
    staffName,
    role,
    branch,
    timestamp,
  };
}

export function legacyStaffFields(action?: StaffActionRecord): {
  staffId?: string;
  staffName?: string;
} {
  if (!action) return {};
  return {
    staffId: action.staffId,
    staffName: action.staffName,
  };
}

export function getSaleActorId(sale: Sale): string | undefined {
  return sale.completedBy?.staffId ?? sale.createdBy?.staffId ?? sale.staffId;
}

export function getSaleActorName(sale: Sale): string | undefined {
  return (
    sale.completedBy?.staffName ??
    sale.createdBy?.staffName ??
    sale.staffName
  );
}

export function getPurchaseActorId(purchase: Purchase): string | undefined {
  return purchase.createdBy?.staffId ?? purchase.staffId;
}

export function getPurchaseActorName(purchase: Purchase): string | undefined {
  return purchase.createdBy?.staffName ?? purchase.staffName;
}

export function getStockMovementActorId(
  movement: StockMovement
): string | undefined {
  return movement.createdBy?.staffId;
}

export function getStockMovementActorName(
  movement: StockMovement
): string | undefined {
  return movement.createdBy?.staffName;
}

export function getExpenseActorId(expense: ExpenseRecord): string | undefined {
  if (expense.staffPaymentType) {
    return expense.paidBy?.staffId;
  }
  return expense.createdBy?.staffId ?? expense.staffId;
}

export function getExpenseActorName(expense: ExpenseRecord): string | undefined {
  if (expense.staffPaymentType) {
    return expense.paidBy?.staffName;
  }
  return expense.createdBy?.staffName ?? expense.staffName;
}

export function getEntryActorId(entry: Entry): string | undefined {
  return entry.createdBy?.staffId ?? (entry.staffId || undefined);
}

export function getEntryActorName(entry: Entry): string | undefined {
  return entry.createdBy?.staffName ?? (entry.staffName || undefined);
}
