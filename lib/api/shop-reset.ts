import { apiGet, apiPost } from "@/lib/api/client";
import type { ShopResetScope } from "@/lib/shop-reset/constants";

export interface ShopResetCounts {
  sales: number;
  saleLineItems: number;
  expenses: number;
  purchases: number;
  purchaseLineItems: number;
  staffPayments: number;
  dailyOperations: number;
  dailyOperationExpenses: number;
  dayClosings: number;
  stockMovements: number;
  stockPriceChanges: number;
  customers: number;
  suppliers: number;
  auditLogEntries: number;
  productStockReset: number;
}

export interface ShopResetPreviewResponse {
  scope: ShopResetScope;
  branchCodes: string[];
  branchLabels: string[];
  counts: ShopResetCounts;
  preserved: {
    users: number;
    staff: number;
    roles: number;
    branches: number;
    products: number;
    productCategories: number;
    settings: number;
  };
  blockers: string[];
  canReset: boolean;
}

export interface ShopResetReportResponse {
  scope: ShopResetScope;
  branchCodes: string[];
  resetType: "single-branch" | "both-branches";
  backupPath?: string;
  deleted: ShopResetCounts;
  verification: ShopResetCounts;
  preserved: ShopResetPreviewResponse["preserved"];
}

export async function previewShopResetApi(
  scope: ShopResetScope
): Promise<ShopResetPreviewResponse> {
  return apiGet<ShopResetPreviewResponse>(
    `/api/admin/shop-reset?scope=${encodeURIComponent(scope)}`
  );
}

export async function resetShopApi(input: {
  scope: ShopResetScope;
  confirmation: string;
}): Promise<ShopResetReportResponse> {
  return apiPost<ShopResetReportResponse>("/api/admin/shop-reset", input);
}
