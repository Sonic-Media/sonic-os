import { parseAmount } from "@/lib/amounts";
import type { BranchEntity } from "@/types/branch";
import type { ImportPreviewRow } from "@/types/historical-import";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function isValidImportDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;

  const [year, month, day] = value.split("-").map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

export function parseLedgerDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isValidImportDate(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidImportDate(iso) ? iso : null;
}

function normalizeNumericInput(value: string): string {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "—" || trimmed === "–") {
    return "0";
  }

  const accountingNegative = trimmed.match(/^\((\d+)\)$/);
  if (accountingNegative) {
    return `-${accountingNegative[1]}`;
  }

  return trimmed;
}

function parseNumericField(
  label: string,
  value: unknown,
  options: { required?: boolean; allowNegative?: boolean } = {}
): { amount: number | null; errors: string[] } {
  const { required = false, allowNegative = false } = options;
  const errors: string[] = [];

  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${label} is required.`);
      return { amount: null, errors };
    }
    return { amount: 0, errors };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${label} is not a valid number.`);
      return { amount: null, errors };
    }
    if (!Number.isInteger(value)) {
      errors.push(`${label} must be a whole number.`);
      return { amount: null, errors };
    }
    if (value < 0 && !allowNegative) {
      errors.push(`${label} cannot be negative.`);
      return { amount: null, errors };
    }
    return { amount: value, errors };
  }

  const normalized = normalizeNumericInput(String(value));
  if (normalized === "0" && String(value).trim() !== "0") {
    if (required) {
      errors.push(`${label} is required.`);
      return { amount: null, errors };
    }
    return { amount: 0, errors };
  }

  if (!/^-?\d+$/.test(normalized)) {
    errors.push(`${label} must be a whole number.`);
    return { amount: null, errors };
  }

  const amount = Number(normalized);
  if (amount < 0 && !allowNegative) {
    errors.push(`${label} cannot be negative.`);
    return { amount: null, errors };
  }

  return { amount, errors };
}

function validateExpenses(raw: unknown): { errors: string[]; total: number } {
  const errors: string[] = [];
  let total = 0;

  if (raw === undefined) {
    return { errors, total };
  }

  if (!Array.isArray(raw)) {
    errors.push("Expenses must be an array.");
    return { errors, total };
  }

  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`Expense ${index + 1} is not a valid object.`);
      return;
    }

    const expense = item as Record<string, unknown>;
    const name = typeof expense.name === "string" ? expense.name.trim() : "";
    const parsed = parseNumericField(`Expense ${index + 1} amount`, expense.amount);

    if (!name) {
      errors.push(`Expense ${index + 1} requires a name.`);
    }

    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
      return;
    }

    const amount = parsed.amount ?? 0;
    if (amount > 0) {
      total += amount;
    } else if (amount < 0) {
      errors.push(`Expense ${index + 1} requires an amount greater than zero.`);
    }
  });

  return { errors, total };
}

function validateLedgerTotals(
  sales: number,
  expenseTotal: number,
  raw: Record<string, unknown>
): string[] {
  const warnings: string[] = [];

  const statedExpenses = parseNumericField(
    "Total Exp (UGX)",
    raw.totalExpenses
  );
  const statedBalance = parseNumericField("Total Bal (UGX)", raw.totalBalance, {
    allowNegative: true,
  });

  if (statedExpenses.errors.length > 0) {
    warnings.push(...statedExpenses.errors);
  }

  if (statedBalance.errors.length > 0) {
    warnings.push(...statedBalance.errors);
  }

  if (
    statedExpenses.amount !== null &&
    statedExpenses.errors.length === 0 &&
    expenseTotal !== statedExpenses.amount
  ) {
    warnings.push(
      `Expense items total ${expenseTotal.toLocaleString("en-UG")} UGX but Total Exp is ${statedExpenses.amount.toLocaleString("en-UG")} UGX.`
    );
  }

  if (
    statedBalance.amount !== null &&
    statedExpenses.amount !== null &&
    statedExpenses.errors.length === 0 &&
    statedBalance.errors.length === 0 &&
    sales - statedExpenses.amount !== statedBalance.amount
  ) {
    warnings.push(
      `Total Bal ${statedBalance.amount.toLocaleString("en-UG")} UGX does not equal sales minus Total Exp (${(sales - statedExpenses.amount).toLocaleString("en-UG")} UGX).`
    );
  }

  return warnings;
}

export function validateImportRow(
  rowNumber: number,
  raw: Record<string, unknown>,
  activeBranches: BranchEntity[],
  getBranchName: (code: string) => string
): ImportPreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const date =
    typeof raw.date === "string" && raw.date.trim() ? raw.date.trim() : null;
  const branch =
    typeof raw.branch === "string" && raw.branch.trim()
      ? raw.branch.trim()
      : null;

  if (!date) {
    errors.push("Date is required.");
  } else if (!isValidImportDate(date)) {
    errors.push("Date must use YYYY-MM-DD format.");
  }

  if (!branch) {
    errors.push("Branch is required.");
  } else {
    const branchEntity = activeBranches.find((item) => item.code === branch);
    if (!branchEntity) {
      errors.push(`Branch "${branch}" is not an active branch.`);
    }
  }

  const salesResult = parseNumericField("Total Sales (UGX)", raw.sales, {
    required: true,
  });
  errors.push(...salesResult.errors);

  const expenseValidation = validateExpenses(raw.expenses);
  errors.push(...expenseValidation.errors);

  if (
    raw.status !== undefined &&
    raw.status !== "completed" &&
    raw.status !== "draft"
  ) {
    errors.push('Status must be "completed" or "draft" when provided.');
  }

  if (
    raw.savingsAllocation !== undefined &&
    parseAmount(raw.savingsAllocation) < 0
  ) {
    errors.push("Savings allocation cannot be negative.");
  }

  const sales = salesResult.amount ?? 0;
  const statedExpenses = parseNumericField(
    "Total Exp (UGX)",
    raw.totalExpenses
  );
  const statedBalance = parseNumericField("Total Bal (UGX)", raw.totalBalance, {
    allowNegative: true,
  });

  if (errors.length === 0) {
    warnings.push(...validateLedgerTotals(sales, expenseValidation.total, raw));
  }

  const branchName = branch ? getBranchName(branch) : null;
  const hasBlockingErrors = errors.length > 0;

  return {
    rowNumber,
    status: hasBlockingErrors
      ? "invalid"
      : warnings.length > 0
        ? "inconsistent"
        : "valid",
    errors,
    warnings,
    date,
    branch,
    branchName,
    sales: hasBlockingErrors ? null : sales,
    expenseTotal: hasBlockingErrors ? null : expenseValidation.total,
    statedExpenseTotal:
      hasBlockingErrors || statedExpenses.errors.length > 0
        ? null
        : statedExpenses.amount,
    statedBalance:
      hasBlockingErrors || statedBalance.errors.length > 0
        ? null
        : statedBalance.amount,
    raw,
  };
}
