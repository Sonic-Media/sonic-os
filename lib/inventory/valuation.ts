import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { computeInventoryValueByBranch } from "@/lib/branch/calculations";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";
import type { StockMovement, StockProduct } from "@/types/stock";

/**
 * Authoritative branch inventory valuation derived ONLY from stock products
 * and stock movements. Operating expenses never participate in this calculation.
 */
export function computeAuthoritativeBranchInventoryValue(
  branch: BranchEntity | { code: Branch },
  products: StockProduct[],
  movements: StockMovement[]
): number {
  return computeInventoryValueByBranch(
    "name" in branch && "id" in branch
      ? branch
      : ({ code: branch.code, name: branch.code } as BranchEntity),
    products,
    movements
  );
}

export function computeAuthoritativeProductInventoryValue(
  product: StockProduct,
  branch: Branch,
  movements: StockMovement[]
): number {
  let netQuantity = 0;

  for (const movement of movements) {
    if (
      movement.productId !== product.id ||
      !branchCodesReferToSameInventory(movement.branch, branch)
    ) {
      continue;
    }

    netQuantity +=
      movement.movement === "in" ? movement.quantity : -movement.quantity;
  }

  return Math.max(0, netQuantity) * product.buyingPrice;
}
