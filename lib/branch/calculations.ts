import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import type { BranchEntity, BranchDashboardMetrics } from "@/types/branch";
import type { Entry } from "@/types";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StockMovement, StockProduct } from "@/types/stock";

export function computeBranchDashboardMetrics(
  branches: BranchEntity[]
): BranchDashboardMetrics {
  return {
    totalBranches: branches.length,
    activeBranches: branches.filter((branch) => branch.active).length,
  };
}

export function computeTodayRevenueByBranch(
  branch: BranchEntity,
  sales: Sale[],
  entries: Entry[],
  today = getTodayISO()
): number {
  const moduleRevenue = sales
    .filter(
      (sale) =>
        sale.date === today &&
        sale.status === "completed" &&
        branchCodesReferToSameInventory(sale.branch, branch.code)
    )
    .reduce((sum, sale) => sum + sale.total, 0);

  const entryRevenue = entries
    .filter(
      (entry) =>
        entry.date === today &&
        (entry.status === "completed" || entry.status === "draft") &&
        branchCodesReferToSameInventory(entry.branch, branch.code)
    )
    .reduce((sum, entry) => sum + entry.sales, 0);

  return moduleRevenue + entryRevenue;
}

export function computeInventoryValueByBranch(
  branch: BranchEntity,
  products: StockProduct[],
  movements: StockMovement[]
): number {
  let total = 0;

  for (const product of products) {
    const branchMovements = movements.filter(
      (movement) =>
        movement.productId === product.id &&
        branchCodesReferToSameInventory(movement.branch, branch.code)
    );

    const netQuantity = branchMovements.reduce((sum, movement) => {
      return movement.movement === "in"
        ? sum + movement.quantity
        : sum - movement.quantity;
    }, 0);

    if (netQuantity > 0) {
      total += netQuantity * product.buyingPrice;
    }
  }

  return total;
}

export function computeTodayPurchaseCostByBranch(
  branch: BranchEntity,
  purchases: Purchase[],
  today = getTodayISO()
): number {
  return purchases
    .filter(
      (purchase) =>
        purchase.date === today &&
        branchCodesReferToSameInventory(purchase.branch, branch.code)
    )
    .reduce((sum, purchase) => sum + purchase.totalCost, 0);
}
