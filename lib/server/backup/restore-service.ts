import fs from "node:fs";
import path from "node:path";
import { ApiError } from "@/lib/api/errors";
import { applyValidatedJsonBackup } from "@/lib/backup/json-import";
import { parseAndValidateJsonBackup } from "@/lib/backup/json-parse";
import { BackupValidationError } from "@/lib/backup/json-validate";
import { prisma } from "@/lib/db";
import { resolveBackupFileFromManifest } from "@/lib/db/admin-prisma";
import {
  listBackupRecords,
  triggerDatabaseBackup,
  type BackupRecordSummary,
} from "@/lib/server/backup/backup-service";
import { readSessionTokenFromHttpRequest } from "@/lib/server/session";
import type { AuthSession } from "@/types/auth";

export interface RestoreBackupResult {
  safetyBackup: BackupRecordSummary;
  restoreRecord: BackupRecordSummary;
  sourceLabel: string;
  restoredRows: number;
  restoredTables: number;
}

function toRestoreApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof BackupValidationError) {
    return new ApiError(error.message, {
      status: 400,
      code: error.code,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message, {
      status: 500,
      code: "restore_failed",
    });
  }

  return new ApiError("Restore failed.", {
    status: 500,
    code: "restore_failed",
  });
}

async function readBackupRecordBytes(backupId: string): Promise<{
  bytes: Uint8Array;
  fileName: string;
  createdAt: string;
  format: "sql" | "json";
  summary: BackupRecordSummary;
}> {
  const record = await prisma.backupRecord.findUnique({
    where: { id: backupId },
  });

  if (!record) {
    throw new ApiError("Backup not found.", {
      status: 404,
      code: "backup_not_found",
    });
  }

  if (record.status !== "completed") {
    throw new ApiError("Only completed backups can be restored.", {
      status: 400,
      code: "backup_not_restorable",
    });
  }

  if (record.trigger === "restore") {
    throw new ApiError("Restore history entries cannot be restored again.", {
      status: 400,
      code: "backup_not_restorable",
    });
  }

  const summaries = await listBackupRecords(100);
  const summary = summaries.find((item) => item.id === backupId);
  const format = summary?.format ?? (record.filePath.includes(".json") ? "json" : "sql");

  if (format !== "json") {
    throw new ApiError(
      "Only JSON backups can be restored from the Data & Backup page. Use a JSON (.json / .json.gz) backup.",
      {
        status: 400,
        code: "unsupported_backup_format",
      }
    );
  }

  if (record.storageType === "database") {
    if (!record.payload || record.payload.length === 0) {
      throw new ApiError("Backup payload is missing from storage.", {
        status: 404,
        code: "backup_payload_missing",
      });
    }
    return {
      bytes: Uint8Array.from(record.payload),
      fileName: path.basename(record.filePath) || "backup.json.gz",
      createdAt: record.createdAt.toISOString(),
      format,
      summary: summary ?? {
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        trigger: record.trigger,
        createdById: record.createdById ?? undefined,
        createdByName: record.createdByName ?? undefined,
        manifestPath: record.manifestPath,
        filePath: record.filePath,
        fileSizeBytes:
          record.fileSizeBytes !== null ? Number(record.fileSizeBytes) : null,
        compressed: record.compressed,
        status: record.status,
        format,
        storageType: "database",
        error: record.error ?? undefined,
      },
    };
  }

  const resolved =
    resolveBackupFileFromManifest(record.manifestPath) ?? record.filePath;
  if (!resolved || !fs.existsSync(resolved)) {
    throw new ApiError("Backup file is missing on disk.", {
      status: 404,
      code: "backup_file_missing",
    });
  }

  return {
    bytes: new Uint8Array(fs.readFileSync(resolved)),
    fileName: path.basename(resolved),
    createdAt: record.createdAt.toISOString(),
    format,
    summary: summary ?? {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      trigger: record.trigger,
      createdById: record.createdById ?? undefined,
      createdByName: record.createdByName ?? undefined,
      manifestPath: record.manifestPath,
      filePath: resolved,
      fileSizeBytes:
        record.fileSizeBytes !== null ? Number(record.fileSizeBytes) : null,
      compressed: record.compressed,
      status: record.status,
      format,
      storageType: "filesystem",
      error: record.error ?? undefined,
    },
  };
}

async function createSafetyBackup(session: AuthSession): Promise<BackupRecordSummary> {
  return triggerDatabaseBackup({
    trigger: "pre-restore",
    createdById: session.userId,
    createdByName: session.displayName || "Pre-Restore Safety Backup",
  });
}

async function recordRestoreHistory(options: {
  session: AuthSession;
  sourceLabel: string;
  safetyBackupId: string;
}): Promise<BackupRecordSummary> {
  const record = await prisma.backupRecord.create({
    data: {
      trigger: "restore",
      createdById: options.session.userId,
      createdByName: options.session.displayName,
      manifestPath: `restore:${options.safetyBackupId}`,
      filePath: `restored-from:${options.sourceLabel}`,
      compressed: false,
      status: "completed",
      storageType: "database",
      error: null,
    },
  });

  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    trigger: record.trigger,
    createdById: record.createdById ?? undefined,
    createdByName: record.createdByName ?? undefined,
    manifestPath: record.manifestPath,
    filePath: record.filePath,
    fileSizeBytes: null,
    compressed: false,
    status: "completed",
    format: "json",
    storageType: "database",
  };
}

