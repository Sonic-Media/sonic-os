import { parseImportFileContent } from "@/lib/historical-import/parse";
import { parseXlsxLedger } from "@/lib/historical-import/parse-xlsx";
import type { Branch } from "@/types";
import type { ImportParseResult } from "@/types/historical-import";

function isXlsxFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".xlsx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export async function parseImportFile(
  file: File,
  branch: Branch
): Promise<ImportParseResult> {
  if (isXlsxFile(file)) {
    const buffer = await file.arrayBuffer();
    return parseXlsxLedger(buffer, branch);
  }

  const content = await file.text();
  return parseImportFileContent(content);
}
