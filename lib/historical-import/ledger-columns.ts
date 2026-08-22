export const LEDGER_HEADERS = {
  date: ["date"],
  day: ["day"],
  sales: ["total sales (ugx)", "total sales", "sales"],
  lunchFood: ["lunch/food", "lunch", "food"],
  home: ["home"],
  rent: ["rent"],
  transport: ["transport"],
  otherLabel: ["other (label)", "other label"],
  otherAmount: ["other (ugx)", "other"],
  totalExpenses: ["total exp (ugx)", "total exp", "total expenses"],
  totalBalance: ["total bal (ugx)", "total bal", "balance"],
  notes: ["note", "notes"],
} as const;

export const LEDGER_SUMMARY_MARKERS = ["totals", "total", "summary"];

export function normalizeLedgerHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
