import { normalizeBranchCode } from "@/lib/branch-storage";
import { normalizeStaffActionRecord } from "@/lib/staff/session";
import { isStaffRoleId } from "@/lib/staff/roles";
import type { Branch } from "@/types";
import type {
  StaffPaymentRecord,
  StaffPaymentType,
} from "@/types/staff-payment";
import type { ExpensePaymentMethod } from "@/types/expenses-module";

const PAYMENT_METHODS = new Set<ExpensePaymentMethod>([
  "cash",
  "mobile-money",
  "card",
  "bank-transfer",
  "other",
]);

const PAYMENT_TYPES = new Set<StaffPaymentType>([
  "daily-wage",
  "weekly-wage",
  "salary",
  "bonus",
  "advance",
  "deduction",
]);

function normalizeTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePositiveNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function normalizePaymentMethod(value: unknown): ExpensePaymentMethod {
  if (
    typeof value === "string" &&
    PAYMENT_METHODS.has(value as ExpensePaymentMethod)
  ) {
    return value as ExpensePaymentMethod;
  }
  return "cash";
}

function normalizePaymentType(value: unknown): StaffPaymentType {
  if (
    typeof value === "string" &&
    PAYMENT_TYPES.has(value as StaffPaymentType)
  ) {
    return value as StaffPaymentType;
  }
  return "daily-wage";
}

export function normalizeStaffPaymentRecord(
  value: unknown
): StaffPaymentRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const staffId = typeof raw.staffId === "string" ? raw.staffId.trim() : "";
  const staffName =
    typeof raw.staffName === "string" ? raw.staffName.trim() : "";
  const role = typeof raw.staffRole === "string" ? raw.staffRole.trim() : "";
  const expenseId =
    typeof raw.expenseId === "string" ? raw.expenseId.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const now = new Date().toISOString();

  if (!id || !staffId || !staffName || !isStaffRoleId(role) || !expenseId || !date) {
    return null;
  }

  const amount = normalizePositiveNumber(raw.amount);
  if (amount <= 0) return null;

  return {
    id,
    staffId,
    staffName,
    staffRole: role,
    amount,
    paymentType: normalizePaymentType(raw.paymentType),
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    branch: normalizeBranchCode(raw.branch),
    date,
    paidBy: normalizeStaffActionRecord(raw.paidBy),
    notes: normalizeOptionalString(raw.notes),
    expenseId,
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };
}

export function normalizeStaffPaymentList(value: unknown): StaffPaymentRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeStaffPaymentRecord)
    .filter((payment): payment is StaffPaymentRecord => payment !== null);
}

export function sortStaffPaymentsByDate(
  payments: StaffPaymentRecord[]
): StaffPaymentRecord[] {
  return [...payments].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function filterStaffPaymentsByBranchDate(
  payments: StaffPaymentRecord[],
  branch: Branch,
  date: string
): StaffPaymentRecord[] {
  return payments.filter(
    (payment) => payment.branch === branch && payment.date === date
  );
}
