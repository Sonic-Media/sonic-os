import { parseAmount } from "@/lib/amounts";
import {
  DEFAULT_EXPENSE_TEMPLATES,
  EXPENSE_BREAKDOWN_ITEMS,
} from "@/lib/constants";
import type { ExpenseBreakdownKey, ExpenseTemplate } from "@/types";

const VALID_CATEGORIES = new Set<ExpenseBreakdownKey>(
  EXPENSE_BREAKDOWN_ITEMS.map((item) => item.key)
);

function normalizeCategory(value: unknown): ExpenseBreakdownKey {
  return VALID_CATEGORIES.has(value as ExpenseBreakdownKey)
    ? (value as ExpenseBreakdownKey)
    : "other";
}

function normalizeTemplate(value: unknown): ExpenseTemplate | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";

  if (!id || !name) return null;

  const defaultAmountRaw = raw.defaultAmount;
  const defaultAmount =
    defaultAmountRaw === undefined || defaultAmountRaw === null
      ? undefined
      : Math.max(0, parseAmount(defaultAmountRaw));

  return {
    id,
    name,
    category: normalizeCategory(raw.category),
    defaultAmount,
    active: raw.active !== false,
  };
}

export function normalizeExpenseTemplates(value: unknown): ExpenseTemplate[] {
  if (!Array.isArray(value)) {
    return DEFAULT_EXPENSE_TEMPLATES.map((template) => ({ ...template }));
  }

  const templates = value
    .map(normalizeTemplate)
    .filter((template): template is ExpenseTemplate => template !== null);

  return templates.length > 0
    ? sortExpenseTemplates(templates)
    : DEFAULT_EXPENSE_TEMPLATES.map((template) => ({ ...template }));
}

export function sortExpenseTemplates(
  templates: ExpenseTemplate[]
): ExpenseTemplate[] {
  return [...templates].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategoryLabel(category: ExpenseBreakdownKey): string {
  return (
    EXPENSE_BREAKDOWN_ITEMS.find((item) => item.key === category)?.label ??
    category
  );
}
