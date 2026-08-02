import { getTodayISO } from "@/lib/dates";
import type {
  Customer,
  CustomerWithStats,
  Sale,
  SaleCalculationPreview,
  SalesDashboardMetrics,
} from "@/types/sales";

export function computeSalePreview(
  quantity: number,
  unitPrice: number,
  buyingPrice: number,
  discount = 0
): SaleCalculationPreview {
  const subtotal = quantity * unitPrice;
  const normalizedDiscount = Math.max(0, discount);
  const total = Math.max(0, subtotal - normalizedDiscount);
  const cost = quantity * buyingPrice;
  const profit = total - cost;

  return {
    subtotal,
    discount: normalizedDiscount,
    total,
    profit,
  };
}

export function computeSalesDashboardMetrics(
  sales: Sale[],
  todayISO: string = getTodayISO()
): SalesDashboardMetrics {
  const todaySales = sales.filter(
    (sale) => sale.date === todayISO && sale.status === "completed"
  );

  if (todaySales.length === 0) {
    return {
      todayRevenue: null,
      todayProfit: null,
      itemsSoldToday: null,
      transactionsToday: null,
      averageSaleValue: null,
      topSellingItem: null,
    };
  }

  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayProfit = todaySales.reduce((sum, sale) => sum + sale.profit, 0);
  const itemsSoldToday = todaySales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const transactionsToday = todaySales.length;
  const averageSaleValue = todayRevenue / transactionsToday;

  const itemCounts = new Map<string, number>();
  for (const sale of todaySales) {
    for (const item of sale.items) {
      itemCounts.set(
        item.productName,
        (itemCounts.get(item.productName) ?? 0) + item.quantity
      );
    }
  }

  let topSellingItem: string | null = null;
  let topQuantity = 0;
  for (const [name, quantity] of itemCounts) {
    if (quantity > topQuantity) {
      topQuantity = quantity;
      topSellingItem = name;
    }
  }

  return {
    todayRevenue,
    todayProfit,
    itemsSoldToday,
    transactionsToday,
    averageSaleValue,
    topSellingItem,
  };
}

export function computeCustomerStats(
  customer: Customer,
  sales: Sale[]
): CustomerWithStats {
  const customerSales = sales.filter(
    (sale) => sale.customerId === customer.id && sale.status === "completed"
  );

  const purchaseCount = customerSales.length;
  const lifetimeSpend = customerSales.reduce((sum, sale) => sum + sale.total, 0);
  const lastPurchaseDate =
    customerSales.length > 0
      ? customerSales.reduce((latest, sale) =>
          sale.date > latest ? sale.date : latest
        , customerSales[0].date)
      : null;

  return {
    ...customer,
    purchaseCount,
    lifetimeSpend,
    lastPurchaseDate,
  };
}

export function generateInvoiceNumber(
  sales: Sale[],
  dateISO: string
): string {
  const datePart = dateISO.replace(/-/g, "");
  const todayCount = sales.filter((sale) => sale.date === dateISO).length + 1;
  return `INV-${datePart}-${String(todayCount).padStart(4, "0")}`;
}
