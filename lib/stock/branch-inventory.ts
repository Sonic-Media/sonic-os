import { computeBranchNetQuantity } from "@/lib/stock/calculations";
import type { Branch } from "@/types";
import type { StockMovement, StockProduct } from "@/types/stock";

export function getBranchProductStock(
  productId: string,
  branchCode: Branch,
  movements: StockMovement[]
): number {
  return computeBranchNetQuantity(branchCode, productId, movements);
}

export type BranchSaleProduct = StockProduct & { branchStock: number };

export function getBranchProductsForSale(
  products: StockProduct[],
  movements: StockMovement[],
  branchCode: Branch
): BranchSaleProduct[] {
  return products
    .map((product) => ({
      ...product,
      branchStock: getBranchProductStock(product.id, branchCode, movements),
    }))
    .filter((product) => product.branchStock > 0);
}
