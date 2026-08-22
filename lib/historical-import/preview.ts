import { applyDuplicateDetection, countPreviewRows } from "@/lib/historical-import/duplicates";
import { validateImportRow } from "@/lib/historical-import/validation";
import type { BranchEntity } from "@/types/branch";
import type { Entry } from "@/types";
import type { ImportPreviewResult } from "@/types/historical-import";

export function buildImportPreview(
  rows: Record<string, unknown>[],
  existingEntries: Entry[],
  activeBranches: BranchEntity[],
  getBranchName: (code: string) => string,
  blankRowsSkipped = 0
): ImportPreviewResult {
  const validatedRows = rows.map((raw, index) => {
    const sourceRowNumber =
      typeof raw.sourceRowNumber === "number" ? raw.sourceRowNumber : index + 1;
    return validateImportRow(
      sourceRowNumber,
      raw,
      activeBranches,
      getBranchName
    );
  });

  const rowsWithDuplicates = applyDuplicateDetection(
    validatedRows,
    existingEntries
  );

  return {
    rows: rowsWithDuplicates,
    blankRowsSkipped,
    ...countPreviewRows(rowsWithDuplicates),
  };
}
