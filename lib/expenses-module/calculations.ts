import { getTodayISO } from "@/lib/dates";
import { calculateExpenses } from "@/lib/amounts";
import { getEffectiveExpenseAmount } from "@/lib/staff-payments/calculations";
import type { Entry } from "@/types";
import type { Purchase } from "@/types/purchasing";
import type { Sale } from "@/types/sales";
import type {
  CashFlowDateRange,
  CashFlowPeriod,
  CashFlowSummary,
  ExpenseRecord,
  ExpensesDashboardMetrics,
  MonthlySummary,
} from "@/types/expenses-module";

function getWeekStartISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthStartISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function getYearStartISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

export function getDateRangeForPeriod(
  period: CashFlowPeriod,
  customRange?: CashFlowDateRange
): CashFlowDateRange {
  const today = getTodayISO();

  switch (period) {
    case "today":
      return { start: today, end: today };
    case "week":
      return { start: getWeekStartISO(), end: today };
    case "month":
      return { start: getMonthStartISO(), end: today };
    case "year":
      return { start: getYearStartISO(), end: today };
    case "custom":
      return customRange ?? { start: today, end: today };
  }
}

function isDateInRange(date: string, range: CashFlowDateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function computeExpensesDashboardMetrics(
  expenses: ExpenseRecord[],
  todayISO: string = getTodayISO()
): ExpensesDashboardMetrics {
  const monthStart = getMonthStartISO();
  const todayExpenses = expenses.filter((expense) => expense.date === todayISO);
  const monthExpenseRecords = expenses.filter(
    (expense) => expense.date >= monthStart
  );

  if (expenses.length === 0) {
    return {
      todaysExpenses: null,
      weekExpenses: null,
      monthExpenses: null,
      highestExpenseCategory: null,
      averageDailyExpense: null,
      topCategories: [],
    };
  }

  const categoryTotals = new Map<string, number>();
  for (const expense of monthExpenseRecords) {
    categoryTotals.set(
      expense.categoryName,
      (categoryTotals.get(expense.categoryName) ?? 0) +
        getEffectiveExpenseAmount(expense)
    );
  }

  let highestExpenseCategory: string | null = null;
  let highestAmount = 0;
  for (const [name, amount] of categoryTotals) {
    if (amount > highestAmount) {
      highestAmount = amount;
      highestExpenseCategory = name;
    }
  }

  const uniqueDays = new Set(monthExpenseRecords.map((expense) => expense.date));
  const monthTotal = monthExpenseRecords.reduce(
    (sum, expense) => sum + getEffectiveExpenseAmount(expense),
    0
  );

  const weekStart = getWeekStartISO();
  const weekExpenseRecords = expenses.filter(
    (expense) => expense.date >= weekStart
  );
  const weekTotal = weekExpenseRecords.reduce(
    (sum, expense) => sum + getEffectiveExpenseAmount(expense),
    0
  );
  const topCategories = computeCategoryExpenseTotals(expenses, {
    start: monthStart,
    end: todayISO,
  }).slice(0, 3);

  return {
    todaysExpenses: todayExpenses.reduce(
      (sum, expense) => sum + getEffectiveExpenseAmount(expense),
      0
    ),
    weekExpenses: weekTotal,
    monthExpenses: monthTotal,
    highestExpenseCategory,
    averageDailyExpense:
      uniqueDays.size > 0 ? monthTotal / uniqueDays.size : null,
    topCategories,
  };
}

export function computeCashFlowSummary(
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  range: CashFlowDateRange,
  legacyEntries: Entry[] = []
): CashFlowSummary {
  const completedSales = sales.filter(
    (sale) =>
      sale.status === "completed" && isDateInRange(sale.date, range)
  );
  const periodPurchases = purchases.filter((purchase) =>
    isDateInRange(purchase.date, range)
  );
  const operatingExpenses = expenses.filter((expense) =>
    isDateInRange(expense.date, range)
  );
  const legacyExpenseTotal = legacyEntries
    .filter(
      (entry) =>
        entry.status === "completed" && isDateInRange(entry.date, range)
    )
    .reduce((sum, entry) => sum + calculateExpenses(entry), 0);

  const salesIncome = completedSales.reduce((sum, sale) => sum + sale.total, 0);
  const purchaseCost = periodPurchases.reduce(
    (sum, purchase) => sum + purchase.totalCost,
    0
  );
  const operatingExpenseTotal =
    operatingExpenses.reduce(
      (sum, expense) => sum + getEffectiveExpenseAmount(expense),
      0
    ) + legacyExpenseTotal;
  const salesProfit = completedSales.reduce(
    (sum, sale) => sum + sale.profit,
    0
  );

  return {
    salesIncome,
    purchaseCost,
    operatingExpenses: operatingExpenseTotal,
    netCashFlow: salesIncome - purchaseCost - operatingExpenseTotal,
    netProfit: salesProfit - operatingExpenseTotal,
  };
}

export function computeMonthlySummary(
  sales: Sale[],
  purchases: Purchase[],
  expenses: ExpenseRecord[],
  range: CashFlowDateRange,
  legacyEntries: Entry[] = []
): MonthlySummary {
  const summary = computeCashFlowSummary(
    sales,
    purchases,
    expenses,
    range,
    legacyEntries
  );

  return {
    income: summary.salesIncome,
    expenses: summary.operatingExpenses,
    purchases: summary.purchaseCost,
    profit: summary.netProfit,
  };
}

export function computeBranchExpenseTotals(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): { branch: string; total: number }[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!isDateInRange(expense.date, range)) continue;
    totals.set(expense.branch, (totals.get(expense.branch) ?? 0) + getEffectiveExpenseAmount(expense));
  }

  return Array.from(totals.entries())
    .map(([branch, total]) => ({ branch, total }))
    .sort((left, right) => right.total - left.total);
}

export function computeCategoryExpenseTotals(
  expenses: ExpenseRecord[],
  range: CashFlowDateRange
): { category: string; total: number }[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!isDateInRange(expense.date, range)) continue;
    totals.set(
      expense.categoryName,
      (totals.get(expense.categoryName) ?? 0) + getEffectiveExpenseAmount(expense)
    );
  }

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((left, right) => right.total - left.total);
}
