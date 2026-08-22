import type { Entry } from "@/types";

export type ImportRowStatus =
  | "valid"
  | "inconsistent"
  | "duplicate_existing"
  | "duplicate_file"
  | "invalid";

export interface ImportPreviewRow {
  rowNumber: number;
  status: ImportRowStatus;
  errors: string[];
  warnings: string[];
  date: string | null;
  branch: string | null;
  branchName: string | null;
  sales: number | null;
  expenseTotal: number | null;
  statedExpenseTotal: number | null;
  statedBalance: number | null;
  raw: Record<string, unknown>;
  entry?: Entry;
}

export interface ImportParseResult {
  success: boolean;
  rows: Record<string, unknown>[];
  errors: string[];
  blankRowsSkipped: number;
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  validCount: number;
  inconsistentCount: number;
  duplicateCount: number;
  invalidCount: number;
  totalCount: number;
  blankRowsSkipped: number;
}

export interface ImportRunResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  selectedCount: number;
  failedCount: number;
  blankRowsSkipped: number;
  duplicateCount: number;
  inconsistentCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  importedEntryIds: string[];
  importedDates: string[];
}

export interface ImportUndoSnapshot {
  importedAt: string;
  entryIds: string[];
  importedCount: number;
}
