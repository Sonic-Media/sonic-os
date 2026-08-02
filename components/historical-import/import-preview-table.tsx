import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ImportPreviewResult, ImportRowStatus } from "@/types/historical-import";
import { cn } from "@/lib/utils";

interface ImportPreviewTableProps {
  preview: ImportPreviewResult;
}

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  valid: "Ready",
  duplicate_existing: "Duplicate",
  duplicate_file: "Duplicate in file",
  invalid: "Invalid",
};

const STATUS_STYLES: Record<ImportRowStatus, string> = {
  valid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  duplicate_existing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  duplicate_file: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  invalid: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Preview
        </h2>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          <span>{preview.validCount} ready</span>
          <span>·</span>
          <span>{preview.duplicateCount} duplicates</span>
          <span>·</span>
          <span>{preview.invalidCount} invalid</span>
          <span>·</span>
          <span>{preview.totalCount} total</span>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Row
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Date
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Branch
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Sales
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Expenses
                </th>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => {
                const details = [...row.errors, ...row.warnings].join(" · ");

                return (
                  <tr
                    key={row.rowNumber}
                    className="border-b border-zinc-800/60 last:border-b-0"
                  >
                    <td className="px-5 py-4 text-zinc-300">{row.rowNumber}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          STATUS_STYLES[row.status]
                        )}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white">{row.date ?? "—"}</td>
                    <td className="px-5 py-4 text-white">
                      {row.branchName ?? row.branch ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">
                      {row.sales === null ? "—" : formatCurrency(row.sales)}
                    </td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">
                      {row.expenseTotal === null
                        ? "—"
                        : formatCurrency(row.expenseTotal)}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
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
