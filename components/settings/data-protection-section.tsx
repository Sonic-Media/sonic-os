"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackupHistoryDialog } from "@/components/settings/backup-history-dialog";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import {
  listBackupsApi,
  triggerBackupApi,
  type BackupRecordSummary,
} from "@/lib/api/backup";
import { isApiError } from "@/lib/api/errors";
import { isProductionModeClient } from "@/lib/env/production-mode-client";
import { PRODUCTION_CONFIRM_DELETE } from "@/lib/data-protection/constants";
import { cn } from "@/lib/utils";

const RECENT_SUCCESS_LIMIT = 3;

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
  return backup.trigger === "manual" ? "Manual" : "Scheduled";
}

type ProtectionStatus = "protected" | "attention";

function deriveBackupPresentation(backups: BackupRecordSummary[]) {
  const sorted = [...backups].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
  const completed = sorted.filter((backup) => backup.status === "completed");
  const failed = sorted.filter((backup) => backup.status === "failed");
  const lastSuccessful = completed[0] ?? null;
  const mostRecent = sorted[0] ?? null;
  const recentSuccessful = completed.slice(0, RECENT_SUCCESS_LIMIT);

  let protectionStatus: ProtectionStatus = "attention";
  let protectionMessage = "No successful backup on record yet.";

  if (lastSuccessful) {
    const successIsToday =
      lastSuccessful.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
    const latestAttemptFailed =
      mostRecent?.status === "failed" &&
      mostRecent.createdAt > lastSuccessful.createdAt;

    if (successIsToday && !latestAttemptFailed) {
      protectionStatus = "protected";
      protectionMessage = "Your latest restorable backup completed successfully today.";
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

export function DataProtectionSection() {
  const [backups, setBackups] = useState<BackupRecordSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const productionMode = isProductionModeClient();

  const presentation = useMemo(() => deriveBackupPresentation(backups), [backups]);

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

  return (
    <>
      <Card>
        <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Data Protection
        </h3>
        <p className="mb-5 text-sm text-zinc-400">
          Am I protected right now? This view focuses on backup health — not every
          historical error line.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Backup Health
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    presentation.protectionStatus === "protected"
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  )}
                  aria-hidden
                />
                <p className="text-lg font-semibold text-white">
                  {presentation.protectionStatus === "protected"
                    ? "Protected"
                    : "Attention Required"}
                </p>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {presentation.protectionMessage}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleBackupNow()}
                loading={isBackingUp}
                loadingLabel="Backing Up..."
                disabled={isBackingUp}
              >
                Backup Now
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadBackups()}
                disabled={isLoading || isBackingUp}
              >
                Refresh
              </Button>
            </div>
          </div>

          {presentation.lastSuccessful ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-500">Last successful backup</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {formatBackupTimestamp(presentation.lastSuccessful.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Type</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {triggerLabel(presentation.lastSuccessful)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Size</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {formatBytes(presentation.lastSuccessful.fileSizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Storage</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {storageLabel(presentation.lastSuccessful)}
                </dd>
              </div>
            </dl>
          ) : isLoading ? (
            <p className="mt-5 text-sm text-zinc-500">Loading backup health...</p>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              Run Backup Now to create your first restorable backup.
            </p>
          )}
        </div>

        {productionMode ? (
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Production mode is active. Destructive operations require explicit
            confirmation.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Recent Backups
          </p>

          {isLoading ? (
            <p className="text-sm text-zinc-500">Loading backups...</p>
          ) : presentation.recentSuccessful.length === 0 ? (
            <p className="text-sm text-zinc-500">No successful backups recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-black/20 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium"> </th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {presentation.recentSuccessful.map((backup) => (
                    <tr key={backup.id}>
                      <td className="px-4 py-3 text-emerald-400">✓</td>
                      <td className="px-4 py-3 text-zinc-300">{triggerLabel(backup)}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatBackupTimestamp(backup.createdAt)}
                        <span className="ml-2 text-xs text-zinc-600">
                          {formatBytes(backup.fileSizeBytes)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">Completed</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {presentation.failedCount > 0 ? (
            <p className="text-sm text-zinc-500">
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
            <p className="text-sm text-zinc-500">
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

      {historyOpen ? (
        <BackupHistoryDialog
          backups={presentation.sorted}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </>
  );
}
