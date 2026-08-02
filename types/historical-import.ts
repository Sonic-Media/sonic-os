import type { Entry } from "@/types";

export type ImportRowStatus =
  | "valid"
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
  raw: Record<string, unknown>;
  entry?: Entry;
}

export interface ImportParseResult {
  success: boolean;
  rows: Record<string, unknown>[];
  errors: string[];
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  totalCount: number;
}

export interface ImportRunResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  importedEntryIds: string[];
}

export interface ImportUndoSnapshot {
  importedAt: string;
  entryIds: string[];
  importedCount: number;
}
