import type { ExpenseCategory, ExpensePaymentMethod } from "@/types/expenses-module";
import type { StaffPaymentType } from "@/types/staff-payment";

export const STAFF_PAYMENT_CATEGORY_ID = "staff-payment";
export const STAFF_PAYMENT_CATEGORY_NAME = "Staff";

export const EXPENSES_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/expenses", label: "Dashboard", exact: true },
  { href: "/expenses/history", label: "History" },
  { href: "/expenses/cash-flow", label: "Cash Flow" },
  { href: "/expenses/reports", label: "Reports" },
  { href: "/settings/expense-settings", label: "Settings" },
];

export const DEFAULT_EXPENSE_CATEGORIES: { id: string; name: string }[] = [
  { id: "rent", name: "Rent" },
  { id: "lunch", name: "Lunch" },
  { id: "transport", name: "Transport" },
  { id: "fuel", name: "Fuel" },
  { id: "electricity", name: "Electricity" },
  { id: "water", name: "Water" },
  { id: "internet", name: "Internet" },
  { id: "mechanic", name: "Mechanic" },
  { id: "maintenance", name: "Maintenance" },
  { id: "cleaning", name: "Cleaning" },
  { id: "packaging", name: "Packaging" },
  { id: "printing", name: "Printing" },
  { id: "taxes", name: "Taxes" },
  { id: "bank-charges", name: "Bank Charges" },
  { id: "equipment-repair", name: "Equipment Repair" },
  { id: "software", name: "Software" },
  { id: "marketing", name: "Marketing" },
  { id: "miscellaneous", name: "Miscellaneous" },
];

export const STAFF_PAYMENT_TYPES: {
  id: StaffPaymentType;
  label: string;
}[] = [
  { id: "daily-wage", label: "Daily Wage" },
  { id: "weekly-wage", label: "Weekly Wage" },
  { id: "salary", label: "Monthly Salary" },
  { id: "bonus", label: "Bonus" },
  { id: "advance", label: "Advance" },
  { id: "deduction", label: "Deduction" },
];

export function getStaffPaymentTypeLabel(type: StaffPaymentType): string {
  return STAFF_PAYMENT_TYPES.find((item) => item.id === type)?.label ?? type;
}

export function isStaffPaymentCategory(categoryId: string): boolean {
  return categoryId === STAFF_PAYMENT_CATEGORY_ID;
}

export function filterSelectableExpenseCategories(
  categories: ExpenseCategory[]
): ExpenseCategory[] {
  return categories.filter(
    (category) => !isStaffPaymentCategory(category.id)
  );
}

export const EXPENSE_PAYMENT_METHODS: {
  id: ExpensePaymentMethod;
  label: string;
}[] = [
  { id: "cash", label: "Cash" },
  { id: "mobile-money", label: "Mobile Money" },
  { id: "card", label: "Card" },
  { id: "bank-transfer", label: "Bank Transfer" },
  { id: "other", label: "Other" },
];

export const EXPENSE_PAYMENT_FILTER_OPTIONS: {
  id: ExpensePaymentMethod | "all";
  label: string;
}[] = [{ id: "all", label: "All" }, ...EXPENSE_PAYMENT_METHODS];

export const EXPENSE_DATE_FILTER_OPTIONS: {
  id: "all" | "today" | "week" | "month";
  label: string;
}[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export const CASH_FLOW_PERIOD_OPTIONS: {
  id: "today" | "week" | "month" | "year" | "custom";
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
];

export function getExpensePaymentMethodLabel(
  method: ExpensePaymentMethod
): string {
  return (
    EXPENSE_PAYMENT_METHODS.find((item) => item.id === method)?.label ?? method
  );
}
