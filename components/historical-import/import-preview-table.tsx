import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { formatCurrency } from "@/lib/format";
import { isImportablePreviewRow } from "@/lib/historical-import/duplicates";
import type { ImportPreviewResult, ImportRowStatus } from "@/types/historical-import";
import { cn } from "@/lib/utils";

interface ImportPreviewTableProps {
  preview: ImportPreviewResult;
  selectedRowNumbers: Set<number>;
  onToggleRow: (rowNumber: number) => void;
  onSelectAll: (selected: boolean) => void;
}

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  valid: "Ready",
  inconsistent: "Inconsistent",
  duplicate_existing: "Duplicate",
  duplicate_file: "Duplicate in file",
  invalid: "Invalid",
};

const STATUS_STYLES: Record<ImportRowStatus, string> = {
  valid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inconsistent: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  duplicate_existing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  duplicate_file: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  invalid: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ROW_STYLES: Record<ImportRowStatus, string> = {
  valid: "",
  inconsistent: "bg-orange-500/5",
  duplicate_existing: "bg-amber-500/5",
  duplicate_file: "bg-amber-500/5",
  invalid: "bg-red-500/5",
};

export function ImportPreviewTable({
  preview,
  selectedRowNumbers,
  onToggleRow,
  onSelectAll,
}: ImportPreviewTableProps) {
  const selectableRows = preview.rows.filter(isImportablePreviewRow);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedRowNumbers.has(row.rowNumber));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Preview
        </h2>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <span>{preview.validCount} ready</span>
          <span>·</span>
          <span>{preview.inconsistentCount} inconsistent</span>
          <span>·</span>
          <span>{preview.duplicateCount} duplicates</span>
          <span>·</span>
          <span>{preview.invalidCount} invalid</span>
          <span>·</span>
          <span>{preview.totalCount} rows</span>
          {preview.blankRowsSkipped > 0 && (
            <>
              <span>·</span>
              <span>{preview.blankRowsSkipped} blank skipped</span>
            </>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSelectAll(true)}
        >
          Select importable rows
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelectAll(false)}
        >
          Clear selection
        </Button>
        <span className="self-center text-xs text-zinc-500">
          {selectedRowNumbers.size} selected
          {allSelected && selectableRows.length > 0 ? " (all importable)" : ""}
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Import
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Row
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Date
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Branch
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Sales
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Expenses
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Balance
                </th>
                <th className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => {
                const details = [...row.errors, ...row.warnings].join(" · ");
                const importable = isImportablePreviewRow(row);
                const checked = selectedRowNumbers.has(row.rowNumber);

                return (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      "border-b border-zinc-800/60 last:border-b-0",
                      ROW_STYLES[row.status]
                    )}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!importable}
                        onChange={() => onToggleRow(row.rowNumber)}
                        aria-label={`Import row ${row.rowNumber}`}
                      />
                    </td>
                    <td className="px-4 py-4 text-zinc-300">{row.rowNumber}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          STATUS_STYLES[row.status]
                        )}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white">{row.date ?? "—"}</td>
                    <td className="px-4 py-4 text-white">
                      {row.branchName ?? row.branch ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-white tabular-nums">
                      {row.sales === null ? "—" : formatCurrency(row.sales)}
                    </td>
                    <td className="px-4 py-4 text-right text-white tabular-nums">
                      {row.expenseTotal === null
                        ? "—"
                        : formatCurrency(row.expenseTotal)}
                    </td>
                    <td className="px-4 py-4 text-right text-white tabular-nums">
                      {row.statedBalance === null
                        ? "—"
                        : formatCurrency(row.statedBalance)}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {details || "Ready to import"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
