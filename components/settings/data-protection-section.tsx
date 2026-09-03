"use client";

import { useCallback, useEffect, useState } from "react";
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

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

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

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function DataProtectionSection() {
  const [backups, setBackups] = useState<BackupRecordSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const productionMode = isProductionModeClient();

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
    <Card>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Data Protection
      </h3>

      <p className="mb-4 text-sm text-zinc-400">
        Backups run automatically every day in production. On Vercel/Neon, Sonic
        OS uses a JSON export when pg_dump is unavailable. Use Backup Now before
        major changes.
      </p>

      {productionMode ? (
        <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Production mode is active. Destructive operations require explicit
          confirmation.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
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

      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recent Backups
        </p>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading backups...</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-zinc-500">No backups recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {backup.trigger === "manual" ? "Manual backup" : "Scheduled backup"}
                    {backup.createdByName ? ` · ${backup.createdByName}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(backup.createdAt)} · {formatBackupLabel(backup)} ·{" "}
                    {formatBytes(backup.fileSizeBytes)}
                    {backup.storageType === "database" ? " · stored in database" : ""}
                  </p>
                  {backup.status === "failed" && backup.error ? (
                    <p className="mt-1 text-xs text-red-400">{backup.error}</p>
                  ) : null}
                </div>
                <span
                  className={
                    backup.status === "completed"
                      ? "text-xs font-medium text-emerald-400"
                      : "text-xs font-medium text-red-400"
                  }
                >
                  {backup.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