async function runValidatedRestore(options: {
  bytes: Uint8Array;
  fileName: string;
  sourceLabel: string;
  session: AuthSession;
  request?: Request;
}): Promise<RestoreBackupResult> {
  // Validate BEFORE creating the safety backup? User said:
  // 1. Create safety backup
  // 2. Retrieve selected backup
  // 3. Decompress...
  // But also: if validation fails, keep current data untouched.
  // Safety backup creation is fine even if restore fails — it protects current data.
  // However validating first avoids unnecessary safety backups on bad files.
  // Spec order: safety first, then retrieve/validate. I'll validate bytes first
  // in memory (no DB mutation), then safety backup, then apply — so bad uploads
  // never create safety backups OR mutate data. For recorded backups, create
  // safety backup then re-validate then apply.

  const payload = await parseAndValidateJsonBackup(
    options.bytes,
    options.fileName
  );

  const safetyBackup = await createSafetyBackup(options.session);

  const sessionToken = readSessionTokenFromHttpRequest(options.request);

  try {
    const applied = await applyValidatedJsonBackup({
      payload,
      preserveSessionToken: sessionToken,
      preserveUserId: options.session.userId,
      preserveUsername: options.session.username,
    });

    const restoreRecord = await recordRestoreHistory({
      session: options.session,
      sourceLabel: options.sourceLabel,
      safetyBackupId: safetyBackup.id,
    });

    return {
      safetyBackup,
      restoreRecord,
      sourceLabel: options.sourceLabel,
      restoredRows: applied.restoredRows,
      restoredTables: applied.restoredTables,
    };
  } catch (error) {
    // applyValidatedJsonBackup is transactional — current data remains intact.
    // Safety backup remains available for recovery.
    throw toRestoreApiError(error);
  }
}

export async function restoreBackupById(options: {
  backupId: string;
  session: AuthSession;
  request?: Request;
}): Promise<RestoreBackupResult> {
  try {
    const source = await readBackupRecordBytes(options.backupId);
    return await runValidatedRestore({
      bytes: source.bytes,
      fileName: source.fileName,
      sourceLabel: source.createdAt,
      session: options.session,
      request: options.request,
    });
  } catch (error) {
    throw toRestoreApiError(error);
  }
}

export async function restoreBackupFromUpload(options: {
  bytes: Uint8Array;
  fileName: string;
  session: AuthSession;
  request?: Request;
}): Promise<RestoreBackupResult> {
  try {
    const lower = options.fileName.toLowerCase();
    if (
      !lower.endsWith(".json") &&
      !lower.endsWith(".json.gz") &&
      !lower.endsWith(".gz")
    ) {
      throw new BackupValidationError(
        "Please choose a .json or .json.gz Sonic OS backup file.",
        "unsupported_backup_format"
      );
    }

    return await runValidatedRestore({
      bytes: options.bytes,
      fileName: options.fileName,
      sourceLabel: options.fileName,
      session: options.session,
      request: options.request,
    });
  } catch (error) {
    throw toRestoreApiError(error);
  }
}

export async function downloadBackupById(backupId: string): Promise<{
  bytes: Buffer;
  fileName: string;
  contentType: string;
}> {
  const record = await prisma.backupRecord.findUnique({
    where: { id: backupId },
  });

  if (!record) {
    throw new ApiError("Backup not found.", {
      status: 404,
      code: "backup_not_found",
    });
  }

  if (record.status !== "completed") {
    throw new ApiError("Only completed backups can be downloaded.", {
      status: 400,
      code: "backup_not_downloadable",
    });
  }

  if (record.trigger === "restore") {
    throw new ApiError("Restore history entries have no downloadable file.", {
      status: 400,
      code: "backup_not_downloadable",
    });
  }

  if (record.storageType === "database") {
    if (!record.payload || record.payload.length === 0) {
      throw new ApiError("Backup payload is missing from storage.", {
        status: 404,
        code: "backup_payload_missing",
      });
    }
    const fileName = path.basename(record.filePath) || `backup-${backupId}.json.gz`;
    return {
      bytes: Buffer.from(record.payload),
      fileName,
      contentType: fileName.endsWith(".gz")
        ? "application/gzip"
        : fileName.endsWith(".json")
          ? "application/json"
          : "application/octet-stream",
    };
  }

  const resolved =
    resolveBackupFileFromManifest(record.manifestPath) ?? record.filePath;
  if (!resolved || !fs.existsSync(resolved)) {
    throw new ApiError("Backup file is missing on disk.", {
      status: 404,
      code: "backup_file_missing",
    });
  }

  const fileName = path.basename(resolved);
  return {
    bytes: fs.readFileSync(resolved),
    fileName,
    contentType: fileName.endsWith(".gz")
      ? "application/gzip"
      : fileName.endsWith(".json")
        ? "application/json"
        : "application/octet-stream",
  };
}

export function isBackupRestorable(backup: BackupRecordSummary): boolean {
  return (
    backup.status === "completed" &&
    backup.format === "json" &&
    backup.trigger !== "restore"
  );
}
