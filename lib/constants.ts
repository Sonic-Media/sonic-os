import type {
  Branch,
  Expense,
  HistorySortOrder,
  ReportPeriod,
} from "@/types";

export const STORAGE_KEY = "sonic-os-entries";

export const BRANCHES: { id: Branch; name: string }[] = [
  { id: "salaama", name: "Salaama" },
  { id: "kansanga", name: "Kansanga" },
];

export const DEFAULT_EXPENSES: Expense[] = [
  { id: "common-lunch", name: "Lunch", amount: 3000 },
  { id: "common-rent", name: "Rent", amount: 0 },
  { id: "common-staff-payments", name: "Staff Payments", amount: 0 },
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

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
};

export const HISTORY_SORT_OPTIONS: { id: HistorySortOrder; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

export const STAFF_MEMBERS = [
  { id: "p", name: "Staff P", role: "Sales Associate" },
  { id: "f", name: "Staff F", role: "Sales Associate" },
  { id: "k", name: "Staff K", role: "Sales Associate" },
];

export const APP = {
  businessName: "Sonic",
  ownerName: "Kevin",
  version: "Sonic OS V1.2 Stable",
} as const;

export const GREETING_DEFAULT_NAME = APP.ownerName;

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
