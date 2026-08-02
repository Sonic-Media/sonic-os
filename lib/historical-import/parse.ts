import type { ImportParseResult } from "@/types/historical-import";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseImportFileContent(content: string): ImportParseResult {
  if (!content.trim()) {
    return {
      success: false,
      rows: [],
      errors: ["The file is empty."],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      success: false,
      rows: [],
      errors: ["Invalid JSON. Upload a valid JSON file."],
    };
  }

  let rows: unknown[];

  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (isRecord(parsed) && Array.isArray(parsed.records)) {
    rows = parsed.records;
  } else {
    return {
      success: false,
      rows: [],
      errors: [
        'JSON must be an array of records or an object with a "records" array.',
      ],
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      rows: [],
      errors: ["No records found in the import file."],
    };
  }

  const normalizedRows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      errors.push(`Row ${index + 1} is not a valid object.`);
      return;
    }
    normalizedRows.push(row);
  });

  if (normalizedRows.length === 0) {
    return {
      success: false,
      rows: [],
      errors: errors.length > 0 ? errors : ["No valid records found."],
    };
  }

  return {
    success: true,
    rows: normalizedRows,
    errors,
  };
}
