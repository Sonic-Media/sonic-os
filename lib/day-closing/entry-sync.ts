import { formToEntry } from "@/lib/entry-helpers";
import { createDefaultExpenses } from "@/lib/expenses";
import type { Branch, Entry, Expense } from "@/types";
import type { DayClosingSummary } from "@/types/day-closing";
import type { StaffActionRecord } from "@/types/staff-session";

function buildClosingExpenseLines(summary: DayClosingSummary): Expense[] {
  const lines: Expense[] = [];

  if (summary.expenses > 0) {
    lines.push({
      id: crypto.randomUUID(),
      name: "Operating Expenses",
      amount: summary.expenses,
    });
  }

  if (summary.staffPayments > 0) {
    lines.push({
      id: crypto.randomUUID(),
      name: "Staff Payments",
      amount: summary.staffPayments,
    });
  }

  if (summary.inventoryInvestment > 0) {
    lines.push({
      id: crypto.randomUUID(),
      name: "Inventory Purchases",
      amount: summary.inventoryInvestment,
    });
  }

  return lines;
}

export function buildClosedDayDailyOperationEntry(options: {
  branch: Branch;
  date: string;
  summary: DayClosingSummary;
  closingNotes?: string;
  existing?: Entry;
  createdBy?: StaffActionRecord;
}): Entry {
  const expenseLines = buildClosingExpenseLines(options.summary);

  return formToEntry(
    {
      date: options.date,
      branch: options.branch,
      sales: String(options.summary.sales),
      expenses:
        expenseLines.length > 0 ? expenseLines : createDefaultExpenses([]),
      staffId: "",
      notes:
        options.closingNotes?.trim() ||
        options.existing?.notes ||
        "Closed via Close Day",
      savingsAllocation: String(options.summary.operatingFund),
    },
    {
      id: options.existing?.id,
      status: "completed",
      existing: options.existing,
      createdBy: options.createdBy,
    }
  );
}
