import type { StaffModule } from "@/types/staff-role";

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

export const DEFAULT_OWNER_USERNAME = "owner";
export const DEFAULT_OWNER_DISPLAY_NAME = "Owner";

export const PRODUCTION_ROLES = [
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
    ] as StaffModule[],
    isDefault: true,
  },
  {
    id: "cashier",
    name: "Cashier",
    description: "Run daily shop operations, accessory sales, and expenses.",
    modules: ["operations", "sales", "expenses"] as StaffModule[],
    isDefault: true,
  },
  {
    id: "owner",
    name: "Owner",
    description: "Full system ownership and administration.",
    modules: ALL_MODULES,
    isDefault: true,
  },
] as const;

export const OWNER_STAFF_ROLE_SLUG = "branch-manager";

export function getRequiredRoleSlugs(): string[] {
  return PRODUCTION_ROLES.map((role) => role.id);
}
