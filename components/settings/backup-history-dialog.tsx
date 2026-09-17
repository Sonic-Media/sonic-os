"use client";

import { Button } from "@/components/shared/ui/button";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { BackupRecordSummary } from "@/lib/api/backup";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBackupLabel(backup: BackupRecordSummary): string {
  const formatLabel = backup.format === "json" ? "JSON" : "SQL";
  return `${formatLabel}${backup.compressed ? " (gzip)" : ""}`;
}

function triggerLabel(backup: BackupRecordSummary): string {
  if (backup.trigger === "pre-restore") return "Pre-Restore Safety Backup";
  if (backup.trigger === "restore") return "Restore";
  return backup.trigger === "manual" ? "Manual" : "Scheduled";
}

interface BackupHistoryDialogProps {
  backups: BackupRecordSummary[];
  onClose: () => void;
}

export function BackupHistoryDialog({
  backups,
  onClose,
}: BackupHistoryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close backup history"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08]",
          uiSurface.modal
        )}
      >
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-white">Backup History</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Full audit trail including failed attempts and technical error details.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {backups.length === 0 ? (
            <p className="text-sm text-zinc-500">No backup records found.</p>
          ) : (
            <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
              {backups.map((backup) => (
                <div key={backup.id} className="px-4 py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {triggerLabel(backup)}
                        {backup.trigger !== "restore" &&
                        backup.trigger !== "pre-restore"
                          ? " backup"
                          : ""}
                        {backup.createdByName ? ` · ${backup.createdByName}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDateTime(backup.createdAt)} · {formatBackupLabel(backup)} ·{" "}
                        {formatBytes(backup.fileSizeBytes)}
                        {backup.storageType === "database"
                          ? " · Database"
                          : backup.storageType === "filesystem"
                            ? " · Filesystem"
                            : ""}
                      </p>
                      {backup.status === "failed" && backup.error ? (
                        <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300">
                          {backup.error}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium uppercase tracking-wide",
                        backup.status === "completed"
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    >
                      {backup.status === "completed" ? "Completed" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
