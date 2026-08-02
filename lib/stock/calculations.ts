import { formatCurrency } from "@/lib/format";
import type {
  StockDashboardMetrics,
  StockMovement,
  StockPriceChange,
  StockProduct,
  StockProductMetrics,
  StockProductStatus,
  StockProductTimelineEvent,
} from "@/types/stock";

export function computeBranchNetQuantity(
  branchCode: string,
  productId: string,
  movements: StockMovement[]
): number {
  let total = 0;

  for (const movement of movements) {
    if (movement.productId !== productId || movement.branch !== branchCode) {
      continue;
    }

    total +=
      movement.movement === "in"
        ? movement.quantity
        : -movement.quantity;
  }

  return total;
}

export function buildBranchStockMatrix(
  branches: Array<{ code: string }>,
  products: StockProduct[],
  movements: StockMovement[]
): Map<string, number[]> {
  const movementTotals = new Map<string, number>();

  for (const movement of movements) {
    const key = `${movement.productId}:${movement.branch}`;
    const current = movementTotals.get(key) ?? 0;
    movementTotals.set(
      key,
      current +
        (movement.movement === "in"
          ? movement.quantity
          : -movement.quantity)
    );
  }

  const matrix = new Map<string, number[]>();

  for (const product of products) {
    const branchStock = branches.map((branch) => {
      return movementTotals.get(`${product.id}:${branch.code}`) ?? 0;
    });
    matrix.set(product.id, branchStock);
  }

  return matrix;
}

export function computeProductStatus(
  currentStock: number,
  minimumStockLevel: number
): StockProductStatus {
  if (currentStock <= 0) return "out-of-stock";
  if (currentStock <= minimumStockLevel) return "low-stock";
  return "in-stock";
}

export function computeProfitPerItem(
  buyingPrice: number,
  sellingPrice: number
): number {
  return sellingPrice - buyingPrice;
}

export function computeInventoryValue(product: StockProduct): number {
  return product.currentStock * product.buyingPrice;
}

export function computePotentialSalesValue(product: StockProduct): number {
  return product.currentStock * product.sellingPrice;
}

export function computePotentialProfit(product: StockProduct): number {
  return product.currentStock * computeProfitPerItem(
    product.buyingPrice,
    product.sellingPrice
  );
}

export function withProductStatus(product: StockProduct): StockProduct {
  return {
    ...product,
    status: computeProductStatus(
      product.currentStock,
      product.minimumStockLevel
    ),
  };
}

export function computeProductMetrics(
  product: StockProduct,
  movements: StockMovement[]
): StockProductMetrics {
  const productMovements = movements.filter(
    (movement) => movement.productId === product.id
  );

  const totalUnitsPurchased = productMovements
    .filter((movement) => movement.movement === "in")
    .reduce((sum, movement) => sum + movement.quantity, 0);

  const totalUnitsSold = productMovements
    .filter((movement) => movement.movement === "out")
    .reduce((sum, movement) => sum + movement.quantity, 0);

  return {
    totalUnitsPurchased,
    totalUnitsSold,
    currentStock: product.currentStock,
    totalInventoryValue: computeInventoryValue(product),
    potentialProfit: computePotentialProfit(product),
  };
}

export function getLastStockMovement(
  movements: StockMovement[],
  type: "in" | "out"
): StockMovement | undefined {
  return movements.find((movement) => movement.movement === type);
}

export function buildProductTimeline(
  product: StockProduct,
  movements: StockMovement[],
  priceChanges: StockPriceChange[]
): StockProductTimelineEvent[] {
  const events: StockProductTimelineEvent[] = [
    {
      id: `created-${product.id}`,
      type: "created",
      date: product.createdAt.slice(0, 10),
      createdAt: product.createdAt,
      label: "Created Item",
      detail: product.name,
    },
  ];

  for (const movement of movements) {
    events.push({
      id: movement.id,
      type: movement.movement === "in" ? "stock-in" : "stock-out",
      date: movement.date,
      createdAt: movement.createdAt,
      label: movement.movement === "in" ? "Stock In" : "Stock Out",
      detail: movement.reason,
      quantity: movement.quantity,
    });
  }

  for (const change of priceChanges) {
    const buyingChanged = change.previousBuyingPrice !== change.newBuyingPrice;
    const sellingChanged =
      change.previousSellingPrice !== change.newSellingPrice;

    if (!buyingChanged && !sellingChanged) continue;

    const details: string[] = [];
    if (buyingChanged) {
      details.push(
        `Buying: ${formatCurrency(change.previousBuyingPrice)} → ${formatCurrency(change.newBuyingPrice)}`
      );
    }
    if (sellingChanged) {
      details.push(
        `Selling: ${formatCurrency(change.previousSellingPrice)} → ${formatCurrency(change.newSellingPrice)}`
      );
    }

    events.push({
      id: change.id,
      type: "price-change",
      date: change.createdAt.slice(0, 10),
      createdAt: change.createdAt,
      label: "Price Change",
      detail: details.join(" · "),
    });
  }

  return events.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function computeDashboardMetrics(
  products: StockProduct[],
  movements: StockMovement[],
  todayISO: string
): StockDashboardMetrics {
  if (products.length === 0 && movements.length === 0) {
    return {
      inventoryValue: null,
      totalProducts: null,
      lowStock: null,
      outOfStock: null,
      todayStockIn: null,
      todayStockOut: null,
    };
  }

  const inventoryValue = products.reduce(
    (sum, product) => sum + computeInventoryValue(product),
    0
  );

  const todayMovements = movements.filter(
    (movement) => movement.date === todayISO
  );

  return {
    inventoryValue,
    totalProducts: products.length,
    lowStock: products.filter((product) => product.status === "low-stock")
      .length,
    outOfStock: products.filter((product) => product.status === "out-of-stock")
      .length,
    todayStockIn: todayMovements
      .filter((movement) => movement.movement === "in")
      .reduce((sum, movement) => sum + movement.quantity, 0),
    todayStockOut: todayMovements
      .filter((movement) => movement.movement === "out")
      .reduce((sum, movement) => sum + movement.quantity, 0),
  };
}

export function computeBranchDashboardMetrics(
  products: StockProduct[],
  movements: StockMovement[],
  branchCode: string,
  todayISO: string
): StockDashboardMetrics {
  const branchMovements = movements.filter(
    (movement) => movement.branch === branchCode
  );
  const branchProducts = products.map((product) => {
    const currentStock = computeBranchNetQuantity(
      branchCode,
      product.id,
      movements
    );

    return withProductStatus({
      ...product,
      currentStock,
    });
  });

  return computeDashboardMetrics(branchProducts, branchMovements, todayISO);
}
