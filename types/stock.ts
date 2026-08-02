export type StockProductCategory =
  | "flash-disks"
  | "hard-drives"
  | "usb-cables"
  | "chargers"
  | "earphones"
  | "bluetooth-speakers"
  | "hdmi-cables"
  | "game-controllers"
  | "phone-accessories"
  | "computer-accessories"
  | "networking-equipment"
  | "other-accessories";

export type StockProductStatus = "in-stock" | "low-stock" | "out-of-stock";

export type StockMovementType = "in" | "out";

import type { Branch } from "@/types";
import type { StaffActionRecord } from "@/types/staff-session";

export type StockProductSortField =
  | "name"
  | "stock"
  | "buying-price"
  | "selling-price"
  | "profit";

export type StockProductSortOrder = "asc" | "desc";

export interface StockDashboardMetrics {
  inventoryValue: number | null;
  totalProducts: number | null;
  lowStock: number | null;
  outOfStock: number | null;
  todayStockIn: number | null;
  todayStockOut: number | null;
}

export interface StockProduct {
  id: string;
  name: string;
  category: StockProductCategory;
  sku?: string;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStockLevel: number;
  notes?: string;
  status: StockProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  movement: StockMovementType;
  quantity: number;
  reason: string;
  branch: Branch;
  notes?: string;
  createdBy?: StaffActionRecord;
  createdAt: string;
}

export type StockCategoryFilter = StockProductCategory | "all";

export type StockStatusFilter = StockProductStatus | "all";

export interface StockProductFilterCriteria {
  search: string;
  category: StockCategoryFilter;
  status: StockStatusFilter;
  sortField: StockProductSortField;
  sortOrder: StockProductSortOrder;
}

export interface StockProductInput {
  name: string;
  category: StockProductCategory;
  sku?: string;
  buyingPrice: number;
  sellingPrice: number;
  initialStock?: number;
  minimumStockLevel: number;
  notes?: string;
}

export interface StockProductUpdateInput {
  name: string;
  category: StockProductCategory;
  sku?: string;
  buyingPrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  notes?: string;
}

export interface StockMovementInput {
  productId: string;
  movement: StockMovementType;
  quantity: number;
  reason: string;
  branch: Branch;
  notes?: string;
  date?: string;
}

export interface StockValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
  product?: StockProduct;
}

export interface StockPriceChange {
  id: string;
  productId: string;
  previousBuyingPrice: number;
  previousSellingPrice: number;
  newBuyingPrice: number;
  newSellingPrice: number;
  createdAt: string;
}

export type StockProductTimelineEventType =
  | "created"
  | "stock-in"
  | "stock-out"
  | "price-change";

export interface StockProductTimelineEvent {
  id: string;
  type: StockProductTimelineEventType;
  date: string;
  createdAt: string;
  label: string;
  detail?: string;
  quantity?: number;
}

export interface StockProductMetrics {
  totalUnitsPurchased: number;
  totalUnitsSold: number;
  currentStock: number;
  totalInventoryValue: number;
  potentialProfit: number;
}
