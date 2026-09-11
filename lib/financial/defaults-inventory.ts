/**
 * Static inventory of monetary defaults for Fix #21 verification.
 * These are documentation constants — not runtime authority.
 */
export const FINANCIAL_DEFAULTS_INVENTORY = [
  {
    location: "lib/constants.ts DEFAULT_APP_SETTINGS.defaultLunchAmount",
    value: "3000",
    purpose: "Bootstrap default lunch amount for new installations",
    classification: "C — Legitimate business configuration",
    canReachProductionTransaction:
      "Only when user saves daily operation with pre-filled lunch amount visible in form",
    action: "KEEP",
  },
  {
    location: "lib/constants.ts DEFAULT_EXPENSE_TEMPLATES common-lunch.defaultAmount",
    value: "3000 (from defaultLunchAmount)",
    purpose: "Seed lunch template default; synced to PostgreSQL on bootstrap",
    classification: "C — Legitimate business configuration",
    canReachProductionTransaction:
      "Pre-fills entry form; user must save; editable before persist",
    action: "KEEP",
  },
  {
    location: "lib/expense-templates.ts templateToExpense defaultAmount ?? 0",
    value: "0 when template has no defaultAmount",
    purpose: "UI seed for expense line items in daily operations form",
    classification: "B — Safe empty default state",
    canReachProductionTransaction:
      "NO — prepareExpensesForSave / server filterPersistableExpenses strips amount <= 0",
    action: "KEEP (documented)",
  },
  {
    location: "lib/expenses.ts prepareExpensesForSave",
    value: "filters amount > 0",
    purpose: "Client gate before persisting daily operation expenses",
    classification: "C — Derived validation gate",
    canReachProductionTransaction: "Prevents zero/placeholder amounts reaching DB from client",
    action: "KEEP",
  },
  {
    location: "lib/expenses-module/validation.ts amount <= 0",
    value: "rejected",
    purpose: "Expenses module server validation",
    classification: "C — Server validation",
    canReachProductionTransaction: "NO — server rejects",
    action: "KEEP",
  },
  {
    location: "lib/server/services/staff-payments-service.ts amount <= 0",
    value: "rejected",
    purpose: "Staff payment server validation",
    classification: "C — Server validation",
    canReachProductionTransaction: "NO — server rejects",
    action: "KEEP",
  },
  {
    location: "lib/sales/validation.ts unitPrice <= 0",
    value: "rejected",
    purpose: "Sales client validation",
    classification: "C — Validation",
    canReachProductionTransaction: "NO — must be explicit positive price",
    action: "KEEP",
  },
  {
    location: "lib/purchasing/validation.ts buyingPrice <= 0",
    value: "rejected",
    purpose: "Purchasing client validation",
    classification: "C — Validation",
    canReachProductionTransaction: "NO",
    action: "KEEP",
  },
  {
    location: "lib/day-closing/calculations.ts dailyWage ?? 0",
    value: "0 when staff has no dailyWage",
    purpose: "Close-day staff payout UI; uses staff.dailyWage from PostgreSQL",
    classification: "B — Safe empty default",
    canReachProductionTransaction:
      "selected: !paidToday && dailyWage > 0 — zero wage not auto-selected for payment",
    action: "KEEP",
  },
  {
    location: "components/dashboard/* amount: 0",
    value: "0",
    purpose: "Chart/aggregation accumulator initial value",
    classification: "A — Safe UI placeholder",
    canReachProductionTransaction: "NO — not persisted",
    action: "KEEP",
  },
  {
    location: "scripts/verify-bootstrap.ts dailyWage: 10000",
    value: "10000",
    purpose: "Test fixture for certification cashiers",
    classification: "E — Test/fixture data",
    canReachProductionTransaction: "NO — verification scripts only",
    action: "KEEP (documented)",
  },
  {
    location: "prisma/seed.ts DEFAULT_EXPENSE_TEMPLATES",
    value: "bootstrap template amounts",
    purpose: "Development seed only",
    classification: "F — Seed/development-only",
    canReachProductionTransaction: "Only via explicit db:seed (not production path)",
    action: "KEEP (documented)",
  },
] as const;
