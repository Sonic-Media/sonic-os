import { parseAmount } from "@/lib/amounts";
import { HISTORICAL_IMPORT_STAFF_NAME } from "@/lib/historical-import/constants";
import { normalizeEntry } from "@/lib/storage";
import type { Entry, Expense, Staff } from "@/types";
import type { ImportPreviewRow } from "@/types/historical-import";

function resolveStaffId(staffName: string, staff: Staff[]): string {
  const match = staff.find(
    (member) => member.name.toLowerCase() === staffName.toLowerCase()
  );
  return match?.id ?? "";
}

function positiveExpenses(rawExpenses: unknown): Expense[] {
  if (!Array.isArray(rawExpenses)) return [];

  return rawExpenses
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const expense = item as Record<string, unknown>;
      const name = typeof expense.name === "string" ? expense.name.trim() : "";
      const amount = parseAmount(expense.amount);
      if (!name || amount <= 0) return null;
      return {
        id: crypto.randomUUID(),
        name,
        amount,
      };
    })
    .filter((expense): expense is Expense => expense !== null);
}

export function buildEntryFromImportRow(
  row: ImportPreviewRow,
  staff: Staff[]
): Entry {
  const expenses = positiveExpenses(row.raw.expenses);
  const normalized = normalizeEntry({
    ...row.raw,
    date: row.date ?? undefined,
    branch: row.branch ?? undefined,
    expenses,
    status: row.raw.status === "draft" ? "draft" : "completed",
  });

  const staffName =
    typeof row.raw.staffName === "string" && row.raw.staffName.trim()
      ? row.raw.staffName.trim()
      : HISTORICAL_IMPORT_STAFF_NAME;
  const staffId =
    typeof row.raw.staffId === "string" && row.raw.staffId.trim()
      ? row.raw.staffId.trim()
      : resolveStaffId(staffName, staff);

  const expenseTotal = normalized.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const statedBalanceRaw = row.raw.totalBalance;
  const statedBalance =
    statedBalanceRaw === undefined ||
    statedBalanceRaw === null ||
    statedBalanceRaw === ""
      ? null
      : parseAmount(String(statedBalanceRaw).trim().replace(/,/g, "").replace(/^\((\d+)\)$/, "-$1"));

  const savingsAllocation =
    row.raw.savingsAllocation !== undefined
      ? parseAmount(row.raw.savingsAllocation)
      : statedBalance !== null
        ? statedBalance
        : normalized.sales - expenseTotal;

  return {
    ...normalized,
    id: crypto.randomUUID(),
    staffId,
    staffName,
    savingsAllocation,
    status: row.raw.status === "draft" ? "draft" : "completed",
  };
}
