import { aggregateEntries, getBranchTotals } from "@/lib/aggregations";
import {
  calculateExpenses,
  calculateOperatingExpenses,
  calculateSavingsFromTotals,
} from "@/lib/amounts";
import {
  computeWeightedAverageBuyingPrice,
  mergePurchaseLineItems,
} from "@/lib/purchasing/calculations";
import { computeSalePreview } from "@/lib/sales/calculations";
import type { Branch, Entry } from "@/types";
import type { PurchaseLineItemInput } from "@/types/purchasing";

/** Derive expected sale totals from controlled test inputs (never hardcode magic totals). */
export function expectedSaleTotals(input: {
  quantity: number;
  unitPrice: number;
  buyingPrice: number;
  discount?: number;
}) {
  return computeSalePreview(
    input.quantity,
    input.unitPrice,
    input.buyingPrice,
    input.discount ?? 0
  );
}

/** Derive expected purchase total cost from controlled line inputs. */
export function expectedPurchaseTotalCost(
  quantity: number,
  buyingPrice: number
): number {
  return quantity * buyingPrice;
}

/** Derive remaining stock after explicit sale quantities. */
export function expectedRemainingStock(
  initialStock: number,
  soldQuantities: number[]
): number {
  return initialStock - soldQuantities.reduce((sum, qty) => sum + qty, 0);
}

/** Derive weighted-average buying price for merged purchase lines. */
export function expectedMergedBuyingPrice(
  lines: Pick<PurchaseLineItemInput, "quantity" | "buyingPrice">[]
): number {
  const merged = mergePurchaseLineItems(
    lines.map((line) => ({
      productId: "merge-target",
      quantity: line.quantity,
      buyingPrice: line.buyingPrice,
    }))
  );
  return merged[0]?.buyingPrice ?? 0;
}

/** Derive weighted average stock cost after a purchase receipt. */
export function expectedWeightedAverageBuyingPrice(
  currentStock: number,
  currentBuyingPrice: number,
  purchaseQuantity: number,
  purchaseBuyingPrice: number
): number {
  return computeWeightedAverageBuyingPrice(
    currentStock,
    currentBuyingPrice,
    purchaseQuantity,
    purchaseBuyingPrice
  );
}

/** Derive branch sales total from controlled fixture entries. */
export function expectedBranchSales(
  entries: Pick<Entry, "branch" | "sales">[],
  branch: Branch
): number {
  const summary = aggregateEntries(entries as Entry[], {
    branchIds: [branch],
  });
  return getBranchTotals(summary.byBranch, branch).sales;
}

/** Derive operating expenses total from fixture entry expenses. */
export function expectedOperatingExpenses(
  entry: Pick<Entry, "expenses">
): number {
  return calculateOperatingExpenses(entry);
}

/** Derive report totals from controlled fixture entries (independent of aggregateEntries). */
export function expectedReportTotalsFromEntries(
  entries: Pick<Entry, "sales" | "expenses">[]
) {
  const totalSales = entries.reduce((sum, entry) => sum + entry.sales, 0);
  const totalExpenses = entries.reduce(
    (sum, entry) => sum + calculateExpenses(entry),
    0
  );

  return {
    totalSales,
    totalExpenses,
    totalSavings: calculateSavingsFromTotals(totalSales, totalExpenses),
  };
}

/** Derive branch sales for entries matching a date prefix (e.g. month). */
export function expectedSalesForDatePrefix(
  entries: Pick<Entry, "date" | "sales">[],
  datePrefix: string
): number {
  return entries
    .filter((entry) => entry.date.startsWith(datePrefix))
    .reduce((sum, entry) => sum + entry.sales, 0);
}
