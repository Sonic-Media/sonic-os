"use client";

import { useCallback, useMemo, useState } from "react";
import { useBranches } from "@/context/branches-context";
import { useEntriesContext } from "@/context/entries-context";
import { useStaff } from "@/context/staff-context";
import { buildEntryFromImportRow } from "@/lib/historical-import/build-entry";
import { parseImportFileContent } from "@/lib/historical-import/parse";
import { buildImportPreview } from "@/lib/historical-import/preview";
import {
  clearImportUndoSnapshot,
  getImportUndoSnapshot,
  saveImportUndoSnapshot,
} from "@/lib/historical-import/undo-storage";
import type {
  ImportPreviewResult,
  ImportRunResult,
  ImportUndoSnapshot,
} from "@/types/historical-import";

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useHistoricalImport() {
  const { entries, isLoaded, importEntries, removeEntriesByIds } =
    useEntriesContext();
  const { activeBranches, getBranchName } = useBranches();
  const { staff } = useStaff();

  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
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
    setParseErrors([]);
    setFileName(null);
    setProgress(0);
    setLastImportResult(null);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      resetImportState();

      const content = await file.text();
      const parsed = parseImportFileContent(content);

      if (!parsed.success) {
        setParseErrors(parsed.errors);
        setFileName(file.name);
        return;
      }

      const nextPreview = buildImportPreview(
        parsed.rows,
        entries,
        activeBranches,
        getBranchName
      );

      setPreview(nextPreview);
      setParseErrors(parsed.errors);
      setFileName(file.name);
    },
    [activeBranches, entries, getBranchName, resetImportState]
  );

  const runImport = useCallback(async (): Promise<ImportRunResult> => {
    if (!preview) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: ["Load and preview a file before importing."],
        importedEntryIds: [],
      };
    }

    const importableRows = preview.rows.filter((row) => row.status === "valid");
    const skippedCount = preview.totalCount - importableRows.length;

    if (importableRows.length === 0) {
      const result: ImportRunResult = {
        success: false,
        importedCount: 0,
        skippedCount,
        errors: ["No valid records are ready to import."],
        importedEntryIds: [],
      };
      setLastImportResult(result);
      return result;
    }

    setIsImporting(true);
    setProgress(0);

    const importedEntries = [];

    for (let index = 0; index < importableRows.length; index += 1) {
      importedEntries.push(buildEntryFromImportRow(importableRows[index], staff));
      setProgress(Math.round(((index + 1) / importableRows.length) * 100));
      await waitForNextFrame();
    }

    importEntries(importedEntries);

    const snapshot: ImportUndoSnapshot = {
      importedAt: new Date().toISOString(),
      entryIds: importedEntries.map((entry) => entry.id),
      importedCount: importedEntries.length,
    };

    saveImportUndoSnapshot(snapshot);
    setUndoSnapshot(snapshot);

    const result: ImportRunResult = {
      success: true,
      importedCount: importedEntries.length,
      skippedCount,
      errors: [],
      importedEntryIds: snapshot.entryIds,
    };

    setLastImportResult(result);
    setIsImporting(false);
    setPreview(null);
    setFileName(null);
    setProgress(100);

    return result;
  }, [importEntries, preview, staff]);

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
    parseErrors,
    fileName,
    progress,
    isImporting,
    lastImportResult,
    undoSnapshot,
    errorReport,
    loadFile,
    runImport,
    undoLastImport,
    resetImportState,
  };
}
