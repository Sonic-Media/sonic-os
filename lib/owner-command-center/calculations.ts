import { computeBranchAnalytics } from "@/lib/branch/analytics";
import { getTodayISO } from "@/lib/dates";
import { computeSalesDashboardMetrics } from "@/lib/sales/calculations";
import { computeDashboardMetrics } from "@/lib/stock/calculations";
import type { BranchEntity } from "@/types/branch";
import type { Entry, Staff } from "@/types";
import type { ExpenseRecord } from "@/types/expenses-module";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type { StockMovement, StockProduct } from "@/types/stock";

export interface OwnerStaffWorkingToday {
  name: string;
  branch: string;
}

export interface OwnerBranchComparisonRow {
  branchCode: string;
  branchName: string;
  revenue: number;
  expenses: number;
  profit: number;
  inventoryValue: number;
}

export interface OwnerLowStockAlert {
  id: string;
  name: string;
  currentStock: number;
  minimumStockLevel: number;
  status: "low-stock" | "out-of-stock";
}

export interface OwnerCommandCenterMetrics {
  todayRevenue: number;
  todayExpenses: number;
  todayPurchases: number;
  todayProfit: number;
  inventoryValue: number;
  cashAvailable: number;
  topSellingProduct: string | null;
  lowStockAlerts: number;
  branchComparison: OwnerBranchComparisonRow[];
  staffWorkingToday: OwnerStaffWorkingToday[];
  pendingPurchases: Purchase[];
  lowStockProducts: OwnerLowStockAlert[];
}

function computeStaffWorkingToday(
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  entries: Entry[],
  staff: Staff[],
  today: string
): OwnerStaffWorkingToday[] {
  const staffLookup = new Map(staff.map((member) => [member.id, member]));
  const working = new Map<string, OwnerStaffWorkingToday>();

  function addStaff(staffId: string | undefined, staffName: string | undefined, branch: string) {
    const member = staffId ? staffLookup.get(staffId) : undefined;
    const name = member?.name ?? staffName?.trim();
    if (!name) return;

    const key = member?.id ?? name.toLowerCase();
    working.set(key, {
      name,
      branch: member?.branch ?? branch,
    });
  }

  for (const sale of sales) {
    if (sale.date !== today || sale.status !== "completed") continue;
    addStaff(sale.staffId, sale.staffName, sale.branch);
  }

  for (const purchase of purchases) {
    if (purchase.date !== today) continue;
    addStaff(purchase.staffId, purchase.staffName, purchase.branch);
  }

  for (const expense of expenses) {
    if (expense.date !== today) continue;
    addStaff(expense.staffId, expense.staffName, expense.branch);
  }

  for (const entry of entries) {
    if (entry.date !== today || entry.status !== "completed") continue;
    addStaff(entry.staffId, entry.staffName, entry.branch);
  }

  return Array.from(working.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function computeOwnerCommandCenter(
  branches: BranchEntity[],
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  entries: Entry[],
  products: StockProduct[],
  movements: StockMovement[],
  staff: Staff[],
  today = getTodayISO()
): OwnerCommandCenterMetrics {
  const branchSnapshots = branches.map((branch) =>
    computeBranchAnalytics(
      branch,
      sales,
      purchases,
      expenses,
      entries,
      products,
      movements,
      staff,
      today
    )
  );

  const stockMetrics = computeDashboardMetrics(products, movements, today);
  const salesMetrics = computeSalesDashboardMetrics(sales, today);

  const todayRevenue = branchSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.todayRevenue,
    0
  );
  const todayExpenses = branchSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.expenses,
    0
  );
  const todayPurchases = branchSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.purchases,
    0
  );
  const todayProfit = branchSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.todayProfit,
    0
  );
  const cashAvailable = branchSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.cashFlow,
    0
  );

  const lowStockProducts = products
    .filter(
      (product) =>
        product.status === "low-stock" || product.status === "out-of-stock"
    )
    .map((product) => ({
      id: product.id,
      name: product.name,
      currentStock: product.currentStock,
      minimumStockLevel: product.minimumStockLevel,
      status: product.status as "low-stock" | "out-of-stock",
    }))
    .sort((left, right) => left.currentStock - right.currentStock);

  return {
    todayRevenue,
    todayExpenses,
    todayPurchases,
    todayProfit,
    inventoryValue: stockMetrics.inventoryValue ?? 0,
    cashAvailable,
    topSellingProduct: salesMetrics.topSellingItem,
    lowStockAlerts:
      (stockMetrics.lowStock ?? 0) + (stockMetrics.outOfStock ?? 0),
    branchComparison: branchSnapshots.map((snapshot) => ({
      branchCode: snapshot.branchCode,
      branchName: snapshot.branchName,
      revenue: snapshot.todayRevenue,
      expenses: snapshot.expenses,
      profit: snapshot.todayProfit,
      inventoryValue: snapshot.inventoryValue,
    })),
    staffWorkingToday: computeStaffWorkingToday(
      sales,
      purchases,
      expenses,
      entries,
      staff,
      today
    ),
    pendingPurchases: purchases
      .filter((purchase) => purchase.date === today)
      .slice(0, 5),
    lowStockProducts,
  };
}
