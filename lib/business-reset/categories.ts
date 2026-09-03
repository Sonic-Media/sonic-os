export type BusinessResetCategory =
  | "products"
  | "stockMovements"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "expenses"
  | "dailyOperations"
  | "staffPayments"
  | "activityLogs";

export const BUSINESS_RESET_CATEGORIES: BusinessResetCategory[] = [
  "products",
  "stockMovements",
  "purchases",
  "sales",
  "customers",
  "suppliers",
  "expenses",
  "dailyOperations",
  "staffPayments",
  "activityLogs",
];

export const BUSINESS_RESET_CATEGORY_LABELS: Record<
  BusinessResetCategory,
  string
> = {
  products: "Products",
  stockMovements: "Stock Movements",
  purchases: "Purchases",
  sales: "Sales",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
  dailyOperations: "Daily Operations",
  staffPayments: "Staff Payments",
  activityLogs: "Activity Logs",
};

const CATEGORY_DEPENDENCIES: Partial<
  Record<BusinessResetCategory, BusinessResetCategory[]>
> = {
  products: ["stockMovements", "sales", "purchases"],
  suppliers: ["purchases"],
};

export function expandBusinessResetSelection(
  categories: BusinessResetCategory[]
): BusinessResetCategory[] {
  const expanded = new Set<BusinessResetCategory>(categories);

  let changed = true;
  while (changed) {
    changed = false;
    for (const category of [...expanded]) {
      for (const dependency of CATEGORY_DEPENDENCIES[category] ?? []) {
        if (!expanded.has(dependency)) {
          expanded.add(dependency);
          changed = true;
        }
      }
    }
  }

  return BUSINESS_RESET_CATEGORIES.filter((category) => expanded.has(category));
}

export const BUSINESS_RESET_EXECUTION_ORDER: BusinessResetCategory[] = [
  "activityLogs",
  "staffPayments",
  "expenses",
  "sales",
  "purchases",
  "dailyOperations",
  "stockMovements",
  "products",
  "customers",
  "suppliers",
];
