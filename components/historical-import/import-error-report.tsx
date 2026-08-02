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
            Import Result
          </h3>
          {lastImportResult.success ? (
            <p className="text-sm text-emerald-400">
              Imported {lastImportResult.importedCount} record
              {lastImportResult.importedCount === 1 ? "" : "s"}. Skipped{" "}
              {lastImportResult.skippedCount} duplicate or invalid row
              {lastImportResult.skippedCount === 1 ? "" : "s"}.
            </p>
          ) : (
            <p className="text-sm text-red-400">
              {lastImportResult.errors[0] ?? "Import failed."}
            </p>
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
