import { normalizeBranchCode } from "@/lib/branch-storage";
import { normalizeStaffActionRecord } from "@/lib/staff/session";
import type {
  Customer,
  Sale,
  SaleLineItem,
  SalePaymentMethod,
  SaleStatus,
} from "@/types/sales";

const PAYMENT_METHODS = new Set<SalePaymentMethod>([
  "cash",
  "mobile-money",
  "card",
  "bank-transfer",
  "other",
]);

const SALE_STATUSES = new Set<SaleStatus>(["completed", "voided"]);

function normalizeTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function normalizePositiveNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function normalizePaymentMethod(value: unknown): SalePaymentMethod {
  if (
    typeof value === "string" &&
    PAYMENT_METHODS.has(value as SalePaymentMethod)
  ) {
    return value as SalePaymentMethod;
  }
  return "cash";
}

function normalizeSaleStatus(value: unknown): SaleStatus {
  if (typeof value === "string" && SALE_STATUSES.has(value as SaleStatus)) {
    return value as SaleStatus;
  }
  return "completed";
}

function normalizeSaleLineItem(value: unknown): SaleLineItem | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const productId =
    typeof raw.productId === "string" ? raw.productId.trim() : "";
  const productName =
    typeof raw.productName === "string" ? raw.productName.trim() : "";
  const quantity = normalizePositiveNumber(raw.quantity);

  if (!productId || !productName || quantity <= 0) return null;

  const unitPrice = normalizePositiveNumber(raw.unitPrice);
  const buyingPrice = normalizeNonNegativeNumber(raw.buyingPrice);
  const lineTotal = normalizeNonNegativeNumber(
    raw.lineTotal,
    quantity * unitPrice
  );

  return {
    productId,
    productName,
    quantity,
    unitPrice,
    buyingPrice,
    lineTotal,
  };
}

function normalizeSale(value: unknown): Sale | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const invoiceNumber =
    typeof raw.invoiceNumber === "string" ? raw.invoiceNumber.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const time = typeof raw.time === "string" ? raw.time.trim() : "";
  const now = new Date().toISOString();

  if (!id || !invoiceNumber || !date || !time) return null;

  const items = Array.isArray(raw.items)
    ? raw.items
        .map(normalizeSaleLineItem)
        .filter((item): item is SaleLineItem => item !== null)
    : [];

  if (items.length === 0) return null;

  return {
    id,
    invoiceNumber,
    date,
    time,
    customerId: normalizeOptionalString(raw.customerId),
    customerName: normalizeOptionalString(raw.customerName),
    items,
    subtotal: normalizeNonNegativeNumber(raw.subtotal),
    discount: normalizeNonNegativeNumber(raw.discount),
    total: normalizeNonNegativeNumber(raw.total),
    profit: normalizeNonNegativeNumber(raw.profit),
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    branch: normalizeBranchCode(raw.branch),
    staffId: normalizeOptionalString(raw.staffId),
    staffName: normalizeOptionalString(raw.staffName),
    createdBy: normalizeStaffActionRecord(raw.createdBy),
    completedBy: normalizeStaffActionRecord(raw.completedBy),
    notes: normalizeOptionalString(raw.notes),
    status: normalizeSaleStatus(raw.status),
    createdAt: normalizeTimestamp(raw.createdAt, now),
  };
}

export function normalizeSaleList(value: unknown): Sale[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSale)
    .filter((sale): sale is Sale => sale !== null);
}

function normalizeCustomer(value: unknown): Customer | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const now = new Date().toISOString();

  if (!id || !name) return null;

  return {
    id,
    name,
    phone: normalizeOptionalString(raw.phone),
    email: normalizeOptionalString(raw.email),
    notes: normalizeOptionalString(raw.notes),
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };
}

export function normalizeCustomerList(value: unknown): Customer[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeCustomer)
    .filter((customer): customer is Customer => customer !== null);
}

export function sortSalesByDate(sales: Sale[]): Sale[] {
  return [...sales].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function sortCustomersByName(customers: Customer[]): Customer[] {
  return [...customers].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}
