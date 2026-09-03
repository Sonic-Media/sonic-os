import {
  filterSalesByDate,
  getBranchProductStock,
  pushUniqueInsight,
  shiftDateISO,
} from "@/lib/business-intelligence/helpers";
import type { BIAnalysisContext } from "@/lib/business-intelligence/context";
import type { BIInsight } from "@/lib/business-intelligence/types";

export function generateInventoryInsights(context: BIAnalysisContext): BIInsight[] {
  const insights: BIInsight[] = [];
  const seen = new Set<string>();
  const { today, products, movements, branches } = context;

  const activeBranches = branches.filter((branch) => branch.active);
  const lowStockProducts: string[] = [];
  const outOfStockProducts: string[] = [];
  const negativeStockProducts: string[] = [];

  for (const product of products) {
    let minStock = Number.POSITIVE_INFINITY;
    let anyNegative = false;
    let anyOut = false;
    let anyLow = false;

    for (const branch of activeBranches) {
      const qty = getBranchProductStock(product, branch.code, movements);
      minStock = Math.min(minStock, qty);
      if (qty < 0) anyNegative = true;
      if (qty === 0) anyOut = true;
      if (qty > 0 && qty <= product.minimumStockLevel) anyLow = true;
    }

    if (anyNegative) negativeStockProducts.push(product.name);
    else if (anyOut) outOfStockProducts.push(product.name);
    else if (anyLow) lowStockProducts.push(product.name);
  }

  if (negativeStockProducts.length > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-negative",
        text: `Product inventory is negative for ${negativeStockProducts.slice(0, 2).join(", ")}${negativeStockProducts.length > 2 ? " and others" : ""}.`,
        severity: "critical",
        tier: "critical",
        category: "stock",
        priority: 95,
      },
      seen
    );
  }

  if (outOfStockProducts.length > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-out",
        text: `${outOfStockProducts.slice(0, 3).join(", ")} ${outOfStockProducts.length === 1 ? "is" : "are"} out of stock.`,
        severity: "critical",
        tier: "critical",
        category: "stock",
        priority: 90,
      },
      seen
    );
  } else if (lowStockProducts.length > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-low",
        text: `${lowStockProducts.slice(0, 3).join(", ")} ${lowStockProducts.length === 1 ? "is" : "are"} below minimum stock.`,
        severity: "warning",
        tier: "critical",
        category: "stock",
        priority: 85,
      },
      seen
    );
  }

  const itemCounts = new Map<string, number>();
  const todaySales = filterSalesByDate(context.sales, today);
  for (const sale of todaySales) {
    for (const item of sale.items) {
      itemCounts.set(
        item.productName,
        (itemCounts.get(item.productName) ?? 0) + item.quantity
      );
    }
  }

  const fastMoving = [...itemCounts.entries()].sort(([, left], [, right]) => right - left);
  if (fastMoving[0] && fastMoving[0][1] >= 3) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-fast-moving",
        text: `${fastMoving[0][0]} is the fastest moving product today (${fastMoving[0][1]} units sold).`,
        severity: "positive",
        tier: "achievement",
        category: "stock",
        priority: 40,
      },
      seen
    );
  }

  const weekAgo = shiftDateISO(today, -7);
  const recentSaleProducts = new Set<string>();
  for (const sale of context.sales) {
    if (sale.status !== "completed" || sale.date < weekAgo) continue;
    for (const item of sale.items) {
      recentSaleProducts.add(item.productId);
    }
  }

  const slowProducts = products.filter((product) => {
    const hasStock = activeBranches.some(
      (branch) => getBranchProductStock(product, branch.code, movements) > 0
    );
    return hasStock && !recentSaleProducts.has(product.id);
  });

  if (slowProducts.length > 0 && slowProducts.length <= 5) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-slow-moving",
        text: `${slowProducts.slice(0, 2).map((p) => p.name).join(", ")} ${slowProducts.length === 1 ? "has" : "have"} had no sales in the last 7 days despite holding stock.`,
        severity: "warning",
        tier: "recommendation",
        category: "stock",
        priority: 35,
      },
      seen
    );
  }

  const monthAgo = shiftDateISO(today, -30);
  const recentMovementProducts = new Set<string>();
  for (const movement of movements) {
    if (movement.date >= monthAgo) {
      recentMovementProducts.add(movement.productId);
    }
  }

  const deadStock = products.filter(
    (product) =>
      !recentMovementProducts.has(product.id) &&
      activeBranches.some(
        (branch) => getBranchProductStock(product, branch.code, movements) > 0
      )
  );

  if (deadStock.length > 0) {
    pushUniqueInsight(
      insights,
      {
        id: "stock-dead",
        text: `${deadStock.length} product${deadStock.length === 1 ? "" : "s"} show no stock movement in 30 days — review for dead stock.`,
        severity: "info",
        tier: "recommendation",
        category: "stock",
        priority: 25,
      },
      seen
    );
  }

  return insights;
}
