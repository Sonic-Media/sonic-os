import { normalizeBranchCode } from "@/lib/branch-storage";
import { normalizeStaffActionRecord } from "@/lib/staff/session";
import { DEFAULT_EXPENSE_CATEGORIES, STAFF_PAYMENT_CATEGORY_ID, STAFF_PAYMENT_CATEGORY_NAME } from "@/lib/expenses-module/constants";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRecord,
} from "@/types/expenses-module";
import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";
import type { StaffPaymentType } from "@/types/staff-payment";

const PAYMENT_METHODS = new Set<ExpensePaymentMethod>([
  "cash",
  "mobile-money",
  "card",
  "bank-transfer",
  "other",
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

const STAFF_PAYMENT_TYPES = new Set<StaffPaymentType>([
  "daily-wage",
  "weekly-wage",
  "salary",
  "bonus",
  "advance",
  "deduction",
]);

function normalizeStaffPaymentType(value: unknown): StaffPaymentType | undefined {
  if (
    typeof value === "string" &&
    STAFF_PAYMENT_TYPES.has(value as StaffPaymentType)
  ) {
    return value as StaffPaymentType;
  }
  return undefined;
}

function normalizeStaffRole(value: unknown): StaffRoleId | undefined {
  return typeof value === "string" && value.trim()
    ? (value.trim() as StaffRoleId)
    : undefined;
}

function normalizeBranch(value: unknown): Branch {
  return normalizeBranchCode(value);
}

function normalizeExpenseRecord(value: unknown): ExpenseRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const categoryId =
    typeof raw.categoryId === "string" ? raw.categoryId.trim() : "";
  const categoryName =
    typeof raw.categoryName === "string" ? raw.categoryName.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const now = new Date().toISOString();

  if (!id || !date || !categoryId || !categoryName || !description) {
    return null;
  }

  const amount = normalizePositiveNumber(raw.amount);
  if (amount <= 0) return null;

  return {
    id,
    date,
    categoryId,
    categoryName,
    description,
    amount,
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    branch: normalizeBranch(raw.branch),
    staffId: normalizeOptionalString(raw.staffId),
    staffName: normalizeOptionalString(raw.staffName),
    staffRole: normalizeStaffRole(raw.staffRole),
    staffPaymentType: normalizeStaffPaymentType(raw.staffPaymentType),
    staffPaymentId: normalizeOptionalString(raw.staffPaymentId),
    createdBy: normalizeStaffActionRecord(raw.createdBy),
    paidBy: normalizeStaffActionRecord(raw.paidBy),
    notes: normalizeOptionalString(raw.notes),
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };
}

export function normalizeExpenseRecordList(value: unknown): ExpenseRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeExpenseRecord)
    .filter((record): record is ExpenseRecord => record !== null);
}

function normalizeExpenseCategory(value: unknown): ExpenseCategory | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const now = new Date().toISOString();

  if (!id || !name) return null;

  return {
    id,
    name,
    isDefault: raw.isDefault === true,
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };
}

export function normalizeExpenseCategoryList(
  value: unknown
): ExpenseCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeExpenseCategory)
    .filter((category): category is ExpenseCategory => category !== null);
}

export function createDefaultExpenseCategories(): ExpenseCategory[] {
  const now = new Date().toISOString();
  const defaults = DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }));

  return [
    ...defaults,
    {
      id: STAFF_PAYMENT_CATEGORY_ID,
      name: STAFF_PAYMENT_CATEGORY_NAME,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function ensureStaffPaymentCategory(
  categories: ExpenseCategory[]
): ExpenseCategory[] {
  if (categories.some((category) => category.id === STAFF_PAYMENT_CATEGORY_ID)) {
    return categories;
  }

  const now = new Date().toISOString();
  return [
    ...categories,
    {
      id: STAFF_PAYMENT_CATEGORY_ID,
      name: STAFF_PAYMENT_CATEGORY_NAME,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function sortExpenseRecordsByDate(
  records: ExpenseRecord[]
): ExpenseRecord[] {
  return [...records].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function sortExpenseCategoriesByName(
  categories: ExpenseCategory[]
): ExpenseCategory[] {
  return [...categories].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}
