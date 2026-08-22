import { Card } from "@/components/shared/ui/card";
import type { ImportRunResult } from "@/types/historical-import";

interface ImportErrorReportProps {
  errors: string[];
  lastImportResult: ImportRunResult | null;
}

export function ImportErrorReport({
  errors,
  lastImportResult,
}: ImportErrorReportProps) {
  const hasErrors = errors.length > 0;
  const hasResult = Boolean(lastImportResult);

  if (!hasErrors && !hasResult) return null;

  return (
    <section className="space-y-4">
      {hasResult && lastImportResult && (
        <Card>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Import Summary
          </h3>
          {lastImportResult.success ? (
            <div className="space-y-2 text-sm text-zinc-300">
              <p className="text-emerald-400">
                Imported {lastImportResult.importedCount} daily record
                {lastImportResult.importedCount === 1 ? "" : "s"} in one
                transaction.
              </p>
              <ul className="space-y-1 text-zinc-400">
                <li>Selected rows: {lastImportResult.selectedCount}</li>
                <li>Skipped rows: {lastImportResult.skippedCount}</li>
                <li>Blank rows skipped: {lastImportResult.blankRowsSkipped}</li>
                <li>Duplicates detected: {lastImportResult.duplicateCount}</li>
                <li>Invalid rows: {lastImportResult.invalidCount}</li>
                <li>
                  Inconsistent rows imported: {lastImportResult.inconsistentCount}
                </li>
              </ul>
              {lastImportResult.importedDates.length > 0 && (
                <p className="text-xs text-zinc-500">
                  Dates imported: {lastImportResult.importedDates.join(", ")}
                </p>
              )}
              {lastImportResult.warnings.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                    Imported with warnings
                  </p>
                  <ul className="space-y-1">
                    {lastImportResult.warnings.map((warning) => (
                      <li key={warning} className="text-sm text-orange-300">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-red-400">
                {lastImportResult.errors[0] ?? "Import failed."}
              </p>
              <p className="text-zinc-400">
                No rows were saved. The database transaction was rolled back.
              </p>
              <ul className="space-y-1 text-zinc-500">
                <li>Selected rows: {lastImportResult.selectedCount}</li>
                <li>Failed rows: {lastImportResult.failedCount}</li>
                <li>Blank rows skipped: {lastImportResult.blankRowsSkipped}</li>
              </ul>
            </div>
          )}
        </Card>
      )}

      {hasErrors && (
        <Card>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Error Report
          </h3>
          <ul className="space-y-2">
            {errors.map((error) => (
              <li key={error} className="text-sm text-red-400">
                {error}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
