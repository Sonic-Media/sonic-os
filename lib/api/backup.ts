import { apiGet, apiPost } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

export interface BackupRecordSummary {
  id: string;
  createdAt: string;
  trigger: string;
  createdById?: string;
  createdByName?: string;
  manifestPath: string;
  filePath: string;
  fileSizeBytes: number | null;
  compressed: boolean;
  status: string;
  format: "sql" | "json";
  storageType: "filesystem" | "database";
  error?: string;
}

export interface RestoreBackupResult {
  safetyBackup: BackupRecordSummary;
  restoreRecord: BackupRecordSummary;
  sourceLabel: string;
  restoredRows: number;
  restoredTables: number;
}

export async function listBackupsApi(): Promise<BackupRecordSummary[]> {
  return apiGet<BackupRecordSummary[]>("/api/admin/backup");
}

export async function triggerBackupApi(): Promise<BackupRecordSummary> {
  return apiPost<BackupRecordSummary>("/api/admin/backup", {});
}

export async function restoreBackupApi(
  backupId: string
): Promise<RestoreBackupResult> {
  return apiPost<RestoreBackupResult>("/api/admin/backup/restore", {
    backupId,
  });
}

export async function restoreBackupFromFileApi(
  file: File
): Promise<RestoreBackupResult> {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await fetch("/api/admin/backup/restore", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  type RestoreEnvelope = {
    data?: RestoreBackupResult;
    error?: { message?: string; code?: string };
  };

  let payload: RestoreEnvelope | null = null;

  try {
    payload = (await response.json()) as RestoreEnvelope;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message?.trim() ||
        `Restore failed (${response.status}).`,
      {
        status: response.status,
        code: payload?.error?.code,
      }
    );
  }

  if (!payload?.data) {
    throw new ApiError("Missing restore response data.", {
      status: response.status,
    });
  }

  return payload.data;
}

export function getBackupDownloadUrl(backupId: string): string {
  return `/api/admin/backup/${encodeURIComponent(backupId)}/download`;
}

export function isBackupRestorableClient(backup: BackupRecordSummary): boolean {
  return (
    backup.status === "completed" &&
    backup.format === "json" &&
    backup.trigger !== "restore"
  );
}
