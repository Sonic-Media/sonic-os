import {
  PURCHASING_PURCHASES_STORAGE_KEY,
  PURCHASING_SUPPLIERS_STORAGE_KEY,
} from "@/lib/constants";
import { normalizeBranchCode } from "@/lib/branch-storage";
import type { Purchase, PurchaseLineItem, Supplier } from "@/types/purchasing";

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

function normalizePurchaseLineItem(value: unknown): PurchaseLineItem | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const productId =
    typeof raw.productId === "string" ? raw.productId.trim() : "";
  const productName =
    typeof raw.productName === "string" ? raw.productName.trim() : "";
  const quantity = normalizePositiveNumber(raw.quantity);

  if (!productId || !productName || quantity <= 0) return null;

  const buyingPrice = normalizePositiveNumber(raw.buyingPrice);
  const lineTotal = normalizeNonNegativeNumber(
    raw.lineTotal,
    quantity * buyingPrice
  );

  return {
    productId,
    productName,
    quantity,
    buyingPrice,
    lineTotal,
  };
}

function normalizePurchase(value: unknown): Purchase | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const invoiceNumber =
    typeof raw.invoiceNumber === "string" ? raw.invoiceNumber.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const supplierId =
    typeof raw.supplierId === "string" ? raw.supplierId.trim() : "";
  const supplierName =
    typeof raw.supplierName === "string" ? raw.supplierName.trim() : "";
  const now = new Date().toISOString();

  if (!id || !invoiceNumber || !date || !supplierId || !supplierName) {
    return null;
  }

  const items = Array.isArray(raw.items)
    ? raw.items
        .map(normalizePurchaseLineItem)
        .filter((item): item is PurchaseLineItem => item !== null)
    : [];

  if (items.length === 0) return null;

  return {
    id,
    invoiceNumber,
    date,
    supplierId,
    supplierName,
    items,
    totalCost: normalizeNonNegativeNumber(raw.totalCost),
    branch: normalizeBranchCode(raw.branch),
    staffId: normalizeOptionalString(raw.staffId),
    staffName: normalizeOptionalString(raw.staffName),
    notes: normalizeOptionalString(raw.notes),
    createdAt: normalizeTimestamp(raw.createdAt, now),
  };
}

export function normalizePurchaseList(value: unknown): Purchase[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePurchase)
    .filter((purchase): purchase is Purchase => purchase !== null);
}

function normalizeSupplier(value: unknown): Supplier | null {
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
    address: normalizeOptionalString(raw.address),
    notes: normalizeOptionalString(raw.notes),
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };
}

export function normalizeSupplierList(value: unknown): Supplier[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSupplier)
    .filter((supplier): supplier is Supplier => supplier !== null);
}

export function getPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PURCHASING_PURCHASES_STORAGE_KEY);
    if (!raw) return [];
    return normalizePurchaseList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function savePurchases(purchases: Purchase[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PURCHASING_PURCHASES_STORAGE_KEY,
    JSON.stringify(purchases)
  );
}

export function getSuppliers(): Supplier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PURCHASING_SUPPLIERS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeSupplierList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function saveSuppliers(suppliers: Supplier[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PURCHASING_SUPPLIERS_STORAGE_KEY,
    JSON.stringify(suppliers)
  );
}

export function sortPurchasesByDate(purchases: Purchase[]): Purchase[] {
  return [...purchases].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function sortSuppliersByName(suppliers: Supplier[]): Supplier[] {
  return [...suppliers].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}
