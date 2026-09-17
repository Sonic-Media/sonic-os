"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackupHistoryDialog } from "@/components/settings/backup-history-dialog";
import { RestoreConfirmDialog } from "@/components/settings/restore-confirm-dialog";
import { RestoreFromFileSection } from "@/components/settings/restore-from-file-section";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useAppDataRefresh } from "@/hooks/use-app-data-refresh";
import {
  getBackupDownloadUrl,
  isBackupRestorableClient,
  listBackupsApi,
  restoreBackupApi,
  restoreBackupFromFileApi,
  triggerBackupApi,
  type BackupRecordSummary,
} from "@/lib/api/backup";
import { isApiError } from "@/lib/api/errors";
import { isProductionModeClient } from "@/lib/env/production-mode-client";
import { PRODUCTION_CONFIRM_DELETE } from "@/lib/data-protection/constants";
import { cn } from "@/lib/utils";

const RECENT_SUCCESS_LIMIT = 5;
const RESTORE_FILE_INPUT_ID = "restore-from-file-input";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday =
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate();

  const time = parsed.toLocaleTimeString("en-UG", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${time}`;
  }

  return parsed.toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBackupLabel(backup: BackupRecordSummary): string {
  const formatLabel = backup.format === "json" ? "JSON" : "SQL";
  return `${formatLabel}${backup.compressed ? " (gzip)" : ""}`;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function storageLabel(backup: BackupRecordSummary): string {
  if (backup.storageType === "database") return "Database";
  if (backup.storageType === "filesystem") return "Filesystem";
  return "—";
}

function triggerLabel(backup: BackupRecordSummary): string {
  if (backup.trigger === "pre-restore") return "Safety Backup";
  if (backup.trigger === "restore") return "Restore";
  if (backup.trigger === "manual") return "Manual";
  if (backup.trigger === "scheduled") return "Scheduled";
  return backup.trigger;
}

function triggerFullLabel(backup: BackupRecordSummary): string {
  if (backup.trigger === "pre-restore") return "Pre-Restore Safety Backup";
  return triggerLabel(backup);
}

function canDownloadBackup(backup: BackupRecordSummary): boolean {
  return backup.status === "completed" && backup.trigger !== "restore";
}

type ProtectionStatus = "protected" | "attention";

function deriveBackupPresentation(backups: BackupRecordSummary[]) {
  const sorted = [...backups].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
  const completed = sorted.filter((backup) => backup.status === "completed");
  const failed = sorted.filter((backup) => backup.status === "failed");
  const lastSuccessful =
    completed.find(
      (backup) =>
        backup.trigger === "manual" ||
        backup.trigger === "scheduled" ||
        backup.trigger === "pre-restore"
    ) ??
    completed[0] ??
    null;
  const mostRecent = sorted[0] ?? null;
  const recentSuccessful = completed.slice(0, RECENT_SUCCESS_LIMIT);

  let protectionStatus: ProtectionStatus = "attention";
  let protectionMessage = "No successful backup on record yet.";

  if (lastSuccessful) {
    const successIsToday =
      lastSuccessful.createdAt.slice(0, 10) ===
      new Date().toISOString().slice(0, 10);
    const latestAttemptFailed =
      mostRecent?.status === "failed" &&
      mostRecent.createdAt > lastSuccessful.createdAt;

    if (successIsToday && !latestAttemptFailed) {
      protectionStatus = "protected";
      protectionMessage =
        "Your latest restorable backup completed successfully today.";
    } else if (latestAttemptFailed) {
      protectionStatus = "attention";
      protectionMessage =
        "The most recent backup attempt failed. Your last successful backup is still available below.";
    } else {
      protectionStatus = "attention";
      protectionMessage = `Last successful backup was ${formatBackupTimestamp(lastSuccessful.createdAt)}. Run Backup Now to refresh protection.`;
    }
  }

  return {
    sorted,
    lastSuccessful,
    recentSuccessful,
    failedCount: failed.length,
    protectionStatus,
    protectionMessage,
  };
}

type PendingRestore =
  | { kind: "record"; backup: BackupRecordSummary }
  | { kind: "file"; file: File; label: string };

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3-3.582-3-8-3-8 1.343-8 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
      />
    </svg>
  );
}

function BackupRowMenu({ backup }: { backup: BackupRecordSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="More backup actions"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-base leading-none" aria-hidden>
          ···
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-52 max-w-[min(13rem,calc(100vw-2rem))] rounded-xl border border-white/[0.08] bg-zinc-950/95 p-1 shadow-xl">
            <p className="px-3 py-2 text-xs font-medium text-zinc-300">
              {triggerFullLabel(backup)}
            </p>
            <p className="px-3 pb-2 text-xs text-zinc-500">
              {formatBackupLabel(backup)} · {storageLabel(backup)}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DataProtectionSection() {
  const { refreshAll } = useAppDataRefresh();
  const restoreSectionRef = useRef<HTMLDivElement>(null);
  const [backups, setBackups] = useState<BackupRecordSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(
    null
  );
  const productionMode = isProductionModeClient();

  const presentation = useMemo(() => deriveBackupPresentation(backups), [backups]);
  const busy = isBackingUp || isRestoring;

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const records = await listBackupsApi();
      setBackups(records);
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Could not load backups."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  function focusRestoreFromFile() {
    restoreSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => {
      document.getElementById(RESTORE_FILE_INPUT_ID)?.click();
    }, 250);
  }

  async function handleBackupNow() {
    if (productionMode) {
      const confirmed = window.confirm(
        `Create a database backup now?\n\nProduction mode is active. Type confirmation if prompted.`
      );
      if (!confirmed) {
        return;
      }

      const typed = window.prompt(
        `Type "${PRODUCTION_CONFIRM_DELETE}" to confirm backup creation:`
      );
      if (typed !== PRODUCTION_CONFIRM_DELETE) {
        setError("Backup cancelled — confirmation phrase did not match.");
        return;
      }
    }

    setIsBackingUp(true);
    setError(null);
    setSuccess(null);

    try {
      const backup = await triggerBackupApi();
      setSuccess(
        `Backup created successfully (${formatBackupLabel(backup)}, ${formatBytes(backup.fileSizeBytes)}).`
      );
      await loadBackups();
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Backup failed."));
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleDownload(backup: BackupRecordSummary) {
    setError(null);
    try {
      const response = await fetch(getBackupDownloadUrl(backup.id), {
        credentials: "include",
      });
      if (!response.ok) {
        let message = "Could not download backup.";
        try {
          const payload = (await response.json()) as {
            error?: { message?: string };
          };
          message = payload.error?.message?.trim() || message;
        } catch {
          // keep fallback
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const fileName = match?.[1] ?? `sonic-os-backup-${backup.id}.bin`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Could not download backup."));
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;

    setIsRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const result =
        pendingRestore.kind === "record"
          ? await restoreBackupApi(pendingRestore.backup.id)
          : await restoreBackupFromFileApi(pendingRestore.file);

      setPendingRestore(null);
      setSuccess(
        `Restore completed. Safety backup saved, and ${result.restoredRows.toLocaleString()} records were restored.`
      );
      await loadBackups();
      await refreshAll();
    } catch (caught) {
      setError(
        resolveErrorMessage(
          caught,
          "Restore failed. Your current data was left unchanged."
        )
      );
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <>
      <div className="min-w-0 space-y-6">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Data Protection
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    presentation.protectionStatus === "protected"
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  )}
                  aria-hidden
                />
                <p className="text-xl font-semibold tracking-tight text-white">
                  {presentation.protectionStatus === "protected"
                    ? "Protected"
                    : "Attention Required"}
                </p>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                {presentation.protectionMessage}
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                onClick={() => void handleBackupNow()}
                loading={isBackingUp}
                loadingLabel="Backing Up..."
                disabled={busy}
                className="w-full sm:w-auto"
              >
                <span className="inline-flex items-center gap-2">
                  <DatabaseIcon className="h-4 w-4" />
                  Backup Now
                </span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={focusRestoreFromFile}
                disabled={busy}
                className="w-full sm:w-auto"
              >
                <span className="inline-flex items-center gap-2">
                  <UploadIcon className="h-4 w-4" />
                  Restore from File
                </span>
              </Button>
            </div>
          </div>

          {presentation.lastSuccessful ? (
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Last successful backup</dt>
                <dd className="mt-1 truncate text-sm font-medium text-white">
                  {formatBackupTimestamp(presentation.lastSuccessful.createdAt)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Type</dt>
                <dd className="mt-1 truncate text-sm font-medium text-white">
                  {triggerLabel(presentation.lastSuccessful)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Size</dt>
                <dd className="mt-1 truncate text-sm font-medium text-white">
                  {formatBytes(presentation.lastSuccessful.fileSizeBytes)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Storage</dt>
                <dd className="mt-1 truncate text-sm font-medium text-white">
                  {storageLabel(presentation.lastSuccessful)}
                </dd>
              </div>
            </dl>
          ) : isLoading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading backup health...</p>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">
              Run Backup Now to create your first restorable backup.
            </p>
          )}

          {productionMode ? (
            <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Production mode is active. Destructive operations require explicit
              confirmation.
            </p>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <span aria-hidden className="mr-1.5">
                ✓
              </span>
              {success}
            </p>
          ) : null}
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Recent Backups
              </p>
              <p className="mt-1.5 text-sm text-zinc-400">
                Your latest backups. You can restore any of these or download a
                copy.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadBackups()}
              disabled={isLoading || busy}
              className="w-full shrink-0 sm:w-auto"
            >
              Refresh
            </Button>
          </div>

          <div className="mt-5 min-w-0">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Loading backups...</p>
            ) : presentation.recentSuccessful.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No successful backups recorded yet.
              </p>
            ) : (
              <div className="min-w-0 overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full min-w-[640px] table-fixed text-left text-sm">
                  <thead className="border-b border-white/[0.06] bg-black/20 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="w-[18%] px-3 py-2.5 font-medium sm:px-4">
                        Type
                      </th>
                      <th className="w-[18%] px-3 py-2.5 font-medium sm:px-4">
                        Date
                      </th>
                      <th className="w-[12%] px-3 py-2.5 font-medium sm:px-4">
                        Size
                      </th>
                      <th className="w-[16%] px-3 py-2.5 font-medium sm:px-4">
                        Status
                      </th>
                      <th className="w-[36%] px-3 py-2.5 font-medium sm:px-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {presentation.recentSuccessful.map((backup) => {
                      const restorable = isBackupRestorableClient(backup);
                      const downloadable = canDownloadBackup(backup);

                      return (
                        <tr key={backup.id}>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex min-w-0 items-center gap-2">
                              <DatabaseIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                              <span className="truncate text-zinc-200">
                                {triggerLabel(backup)}
                              </span>
                            </div>
                          </td>
                          <td className="truncate px-3 py-3 text-zinc-400 sm:px-4">
                            {formatBackupTimestamp(backup.createdAt)}
                          </td>
                          <td className="truncate px-3 py-3 text-zinc-400 sm:px-4">
                            {formatBytes(backup.fileSizeBytes)}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <span className="inline-flex items-center gap-2 font-medium text-emerald-400">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                                aria-hidden
                              />
                              Completed
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 px-2.5 text-xs"
                                disabled={!restorable || busy}
                                title={
                                  restorable
                                    ? "Restore this backup"
                                    : backup.format !== "json"
                                      ? "Only JSON backups can be restored here"
                                      : "This entry cannot be restored"
                                }
                                onClick={() =>
                                  setPendingRestore({ kind: "record", backup })
                                }
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <RestoreIcon className="h-3.5 w-3.5" />
                                  Restore
                                </span>
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 px-2.5 text-xs"
                                disabled={!downloadable || busy}
                                onClick={() => void handleDownload(backup)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <DownloadIcon className="h-3.5 w-3.5" />
                                  Download
                                </span>
                              </Button>
                              <BackupRowMenu backup={backup} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {presentation.failedCount > 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                <span className="text-zinc-400">
                  {presentation.failedCount} previous backup attempt
                  {presentation.failedCount === 1 ? "" : "s"} failed
                </span>
                {" · "}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
                >
                  View history →
                </button>
              </p>
            ) : backups.length > presentation.recentSuccessful.length ? (
              <p className="mt-4 text-sm text-zinc-500">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
                >
                  View full backup history →
                </button>
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <div ref={restoreSectionRef} id="restore-from-file">
            <RestoreFromFileSection
              inputId={RESTORE_FILE_INPUT_ID}
              disabled={busy}
              isRestoring={isRestoring && pendingRestore?.kind === "file"}
              onFileSelected={(file) => {
                setError(null);
                setPendingRestore({
                  kind: "file",
                  file,
                  label: file.name,
                });
              }}
            />
          </div>
        </Card>
      </div>

      {historyOpen ? (
        <BackupHistoryDialog
          backups={presentation.sorted}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      {pendingRestore ? (
        <RestoreConfirmDialog
          backupLabel={
            pendingRestore.kind === "record"
              ? formatBackupTimestamp(pendingRestore.backup.createdAt)
              : pendingRestore.label
          }
          isRestoring={isRestoring}
          onCancel={() => {
            if (!isRestoring) setPendingRestore(null);
          }}
          onConfirm={() => void confirmRestore()}
        />
      ) : null}
    </>
  );
}
