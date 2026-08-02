"use client";

import { ImportErrorReport } from "@/components/historical-import/import-error-report";
import { ImportFileUpload } from "@/components/historical-import/import-file-upload";
import { ImportPreviewTable } from "@/components/historical-import/import-preview-table";
import { ImportProgress } from "@/components/historical-import/import-progress";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useHistoricalImport } from "@/hooks/use-historical-import";

export function HistoricalImportWorkspace() {
  const {
    preview,
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
        onFileSelected={loadFile}
        onReset={resetImportState}
        disabled={isImporting}
      />

      {preview && <ImportPreviewTable preview={preview} />}

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
            disabled={!preview || preview.validCount === 0 || isImporting}
          >
            Import Valid Records
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
