export type SettingsSectionId =
  | "profile"
  | "business"
  | "branches"
  | "categories"
  | "notifications"
  | "data-backup"
  | "appearance"
  | "security";

export interface SettingsNavItem {
  id: SettingsSectionId;
  label: string;
  description: string;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Your account details and branch assignment",
  },
  {
    id: "business",
    label: "Business",
    description: "Business identity, staff, and expense templates",
  },
  {
    id: "branches",
    label: "Branches",
    description: "Branch locations and display names",
  },
  {
    id: "categories",
    label: "Categories",
    description: "Expense categories used across Sonic OS",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alert read and dismiss preferences",
  },
  {
    id: "data-backup",
    label: "Data & Backup",
    description: "Backups and data protection tools",
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and application version",
  },
  {
    id: "security",
    label: "Security",
    description: "Users, roles, audit, and session controls",
  },
];
