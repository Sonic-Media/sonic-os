import { findCompletedEntryForBranchDate } from "@/lib/entry-helpers";
import type { Entry } from "@/types";
import type { ImportPreviewRow } from "@/types/historical-import";

function completedBranchDateKey(branch: string, date: string): string {
  return `${branch}::${date}`;
}

export function applyDuplicateDetection(
  rows: ImportPreviewRow[],
  existingEntries: Entry[]
): ImportPreviewRow[] {
  const seenCompletedKeys = new Map<string, number>();

  return rows.map((row) => {
    if (row.status === "invalid" || !row.branch || !row.date) {
      return row;
    }

    const key = completedBranchDateKey(row.branch, row.date);
    const importStatus =
      row.raw.status === "draft" ? "draft" : ("completed" as const);

    if (importStatus === "draft") {
      return row;
    }

    const fileDuplicateRow = seenCompletedKeys.get(key);
    if (fileDuplicateRow !== undefined) {
      return {
        ...row,
        status: "duplicate_file",
        warnings: [
          ...row.warnings,
          `Duplicate of row ${fileDuplicateRow} in this file.`,
        ],
      };
    }

    seenCompletedKeys.set(key, row.rowNumber);

    const existing = findCompletedEntryForBranchDate(
      existingEntries,
      row.branch,
      row.date
    );

    if (existing) {
      return {
        ...row,
        status: "duplicate_existing",
        warnings: [
          ...row.warnings,
          `A completed daily record already exists for ${row.branchName ?? row.branch} on ${row.date}.`,
        ],
      };
    }

    return row;
  });
}

export function countPreviewRows(rows: ImportPreviewRow[]) {
  const validCount = rows.filter((row) => row.status === "valid").length;
  const duplicateCount = rows.filter(
    (row) => row.status === "duplicate_existing" || row.status === "duplicate_file"
  ).length;
  const invalidCount = rows.filter((row) => row.status === "invalid").length;

  return {
    validCount,
    duplicateCount,
    invalidCount,
    totalCount: rows.length,
  };
}
