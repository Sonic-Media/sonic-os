import { calculateExpenses, calculateSavingsFromTotals } from "@/lib/amounts";
import {
  computeInventoryValueByBranch,
  computeTodayPurchaseCostByBranch,
  computeTodayRevenueByBranch,
} from "@/lib/branch/calculations";
import { getTodayISO } from "@/lib/dates";
import type { BranchComparisonPoint } from "@/lib/chart-data";
import type { BranchEntity, BranchActivityItem, BranchAnalyticsSnapshot } from "@/types/branch";
import type { ChartDataPoint, Entry, Staff } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StockMovement, StockProduct } from "@/types/stock";

const RECENT_ACTIVITY_LIMIT = 10;

function computeBranchNetQuantity(
  branchCode: string,
  productId: string,
  movements: StockMovement[]
): number {
  return movements
    .filter(
      (movement) =>
        movement.productId === productId && movement.branch === branchCode
    )
    .reduce(
      (sum, movement) =>
        movement.movement === "in"
          ? sum + movement.quantity
          : sum - movement.quantity,
      0
    );
}

function computeTodayModuleProfit(branchCode: string, sales: Sale[], today: string): number {
  return sales
    .filter(
      (sale) =>
        sale.date === today &&
        sale.status === "completed" &&
        sale.branch === branchCode
    )
    .reduce((sum, sale) => sum + sale.profit, 0);
}

function computeTodayEntryProfit(
  branchCode: string,
  entries: Entry[],
  today: string
): number {
  return entries
    .filter(
      (entry) =>
        entry.date === today &&
        entry.status === "completed" &&
        entry.branch === branchCode
    )
    .reduce((sum, entry) => {
      const expenses = calculateExpenses(entry);
      return sum + calculateSavingsFromTotals(entry.sales, expenses);
    }, 0);
}

function computeTodayExpenses(
  branch: BranchEntity,
  expenses: ExpenseRecord[],
  entries: Entry[],
  today: string
): number {
  const moduleExpenses = expenses
    .filter((expense) => expense.date === today && expense.branch === branch.code)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const entryExpenses = entries
    .filter(
      (entry) =>
        entry.date === today &&
        entry.status === "completed" &&
        entry.branch === branch.code
    )
    .reduce((sum, entry) => sum + calculateExpenses(entry), 0);

  return moduleExpenses + entryExpenses;
}

function computeTopSellingProduct(
  branchCode: string,
  sales: Sale[],
  today: string
): string | null {
  const itemCounts = new Map<string, number>();

  for (const sale of sales) {
    if (
      sale.date !== today ||
      sale.status !== "completed" ||
      sale.branch !== branchCode
    ) {
      continue;
    }

    for (const item of sale.items) {
      itemCounts.set(
        item.productName,
        (itemCounts.get(item.productName) ?? 0) + item.quantity
      );
    }
  }

  let topSellingProduct: string | null = null;
  let topQuantity = 0;

  for (const [name, quantity] of itemCounts) {
    if (quantity > topQuantity) {
      topQuantity = quantity;
      topSellingProduct = name;
    }
  }

  return topSellingProduct;
}

function computeTopCustomer(
  branchCode: string,
  sales: Sale[],
  today: string
): string | null {
  const customerTotals = new Map<string, number>();

  for (const sale of sales) {
    if (
      sale.date !== today ||
      sale.status !== "completed" ||
      sale.branch !== branchCode ||
      !sale.customerName
    ) {
      continue;
    }

    customerTotals.set(
      sale.customerName,
      (customerTotals.get(sale.customerName) ?? 0) + sale.total
    );
  }

  let topCustomer: string | null = null;
  let topTotal = 0;

  for (const [name, total] of customerTotals) {
    if (total > topTotal) {
      topTotal = total;
      topCustomer = name;
    }
  }

  return topCustomer;
}

function computeLowStockCount(
  branch: BranchEntity,
  products: StockProduct[],
  movements: StockMovement[]
): number {
  let count = 0;

  for (const product of products) {
    const netQuantity = computeBranchNetQuantity(
      branch.code,
      product.id,
      movements
    );

    if (netQuantity > 0 && netQuantity <= product.minimumStockLevel) {
      count += 1;
    }
  }

  return count;
}

