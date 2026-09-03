import { normalizeBranchCode } from "@/lib/branch-storage";
import { normalizeStaffActionRecord } from "@/lib/staff/session";
import { withProductStatus } from "@/lib/stock/calculations";
import { STOCK_PRODUCT_CATEGORIES } from "@/lib/stock/constants";
import type {
  StockMovement,
  StockMovementType,
  StockPriceChange,
  StockProduct,
  StockProductCategory,
} from "@/types/stock";

const STOCK_CATEGORY_IDS = new Set(
  STOCK_PRODUCT_CATEGORIES.map((category) => category.id)
);

function normalizeCategory(value: unknown): StockProductCategory {
  if (
    typeof value === "string" &&
    STOCK_CATEGORY_IDS.has(value as StockProductCategory)
  ) {
    return value as StockProductCategory;
  }

  return "other-accessories";
}

function normalizeMovementType(value: unknown): StockMovementType {
  return value === "out" ? "out" : "in";
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeNonNegativeInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded < 0 ? 0 : rounded;
}

function normalizePositiveNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeBranch(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return normalizeBranchCode(value);
  }
  return normalizeBranchCode("main");
}

function normalizeStockProduct(value: unknown): StockProduct | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const now = new Date().toISOString();

  if (!id || !name) return null;

  const product: StockProduct = {
    id,
    name,
    branch: normalizeBranch(raw.branch),
    category: normalizeCategory(raw.category),
    sku: normalizeOptionalString(raw.sku),
    buyingPrice: normalizePositiveNumber(raw.buyingPrice),
    sellingPrice: normalizePositiveNumber(raw.sellingPrice),
    currentStock: normalizeNonNegativeInteger(raw.currentStock),
    minimumStockLevel: normalizeNonNegativeInteger(raw.minimumStockLevel),
    notes: normalizeOptionalString(raw.notes),
    status: "out-of-stock",
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
  };

  return withProductStatus(product);
}

export function normalizeStockProductList(value: unknown): StockProduct[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeStockProduct)
    .filter((product): product is StockProduct => product !== null);
}

function normalizeStockMovement(value: unknown): StockMovement | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const productId =
    typeof raw.productId === "string" ? raw.productId.trim() : "";
  const productName =
    typeof raw.productName === "string" ? raw.productName.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const now = new Date().toISOString();

  if (!id || !productId || !productName || !reason || !date) return null;

  const quantity = normalizeNonNegativeInteger(raw.quantity);
  if (quantity <= 0) return null;

  return {
    id,
    date,
    productId,
    productName,
    movement: normalizeMovementType(raw.movement),
    quantity,
    reason,
    branch: normalizeBranchCode(raw.branch),
    notes: normalizeOptionalString(raw.notes),
    createdBy: normalizeStaffActionRecord(raw.createdBy),
    createdAt: normalizeTimestamp(raw.createdAt, now),
  };
}

export function normalizeStockMovementList(value: unknown): StockMovement[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeStockMovement)
    .filter((movement): movement is StockMovement => movement !== null);
}

export function sortProductsByName(products: StockProduct[]): StockProduct[] {
  return [...products].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function sortMovementsByDate(
  movements: StockMovement[]
): StockMovement[] {
  return [...movements].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function normalizeStockPriceChange(value: unknown): StockPriceChange | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const productId =
    typeof raw.productId === "string" ? raw.productId.trim() : "";
  const now = new Date().toISOString();

  if (!id || !productId) return null;

  return {
    id,
    productId,
    previousBuyingPrice: normalizePositiveNumber(raw.previousBuyingPrice),
    previousSellingPrice: normalizePositiveNumber(raw.previousSellingPrice),
    newBuyingPrice: normalizePositiveNumber(raw.newBuyingPrice),
    newSellingPrice: normalizePositiveNumber(raw.newSellingPrice),
    createdAt: normalizeTimestamp(raw.createdAt, now),
  };
}

export function normalizeStockPriceChangeList(
  value: unknown
): StockPriceChange[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeStockPriceChange)
    .filter((change): change is StockPriceChange => change !== null);
}

export function sortPriceChangesByDate(
  changes: StockPriceChange[]
): StockPriceChange[] {
  return [...changes].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}
