import { applyDuplicateDetection, countPreviewRows } from "@/lib/historical-import/duplicates";
import { validateImportRow } from "@/lib/historical-import/validation";
import type { BranchEntity } from "@/types/branch";
import type { Entry } from "@/types";
import type { ImportPreviewResult } from "@/types/historical-import";

export function buildImportPreview(
  rows: Record<string, unknown>[],
  existingEntries: Entry[],
  activeBranches: BranchEntity[],
  getBranchName: (code: string) => string
): ImportPreviewResult {
  const validatedRows = rows.map((raw, index) =>
    validateImportRow(index + 1, raw, activeBranches, getBranchName)
  );

  const rowsWithDuplicates = applyDuplicateDetection(
    validatedRows,
    existingEntries
  );

  return {
    rows: rowsWithDuplicates,
    ...countPreviewRows(rowsWithDuplicates),
  };
}
