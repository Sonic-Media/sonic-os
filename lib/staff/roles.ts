import type { StaffModule, StaffRoleDefinition, StaffRoleId } from "@/types/staff-role";

export const DEFAULT_STAFF_ROLES: StaffRoleDefinition[] = [
  {
    id: "ceo",
    name: "CEO",
    description: "Full business visibility across all modules.",
    modules: [
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
    ],
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
    id: "salesperson",
    name: "Salesperson",
    description: "Handle sales and daily customer activity.",
    modules: ["sales", "operations"],
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
    id: "store-attendant",
    name: "Store Attendant",
    description: "Run daily branch operations.",
    modules: ["operations"],
    isDefault: true,
  },
  {
    id: "accountant",
    name: "Accountant",
    description: "Track expenses and financial reports.",
    modules: ["expenses", "reports"],
    isDefault: true,
  },
];

export const STAFF_ROLE_OPTIONS = DEFAULT_STAFF_ROLES.map((role) => ({
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

export function getStaffRoleDefinition(
  roleId: StaffRoleId
): StaffRoleDefinition | undefined {
  return DEFAULT_STAFF_ROLES.find((role) => role.id === roleId);
}

export function getStaffRoleName(roleId: StaffRoleId): string {
  return getStaffRoleDefinition(roleId)?.name ?? roleId;
}

export function isStaffRoleId(value: unknown): value is StaffRoleId {
  return DEFAULT_STAFF_ROLES.some((role) => role.id === value);
}

export function migrateLegacyAuthRole(value: unknown): StaffRoleId | "owner" {
  if (value === "owner") return "owner";
  if (isStaffRoleId(value)) return value;

  if (value === "staff") return "store-attendant";
  if (value === "manager") return "manager";
  if (value === "cashier") return "cashier";

  return "store-attendant";
}
