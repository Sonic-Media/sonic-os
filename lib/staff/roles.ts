import type { StaffModule, StaffRoleDefinition, StaffRoleId } from "@/types/staff-role";

const ALL_MODULES: StaffModule[] = [
  "home",
  "operations",
  "sales",
  "purchasing",
  "expenses",
  "stock",
  "branches",
  "reports",
  "history",
  "staff",
  "settings",
];

export const DEFAULT_STAFF_ROLES: StaffRoleDefinition[] = [
  {
    id: "ceo",
    name: "CEO",
    description: "Full business visibility across all modules.",
    modules: ALL_MODULES,
    isDefault: true,
  },
  {
    id: "branch-manager",
    name: "Branch Manager",
    description: "Manage branch sales, stock, and staff.",
    modules: ["sales", "purchasing", "expenses", "stock", "staff", "reports"],
    isDefault: true,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manage sales, purchasing, expenses, and stock.",
    modules: ["sales", "purchasing", "expenses", "stock"],
    isDefault: true,
  },
  {
    id: "cashier",
    name: "Cashier",
    description: "Process sales at the counter.",
    modules: ["sales"],
    isDefault: true,
  },
  {
    id: "sales-attendant",
    name: "Sales Attendant",
    description: "Handle sales and daily customer activity.",
    modules: ["sales", "operations"],
    isDefault: true,
  },
  {
    id: "inventory-officer",
    name: "Inventory Officer",
    description: "Manage stock levels and purchasing.",
    modules: ["stock", "purchasing"],
    isDefault: true,
  },
  {
    id: "technician",
    name: "Technician",
    description: "Manage stock and operational repairs.",
    modules: ["stock", "operations"],
    isDefault: true,
  },
  {
    id: "accountant",
    name: "Accountant",
    description: "Track expenses and financial reports.",
    modules: ["expenses", "reports"],
    isDefault: true,
  },
  {
    id: "administrator",
    name: "Administrator",
    description: "Configure users, branches, and settings.",
    modules: ["settings", "staff", "branches", "reports"],
    isDefault: true,
  },
  {
    id: "salesperson",
    name: "Sales Attendant",
    description: "Legacy sales role.",
    modules: ["sales", "operations"],
    isDefault: false,
  },
  {
    id: "store-attendant",
    name: "Store Attendant",
    description: "Legacy operations role.",
    modules: ["operations"],
    isDefault: false,
  },
];

export const STAFF_ROLE_OPTIONS = DEFAULT_STAFF_ROLES.filter(
  (role) => role.isDefault
).map((role) => ({
  value: role.id,
  label: role.name,
}));

export const STAFF_MODULE_LABELS: Record<StaffModule, string> = {
  home: "Home",
  operations: "Daily Operations",
  sales: "Sales",
  purchasing: "Purchasing",
  expenses: "Expenses",
  stock: "Stock",
  branches: "Branches",
  reports: "Reports",
  history: "History",
  staff: "Staff",
  settings: "Settings",
};

const STAFF_ROLE_IDS = new Set<StaffRoleId>(
  DEFAULT_STAFF_ROLES.map((role) => role.id)
);

export function getStaffRoleDefinition(
  roleId: StaffRoleId
): StaffRoleDefinition | undefined {
  return DEFAULT_STAFF_ROLES.find((role) => role.id === roleId);
}

export function getStaffRoleName(roleId: StaffRoleId): string {
  return getStaffRoleDefinition(roleId)?.name ?? roleId;
}

export function isStaffRoleId(value: unknown): value is StaffRoleId {
  return typeof value === "string" && STAFF_ROLE_IDS.has(value as StaffRoleId);
}

export function migrateLegacyAuthRole(value: unknown): StaffRoleId | "owner" {
  if (value === "owner") return "owner";
  if (isStaffRoleId(value)) return value;

  if (value === "staff") return "store-attendant";
  if (value === "manager") return "manager";
  if (value === "cashier") return "cashier";

  return "store-attendant";
}
