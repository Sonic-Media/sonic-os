import { parseAmount } from "@/lib/amounts";
import type { BranchEntity } from "@/types/branch";
import type { ImportPreviewRow } from "@/types/historical-import";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    const amount = parseAmount(expense.amount);

    if (!name) {
      errors.push(`Expense ${index + 1} requires a name.`);
    }

    if (amount <= 0) {
      errors.push(`Expense ${index + 1} requires an amount greater than zero.`);
    } else {
      total += amount;
    }
  });

  return { errors, total };
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

  const sales = parseAmount(raw.sales);
  if (raw.sales === undefined || raw.sales === null || raw.sales === "") {
    errors.push("Sales is required.");
  } else if (sales < 0) {
    errors.push("Sales cannot be negative.");
  }

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

  const branchName = branch ? getBranchName(branch) : null;

  return {
    rowNumber,
    status: errors.length > 0 ? "invalid" : "valid",
    errors,
    warnings,
    date,
    branch,
    branchName,
    sales: errors.length > 0 ? null : sales,
    expenseTotal: errors.length > 0 ? null : expenseValidation.total,
    raw,
  };
}
