"use client";

import { ImportErrorReport } from "@/components/historical-import/import-error-report";
import { ImportFileUpload } from "@/components/historical-import/import-file-upload";
import { ImportPreviewTable } from "@/components/historical-import/import-preview-table";
import { ImportProgress } from "@/components/historical-import/import-progress";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useHistoricalImport } from "@/hooks/use-historical-import";
import { useBranches } from "@/context/branches-context";

export function HistoricalImportWorkspace() {
  const { getBranchName } = useBranches();
  const {
    preview,
    fileName,
    progress,
    isImporting,
    lastImportResult,
    undoSnapshot,
    errorReport,
    selectedRowNumbers,
    selectedCount,
    activeBranch,
    loadFile,
    runImport,
    undoLastImport,
    resetImportState,
    toggleRowSelection,
    setAllRowsSelected,
  } = useHistoricalImport();

  async function handleImport() {
    await runImport();
  }

  function handleUndo() {
    const confirmed = window.confirm(
      "Undo the last import? This removes the imported daily records."
    );
    if (!confirmed) return;

    const result = undoLastImport();
    window.alert(result.message);
  }

  return (
    <div className="space-y-6">
      <ImportFileUpload
        fileName={fileName}
        branchName={getBranchName(activeBranch)}
        onFileSelected={loadFile}
        onReset={resetImportState}
        disabled={isImporting}
      />

      {preview && (
        <ImportPreviewTable
          preview={preview}
          selectedRowNumbers={selectedRowNumbers}
          onToggleRow={toggleRowSelection}
          onSelectAll={setAllRowsSelected}
        />
      )}

      <ImportProgress progress={progress} isImporting={isImporting} />

      <ImportErrorReport
        errors={errorReport}
        lastImportResult={lastImportResult}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            onClick={handleImport}
            disabled={!preview || selectedCount === 0 || isImporting}
          >
            Import Selected Rows ({selectedCount})
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleUndo}
            disabled={!undoSnapshot || isImporting}
          >
            Undo Last Import
          </Button>
        </div>
        {undoSnapshot && (
          <p className="mt-3 text-xs text-zinc-500">
            Last import added {undoSnapshot.importedCount} record
            {undoSnapshot.importedCount === 1 ? "" : "s"} on{" "}
            {new Date(undoSnapshot.importedAt).toLocaleString("en-UG")}.
          </p>
        )}
      </Card>
    </div>
  );
}