function buildRecentActivity(
  branch: BranchEntity,
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  entries: Entry[],
  movements: StockMovement[]
): BranchActivityItem[] {
  const activity: BranchActivityItem[] = [];

  for (const sale of sales) {
    if (sale.branch !== branch.code) continue;

    activity.push({
      id: sale.id,
      type: "sale",
      title: `Sale ${sale.invoiceNumber}`,
      description: sale.customerName ?? "Walk-in customer",
      amount: sale.total,
      timestamp: sale.createdAt,
    });
  }

  for (const purchase of purchases) {
    if (purchase.branch !== branch.code) continue;

    activity.push({
      id: purchase.id,
      type: "purchase",
      title: `Purchase ${purchase.invoiceNumber}`,
      description: purchase.supplierName,
      amount: purchase.totalCost,
      timestamp: purchase.createdAt,
    });
  }

  for (const expense of expenses) {
    if (expense.branch !== branch.code) continue;

    activity.push({
      id: expense.id,
      type: "expense",
      title: expense.categoryName,
      description: expense.description,
      amount: expense.amount,
      timestamp: expense.updatedAt,
    });
  }

  for (const entry of entries) {
    if (entry.branch !== branch.code) continue;

    activity.push({
      id: entry.id,
      type: "entry",
      title: "Daily Entry",
      description: entry.staffName || "Operations entry",
      amount: entry.sales,
      timestamp: entry.createdAt,
    });
  }

  for (const movement of movements) {
    if (movement.branch !== branch.code) continue;

    activity.push({
      id: movement.id,
      type: "movement",
      title: movement.movement === "in" ? "Stock In" : "Stock Out",
      description: `${movement.productName} · ${movement.reason}`,
      amount: movement.quantity,
      timestamp: movement.createdAt,
    });
  }

  return activity
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

export function computeBranchAnalytics(
  branch: BranchEntity,
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  entries: Entry[],
  products: StockProduct[],
  movements: StockMovement[],
  staff: Staff[],
  today = getTodayISO()
): BranchAnalyticsSnapshot {
  const todayRevenue = computeTodayRevenueByBranch(
    branch,
    sales,
    entries,
    today
  );
  const todayProfit =
    computeTodayModuleProfit(branch.code, sales, today) +
    computeTodayEntryProfit(branch.code, entries, today);
  const inventoryValue = computeInventoryValueByBranch(
    branch,
    products,
    movements
  );
  const purchasesTotal = computeTodayPurchaseCostByBranch(
    branch,
    purchases,
    today
  );
  const expensesTotal = computeTodayExpenses(branch, expenses, entries, today);
  const cashFlow = todayRevenue - purchasesTotal - expensesTotal;

  return {
    branchCode: branch.code,
    branchName: branch.name,
    todayRevenue,
    todayProfit,
    inventoryValue,
    purchases: purchasesTotal,
    expenses: expensesTotal,
    cashFlow,
    topSellingProduct: computeTopSellingProduct(branch.code, sales, today),
    topCustomer: computeTopCustomer(branch.code, sales, today),
    staffCount: staff.filter(
      (member) => member.active && member.branch === branch.code
    ).length,
    lowStock: computeLowStockCount(branch, products, movements),
    recentActivity: buildRecentActivity(
      branch,
      sales,
      purchases,
      expenses,
      entries,
      movements
    ),
  };
}

export function buildBranchComparisonChartData(
  snapshots: BranchAnalyticsSnapshot[]
): BranchComparisonPoint[] {
  return snapshots.map((snapshot) => ({
    branch: snapshot.branchName,
    sales: snapshot.todayRevenue,
    expenses: snapshot.expenses,
    savings: snapshot.cashFlow,
  }));
}

export function buildBranchTrendChartData(
  branchCode: string,
  sales: Sale[],
  entries: Entry[],
  today = getTodayISO()
): ChartDataPoint[] {
  const grouped = new Map<string, { sales: number; expenses: number }>();

  for (const sale of sales) {
    if (sale.status !== "completed" || sale.branch !== branchCode) continue;

    const existing = grouped.get(sale.date) ?? { sales: 0, expenses: 0 };
    existing.sales += sale.total;
    grouped.set(sale.date, existing);
  }

  for (const entry of entries) {
    if (entry.status !== "completed" || entry.branch !== branchCode) continue;

    const existing = grouped.get(entry.date) ?? { sales: 0, expenses: 0 };
    existing.sales += entry.sales;
    existing.expenses += calculateExpenses(entry);
    grouped.set(entry.date, existing);
  }

  return Array.from(grouped.entries())
    .filter(([date]) => date <= today)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([label, data]) => ({
      label,
      sales: data.sales,
      expenses: data.expenses,
      savings: calculateSavingsFromTotals(data.sales, data.expenses),
    }));
}

export function getDefaultComparisonBranchCodes(): string[] {
  return ["kansanga", "salaama"];
}
