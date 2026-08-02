import { getTodayISO } from "@/lib/dates";
import type {
  Purchase,
  PurchaseLineItemInput,
  PurchaseTotalsPreview,
  PurchasingDashboardMetrics,
  Supplier,
  SupplierWithStats,
} from "@/types/purchasing";

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function computeLineSubtotal(
  quantity: number,
  buyingPrice: number
): number {
  return quantity * buyingPrice;
}

export function computePurchaseTotals(
  items: PurchaseLineItemInput[]
): PurchaseTotalsPreview {
  const lineSubtotals = items.map((item) =>
    computeLineSubtotal(item.quantity, item.buyingPrice)
  );

  return {
    lineSubtotals,
    grandTotal: lineSubtotals.reduce((sum, value) => sum + value, 0),
  };
}

export function computeWeightedAverageBuyingPrice(
  currentStock: number,
  currentBuyingPrice: number,
  purchaseQuantity: number,
  purchaseBuyingPrice: number
): number {
  if (purchaseQuantity <= 0) return currentBuyingPrice;
  if (currentStock <= 0) return purchaseBuyingPrice;

  const totalCost =
    currentStock * currentBuyingPrice + purchaseQuantity * purchaseBuyingPrice;
  const totalQuantity = currentStock + purchaseQuantity;

  return Math.round(totalCost / totalQuantity);
}

export function computePurchasingDashboardMetrics(
  purchases: Purchase[],
  todayISO: string = getTodayISO()
): PurchasingDashboardMetrics {
  const monthStart = getMonthStartISO();
  const monthlyPurchases = purchases.filter(
    (purchase) => purchase.date >= monthStart
  );
  const todaysPurchases = purchases.filter(
    (purchase) => purchase.date === todayISO
  );

  if (purchases.length === 0) {
    return {
      todaysPurchases: null,
      monthlyPurchases: null,
      totalPurchaseValue: null,
      topSupplier: null,
    };
  }

  const supplierTotals = new Map<string, number>();
  for (const purchase of monthlyPurchases) {
    supplierTotals.set(
      purchase.supplierName,
      (supplierTotals.get(purchase.supplierName) ?? 0) + purchase.totalCost
    );
  }

  let topSupplier: string | null = null;
  let topAmount = 0;
  for (const [name, amount] of supplierTotals) {
    if (amount > topAmount) {
      topAmount = amount;
      topSupplier = name;
    }
  }

  return {
    todaysPurchases: todaysPurchases.length,
    monthlyPurchases: monthlyPurchases.length,
    totalPurchaseValue: monthlyPurchases.reduce(
      (sum, purchase) => sum + purchase.totalCost,
      0
    ),
    topSupplier,
  };
}

export function computeSupplierStats(
  supplier: Supplier,
  purchases: Purchase[]
): SupplierWithStats {
  const supplierPurchases = purchases.filter(
    (purchase) => purchase.supplierId === supplier.id
  );

  const totalPurchases = supplierPurchases.length;
  const totalAmountPurchased = supplierPurchases.reduce(
    (sum, purchase) => sum + purchase.totalCost,
    0
  );
  const lastPurchaseDate =
    supplierPurchases.length > 0
      ? supplierPurchases.reduce(
          (latest, purchase) => (purchase.date > latest ? purchase.date : latest),
          supplierPurchases[0].date
        )
      : null;

  return {
    ...supplier,
    totalPurchases,
    totalAmountPurchased,
    lastPurchaseDate,
  };
}

export function generatePurchaseInvoiceNumber(
  purchases: Purchase[],
  dateISO: string
): string {
  const datePart = dateISO.replace(/-/g, "");
  const todayCount =
    purchases.filter((purchase) => purchase.date === dateISO).length + 1;
  return `PUR-${datePart}-${String(todayCount).padStart(4, "0")}`;
}

export function mergePurchaseLineItems(
  items: PurchaseLineItemInput[]
): PurchaseLineItemInput[] {
  const merged = new Map<string, PurchaseLineItemInput>();

  for (const item of items) {
    const existing = merged.get(item.productId);
    if (!existing) {
      merged.set(item.productId, { ...item });
      continue;
    }

    const totalQuantity = existing.quantity + item.quantity;
    const weightedPrice = Math.round(
      (existing.quantity * existing.buyingPrice +
        item.quantity * item.buyingPrice) /
        totalQuantity
    );

    merged.set(item.productId, {
      productId: item.productId,
      quantity: totalQuantity,
      buyingPrice: weightedPrice,
    });
  }

  return Array.from(merged.values());
}
