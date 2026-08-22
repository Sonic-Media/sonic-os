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
    id: "branch-manager",
    name: "Branch Manager",
    description: "Manage branch stock, purchasing, reports, and daily operations.",
    modules: [
      "home",
      "operations",
      "sales",
      "purchasing",
      "expenses",
      "stock",
      "reports",
      "staff",
    ],
    isDefault: true,
  },
  {
    id: "cashier",
    name: "Cashier",
    description: "Run the full daily workflow from Today's Operations.",
    modules: ["operations", "sales"],
    isDefault: true,
  },
];

export const LEGACY_ROLE_MIGRATIONS: Record<string, StaffRoleId> = {
  "sales-attendant": "cashier",
  salesperson: "cashier",
  "store-attendant": "cashier",
  ceo: "branch-manager",
  manager: "branch-manager",
  administrator: "branch-manager",
  admin: "branch-manager",
  accountant: "branch-manager",
  "inventory-officer": "branch-manager",
  technician: "branch-manager",
};

export const STAFF_ROLE_OPTIONS = DEFAULT_STAFF_ROLES.filter(
  (role) => role.isDefault
).map((role) => ({
  value: role.id,
  label: role.name,
}));

export const STAFF_MODULE_LABELS: Record<StaffModule, string> = {
  home: "Dashboard",
  operations: "Today's Operations",
  sales: "Accessory Sales",
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

export function migrateLegacyAuthRole(value: unknown): StaffRoleId {
  if (isStaffRoleId(value)) return value;

  if (typeof value === "string" && value in LEGACY_ROLE_MIGRATIONS) {
    return LEGACY_ROLE_MIGRATIONS[value];
  }

  if (value === "staff") return "cashier";

  return "cashier";
}
