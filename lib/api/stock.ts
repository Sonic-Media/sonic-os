import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  StockMovement,
  StockMovementInput,
  StockPriceChange,
  StockProduct,
  StockProductInput,
  StockProductUpdateInput,
} from "@/types/stock";

export interface StockPriceChangeInput {
  productId: string;
  newBuyingPrice: number;
  newSellingPrice: number;
}

export async function fetchStockProducts(): Promise<StockProduct[]> {
  return apiGet<StockProduct[]>("/api/stock/products");
}

export async function createStockProductApi(
  input: StockProductInput
): Promise<StockProduct> {
  return apiPost<StockProduct>("/api/stock/products", input);
}

export async function updateStockProductApi(
  id: string,
  input: StockProductUpdateInput
): Promise<StockProduct> {
  return apiPatch<StockProduct>(`/api/stock/products/${id}`, input);
}

export async function deleteStockProductApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/stock/products/${id}`);
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  return apiGet<StockMovement[]>("/api/stock/movements");
}

export async function createStockMovementApi(
  input: StockMovementInput
): Promise<StockMovement> {
  return apiPost<StockMovement>("/api/stock/movements", input);
}

export async function fetchStockPriceChanges(): Promise<StockPriceChange[]> {
  return apiGet<StockPriceChange[]>("/api/stock/price-changes");
}

export async function createStockPriceChangeApi(
  input: StockPriceChangeInput
): Promise<StockPriceChange> {
  return apiPost<StockPriceChange>("/api/stock/price-changes", input);
}
