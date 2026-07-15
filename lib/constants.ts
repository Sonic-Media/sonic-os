import type {
  AppSettings,
  Branch,
  DashboardPeriod,
  ExpenseBreakdownKey,
  HistorySortOrder,
  HistoryStatusFilter,
  ReportPeriod,
  Staff,
  ExpenseTemplate,
} from "@/types";

export const STORAGE_KEY = "sonic-os-entries";
export const SETTINGS_STORAGE_KEY = "sonic-os-settings";
export const STAFF_STORAGE_KEY = "sonic-os-staff";
export const EXPENSE_TEMPLATES_STORAGE_KEY = "sonic-os-expense-templates";
export const NOTIFICATIONS_STORAGE_KEY = "sonic-os-notifications";
export const ACTIVITY_LOG_STORAGE_KEY = "sonic-os-activity-log";

export const BRANCH_IDS: Branch[] = ["salaama", "kansanga"];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: "Sonic",
  ownerName: "Kevin",
  branchNames: {
    salaama: "Salaama",
    kansanga: "Kansanga",
  },
  defaultLunchAmount: 3000,
};

export const EXPENSE_BREAKDOWN_ITEMS: {
  key: ExpenseBreakdownKey;
  label: string;
}[] = [
  { key: "rent", label: "Rent" },
  { key: "staff-payments", label: "Staff" },
  { key: "lunch", label: "Lunch" },
  { key: "electricity", label: "Electricity" },
  { key: "internet", label: "Internet" },
  { key: "transport", label: "Transport" },
  { key: "repairs", label: "Repairs" },
  { key: "inventory", label: "Inventory" },
  { key: "other", label: "Other" },
];

export const EXPENSE_TEMPLATE_CATEGORIES: {
  value: ExpenseBreakdownKey;
  label: string;
}[] = EXPENSE_BREAKDOWN_ITEMS.map(({ key, label }) => ({
  value: key,
  label,
}));

export const DEFAULT_EXPENSE_TEMPLATES: ExpenseTemplate[] = [
  {
    id: "common-rent",
    name: "Rent",
    category: "rent",
    active: true,
  },
  {
    id: "common-staff-payments",
    name: "Staff",
    category: "staff-payments",
    active: true,
  },
  {
    id: "common-lunch",
    name: "Lunch",
    category: "lunch",
    defaultAmount: DEFAULT_APP_SETTINGS.defaultLunchAmount,
    active: true,
  },
  {
    id: "common-electricity",
    name: "Electricity",
    category: "electricity",
    active: true,
  },
  {
    id: "common-internet",
    name: "Internet",
    category: "internet",
    active: true,
  },
  {
    id: "common-transport",
    name: "Transport",
    category: "transport",
    active: true,
  },
  {
    id: "common-repairs",
    name: "Repairs",
    category: "repairs",
    active: true,
  },
  {
    id: "common-inventory",
    name: "Inventory",
    category: "inventory",
    active: true,
  },
];

export const EXPENSE_NAME_SUGGESTIONS = [
  "Generator Repair",
  "Plastic Bags",
  "Fuel Advance",
  "Internet Bundle",
  "Printer Ink",
  "Parking",
  "Tea",
  "Coffee",
  "Electricity",
  "Power Token",
];

export const LEGACY_EXPENSE_FIELDS = [
  { name: "Lunch", key: "lunch" },
  { name: "Rent", key: "rent" },
  { name: "Airtime", key: "airtime" },
  { name: "Fuel", key: "fuel" },
  { name: "Transport", key: "transport" },
  { name: "Other", key: "other" },
] as const;

export const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export const DASHBOARD_PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
];

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
};

export const HISTORY_STATUS_OPTIONS: {
  id: HistoryStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "draft", label: "Draft" },
];

export const HISTORY_SORT_OPTIONS: { id: HistorySortOrder; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

export const DEFAULT_STAFF: Staff[] = [
  { id: "staff-p", name: "Staff P", branch: "salaama", active: true },
  { id: "staff-f", name: "Staff F", branch: "salaama", active: true },
  { id: "staff-k", name: "Staff K", branch: "kansanga", active: true },
];

export const APP_VERSION = "Sonic OS V2.0";

export const AUTOSAVE_DEBOUNCE_MS = 400;

export const DATE_FORMATS = {
  display: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  entryDisplay: {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  chart: { month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit", hour12: true },
  currency: "en-UG",
} as const;
