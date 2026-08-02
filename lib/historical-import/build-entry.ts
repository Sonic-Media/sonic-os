import { parseAmount } from "@/lib/amounts";
import { normalizeEntry } from "@/lib/storage";
import type { Entry, Staff } from "@/types";
import type { ImportPreviewRow } from "@/types/historical-import";

function resolveStaffId(staffName: string, staff: Staff[]): string {
  const match = staff.find(
    (member) => member.name.toLowerCase() === staffName.toLowerCase()
  );
  return match?.id ?? "";
}

export function buildEntryFromImportRow(
  row: ImportPreviewRow,
  staff: Staff[]
): Entry {
  const normalized = normalizeEntry({
    ...row.raw,
    date: row.date ?? undefined,
    branch: row.branch ?? undefined,
    status: row.raw.status === "draft" ? "draft" : "completed",
  });

  const staffName =
    typeof row.raw.staffName === "string" ? row.raw.staffName.trim() : "";
  const staffId =
    typeof row.raw.staffId === "string" && row.raw.staffId.trim()
      ? row.raw.staffId.trim()
      : staffName
        ? resolveStaffId(staffName, staff)
        : normalized.staffId;

  const expenseTotal = normalized.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const savingsAllocation =
    row.raw.savingsAllocation !== undefined
      ? Math.max(0, parseAmount(row.raw.savingsAllocation))
      : Math.max(0, normalized.sales - expenseTotal);

  return {
    ...normalized,
    id: crypto.randomUUID(),
    staffId,
    staffName: staffName || normalized.staffName,
    savingsAllocation,
    status: row.raw.status === "draft" ? "draft" : "completed",
  };
}
