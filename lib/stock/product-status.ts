import type { StockProductStatus } from "@/types/stock";

export function computeProductStatus(
  currentStock: number,
  minimumStockLevel: number
): StockProductStatus {
  if (currentStock <= 0) return "out-of-stock";
  if (currentStock <= minimumStockLevel) return "low-stock";
  return "in-stock";
}
