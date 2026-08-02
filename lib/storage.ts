import { LEGACY_EXPENSE_FIELDS, STORAGE_KEY } from "@/lib/constants";
import { parseAmount } from "@/lib/amounts";
import { formatEntryTime, getTodayISO } from "@/lib/dates";
import { parseBranch } from "@/lib/entry-helpers";
import { normalizeStaffActionRecord } from "@/lib/staff/session";
import type { Entry, Expense } from "@/types";

function migrateExpense(raw: unknown): Expense | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const amount = parseAmount(item.amount);

  if (!name || amount <= 0) return null;

  return {
    id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
    name,
    amount,
  };
}

function migrateLegacyExpenses(raw: Record<string, unknown>): Expense[] {
  if (Array.isArray(raw.expenses)) {
    return raw.expenses
      .map(migrateExpense)
      .filter((expense): expense is Expense => expense !== null);
  }

  const expenses: Expense[] = [];

  for (const { name, key } of LEGACY_EXPENSE_FIELDS) {
    const amount = parseAmount(raw[key]);
    if (amount > 0) {
      expenses.push({
        id: crypto.randomUUID(),
        name,
        amount,
      });
    }
  }

  const legacyStaff =
    parseAmount(raw.staffP) + parseAmount(raw.staffF) + parseAmount(raw.staffK);

  if (legacyStaff > 0) {
    expenses.push({
      id: crypto.randomUUID(),
      name: "Staff Payments",
      amount: legacyStaff,
    });
  }

  return expenses;
}

function migrateEntry(raw: Record<string, unknown>): Entry {
  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : new Date().toISOString();

  const createdDate = new Date(createdAt);
  const timestamp =
    typeof raw.timestamp === "number"
      ? raw.timestamp
      : Math.floor(createdDate.getTime() / 1000);

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    date: typeof raw.date === "string" ? raw.date : getTodayISO(),
    time:
      typeof raw.time === "string"
        ? raw.time
        : formatEntryTime(createdDate),
    timestamp,
    branch: parseBranch(
      typeof raw.branch === "string" ? raw.branch : null
    ),
    sales: parseAmount(raw.sales),
    expenses: migrateLegacyExpenses(raw),
    staffId: typeof raw.staffId === "string" ? raw.staffId : undefined,
    staffName: typeof raw.staffName === "string" ? raw.staffName : undefined,
    createdBy: normalizeStaffActionRecord(raw.createdBy),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    savingsAllocation:
      typeof raw.savingsAllocation === "number"
        ? Math.max(0, raw.savingsAllocation)
        : undefined,
    createdAt,
    status: raw.status === "draft" ? "draft" : "completed",
  };
}

export function normalizeEntry(raw: Record<string, unknown>): Entry {
  return migrateEntry(raw);
}

export function getEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      migrateEntry(item as Record<string, unknown>)
    );
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function upsertEntryInList(entries: Entry[], entry: Entry): Entry[] {
  const index = entries.findIndex((existing) => existing.id === entry.id);
  if (index >= 0) {
    return entries.map((existing) =>
      existing.id === entry.id ? entry : existing
    );
  }
  return [entry, ...entries];
}
