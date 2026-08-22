"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { useEntriesContext } from "@/context/entries-context";
import { useStaff } from "@/context/staff-context";
import { buildEntryFromImportRow } from "@/lib/historical-import/build-entry";
import {
  isImportablePreviewRow,
} from "@/lib/historical-import/duplicates";
import { parseImportFile } from "@/lib/historical-import/parse-file";
import { buildImportPreview } from "@/lib/historical-import/preview";
import {
  clearImportUndoSnapshot,
  getImportUndoSnapshot,
  saveImportUndoSnapshot,
} from "@/lib/historical-import/undo-storage";
import { getDataSourceErrorMessage } from "@/lib/data-source/context-api";
import type {
  ImportPreviewResult,
  ImportPreviewRow,
  ImportRunResult,
  ImportUndoSnapshot,
} from "@/types/historical-import";

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function defaultSelectedRowNumbers(rows: ImportPreviewRow[]): Set<number> {
  return new Set(
    rows.filter(isImportablePreviewRow).map((row) => row.rowNumber)
  );
}

export function useHistoricalImport() {
  const { entries, isLoaded, importEntries, removeEntriesByIds } =
    useEntriesContext();
  const { activeBranches, getBranchName } = useBranches();
  const { activeBranch } = useActiveBranch();
  const { staff } = useStaff();

  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(
    new Set()
  );
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportRunResult | null>(
    null
  );
  const [undoSnapshot, setUndoSnapshot] = useState<ImportUndoSnapshot | null>(
    () => getImportUndoSnapshot()
  );

  const resetImportState = useCallback(() => {
    setPreview(null);
    setSelectedRowNumbers(new Set());
    setParseErrors([]);
    setFileName(null);
    setProgress(0);
    setLastImportResult(null);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      resetImportState();

      const parsed = await parseImportFile(file, activeBranch);

      if (!parsed.success) {
        setParseErrors(parsed.errors);
        setFileName(file.name);
        return;
      }

      const nextPreview = buildImportPreview(
        parsed.rows,
        entries,
        activeBranches,
        getBranchName,
        parsed.blankRowsSkipped
      );

      setPreview(nextPreview);
      setSelectedRowNumbers(defaultSelectedRowNumbers(nextPreview.rows));
      setParseErrors(parsed.errors);
      setFileName(file.name);
    },
    [activeBranch, activeBranches, entries, getBranchName, resetImportState]
  );

  const toggleRowSelection = useCallback((rowNumber: number) => {
    setSelectedRowNumbers((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  }, []);

  const setAllRowsSelected = useCallback((selected: boolean) => {
    if (!preview) return;
    setSelectedRowNumbers(
      selected
        ? defaultSelectedRowNumbers(preview.rows)
        : new Set()
    );
  }, [preview]);

  const selectedRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter(
      (row) =>
        selectedRowNumbers.has(row.rowNumber) && isImportablePreviewRow(row)
    );
  }, [preview, selectedRowNumbers]);

  const runImport = useCallback(async (): Promise<ImportRunResult> => {
    if (!preview) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        selectedCount: 0,
        failedCount: 0,
        blankRowsSkipped: 0,
        duplicateCount: 0,
        inconsistentCount: 0,
        invalidCount: 0,
        errors: ["Load and preview a file before importing."],
        warnings: [],
        importedEntryIds: [],
        importedDates: [],
      };
    }

    const importableRows = selectedRows;
    const skippedCount =
      preview.totalCount -
      importableRows.length +
      preview.blankRowsSkipped;

    if (importableRows.length === 0) {
      const result: ImportRunResult = {
        success: false,
        importedCount: 0,
        skippedCount,
        selectedCount: 0,
        failedCount: 0,
        blankRowsSkipped: preview.blankRowsSkipped,
        duplicateCount: preview.duplicateCount,
        inconsistentCount: preview.inconsistentCount,
        invalidCount: preview.invalidCount,
        errors: ["Select at least one valid row to import."],
        warnings: [],
        importedEntryIds: [],
        importedDates: [],
      };
      setLastImportResult(result);
      return result;
    }

    setIsImporting(true);
    setProgress(0);

    const importedEntries = [];

    for (let index = 0; index < importableRows.length; index += 1) {
      importedEntries.push(buildEntryFromImportRow(importableRows[index], staff));
      setProgress(Math.round(((index + 1) / importableRows.length) * 50));
      await waitForNextFrame();
    }

    try {
      const saved = await importEntries(importedEntries);
      setProgress(100);

      const snapshot: ImportUndoSnapshot = {
        importedAt: new Date().toISOString(),
        entryIds: saved.map((entry) => entry.id),
        importedCount: saved.length,
      };

      saveImportUndoSnapshot(snapshot);
      setUndoSnapshot(snapshot);

      const warnings = importableRows.flatMap((row) =>
        row.warnings.map((warning) => `Row ${row.rowNumber}: ${warning}`)
      );

      const result: ImportRunResult = {
        success: true,
        importedCount: saved.length,
        skippedCount,
        selectedCount: importableRows.length,
        failedCount: 0,
        blankRowsSkipped: preview.blankRowsSkipped,
        duplicateCount: preview.duplicateCount,
        inconsistentCount: importableRows.filter(
          (row) => row.status === "inconsistent"
        ).length,
        invalidCount: preview.invalidCount,
        errors: [],
        warnings,
        importedEntryIds: snapshot.entryIds,
        importedDates: saved.map((entry) => entry.date),
      };

      setLastImportResult(result);
      setPreview(null);
      setFileName(null);
      setSelectedRowNumbers(new Set());
      setIsImporting(false);
      return result;
    } catch (error) {
      const result: ImportRunResult = {
        success: false,
        importedCount: 0,
        skippedCount,
        selectedCount: importableRows.length,
        failedCount: importableRows.length,
        blankRowsSkipped: preview.blankRowsSkipped,
        duplicateCount: preview.duplicateCount,
        inconsistentCount: preview.inconsistentCount,
        invalidCount: preview.invalidCount,
        errors: [getDataSourceErrorMessage(error)],
        warnings: [],
        importedEntryIds: [],
        importedDates: [],
      };
      setLastImportResult(result);
      setIsImporting(false);
      setProgress(0);
      return result;
    }
  }, [importEntries, preview, selectedRows, staff]);

  const undoLastImport = useCallback(() => {
    const snapshot = undoSnapshot ?? getImportUndoSnapshot();
    if (!snapshot || snapshot.entryIds.length === 0) {
      return {
        success: false,
        removedCount: 0,
        message: "No import is available to undo.",
      };
    }

    const removedCount = removeEntriesByIds(snapshot.entryIds);
    clearImportUndoSnapshot();
    setUndoSnapshot(null);
    setLastImportResult(null);

    return {
      success: removedCount > 0,
      removedCount,
      message:
        removedCount > 0
          ? `Removed ${removedCount} imported record${removedCount === 1 ? "" : "s"}.`
          : "Nothing was removed. The imported records may have been changed or deleted.",
    };
  }, [removeEntriesByIds, undoSnapshot]);

  const errorReport = useMemo(() => {
    if (parseErrors.length > 0) {
      return parseErrors;
    }

    if (!preview) return [];

    return preview.rows.flatMap((row) =>
      row.errors.map((error) => `Row ${row.rowNumber}: ${error}`)
    );
  }, [parseErrors, preview]);

  return {
    isLoaded,
    preview,
    selectedRowNumbers,
    selectedCount: selectedRows.length,
    parseErrors,
    fileName,
    progress,
    isImporting,
    lastImportResult,
    undoSnapshot,
    errorReport,
    activeBranch,
    loadFile,
    runImport,
    undoLastImport,
    resetImportState,
    toggleRowSelection,
    setAllRowsSelected,
  };
}
