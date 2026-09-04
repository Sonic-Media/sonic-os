import fs from "node:fs";
import path from "node:path";
import { ApiError } from "@/lib/api/errors";
import {
  createDatabaseBackup,
  type BackupManifest,
  type BackupResult,
} from "@/lib/backup/backup";
import { getBackupConfig } from "@/lib/backup/config";
import { isServerlessRuntime } from "@/lib/backup/runtime";
import { resolveBackupFileFromManifest } from "@/lib/db/admin-prisma";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

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

export interface TriggerBackupOptions {
  trigger: "manual" | "scheduled";
  createdById?: string;
  createdByName?: string;
}

interface PersistedBackupPayload {
  storageType: "database";
  payload: Buffer;
  manifestJson: BackupManifest;
  filePath: string;
  manifestPath: string;
  fileSizeBytes: number;
}

function logBackupFailure(error: unknown): void {
  if (error instanceof Error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "backup.failure",
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
        ...(error instanceof ApiError
          ? { code: error.code, details: error.details }
          : {}),
      })
    );
    return;
  }

  console.error(
    JSON.stringify({
      level: "error",
      event: "backup.failure",
      timestamp: new Date().toISOString(),
      errorMessage: String(error),
    })
  );
}

function resolveBackupFileSize(
  result: BackupResult
): { filePath: string; fileSizeBytes: number | null } {
  const filePath =
    result.archivePath ?? result.sqlPath ?? result.jsonPath ?? "";
  if (!filePath) {
    return { filePath: "", fileSizeBytes: null };
  }

  try {
    const stats = fs.statSync(filePath);
    return { filePath, fileSizeBytes: stats.size };
  } catch {
    return { filePath, fileSizeBytes: null };
  }
}

function persistServerlessBackupPayload(
  result: BackupResult
): PersistedBackupPayload | null {
  if (!isServerlessRuntime()) {
    return null;
  }

  const sourcePath =
    result.archivePath ?? result.sqlPath ?? result.jsonPath ?? "";
  if (!sourcePath) {
    return null;
  }

  try {
    const payload = fs.readFileSync(sourcePath);
    return {
      storageType: "database",
      payload,
      manifestJson: result.manifest,
      filePath: path.basename(sourcePath),
      manifestPath: path.basename(result.manifestPath),
      fileSizeBytes: payload.length,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Could not read backup file.";
    throw new Error(`Failed to persist backup payload: ${detail}`);
  }
}

function toBackupApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    const prisma = error as Error & { code?: string; meta?: unknown };

    if (prisma.code === "P2021") {
      return new ApiError(
        'BackupRecord table does not exist. Run `npx prisma migrate deploy` on production.',
        { status: 503, code: "backup_schema_missing" }
      );
    }

    return new ApiError(error.message, {
      status: 500,
      code: "backup_failed",
      details:
        process.env.NODE_ENV === "development"
          ? { stack: error.stack, prismaCode: prisma.code, prismaMeta: prisma.meta }
          : undefined,
    });
  }

  return new ApiError("Database backup failed.", {
    status: 500,
    code: "backup_failed",
  });
}

export async function triggerDatabaseBackup(
  options: TriggerBackupOptions
): Promise<BackupRecordSummary> {
  let result: BackupResult;
  let status = "completed";
  let error: string | undefined;
  let filePath = "";
  let fileSizeBytes: number | null = null;
  let persisted: PersistedBackupPayload | null = null;

  try {
    result = await createDatabaseBackup();
    const resolved = resolveBackupFileSize(result);
    filePath = resolved.filePath;
    fileSizeBytes = resolved.fileSizeBytes;

    if (!filePath) {
      throw new Error("Backup completed without an output file.");
    }

    persisted = persistServerlessBackupPayload(result);
    if (persisted) {
      filePath = persisted.filePath;
      fileSizeBytes = persisted.fileSizeBytes;
    }
  } catch (caught) {
    logBackupFailure(caught);
    status = "failed";
    error =
      caught instanceof Error ? caught.message : "Database backup failed.";
    result = {
      basename: "",
      engine: "json",
      manifestPath: "",
      manifest: {
        app: "sonic-os",
        type: "database-backup",
        engine: "json",
        createdAt: new Date().toISOString(),
        database: "unknown",
        host: "unknown",
        compressed: getBackupConfig().compress,
        files: { manifest: "" },
        sizes: {},
      },
    };
  }

  try {
    const record = await prisma.backupRecord.create({
      data: {
        trigger: options.trigger,
        createdById: options.createdById ?? null,
        createdByName: options.createdByName ?? null,
        manifestPath:
          persisted?.manifestPath ??
          (result.manifestPath ||
            path.join(getBackupConfig().backupDir, "failed.manifest.json")),
        filePath: filePath || result.manifestPath,
        fileSizeBytes: fileSizeBytes ?? undefined,
        compressed: result.manifest.compressed,
        status,
        error: error ?? null,
        storageType: persisted?.storageType ?? "filesystem",
        payload: persisted?.payload
          ? Uint8Array.from(persisted.payload)
          : undefined,
        manifestJson: persisted?.manifestJson as Prisma.InputJsonValue | undefined,
      },
    });

    return mapBackupRecord(record, result.manifest.engine);
  } catch (caught) {
    logBackupFailure(caught);
    throw toBackupApiError(caught);
  }
}

export async function listBackupRecords(
  limit = 20
): Promise<BackupRecordSummary[]> {
  try {
    const records = await prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return records.map((record) => mapBackupRecord(record));
  } catch (error) {
    logBackupFailure(error);
    throw toBackupApiError(error);
  }
}

export async function getLatestBackupRecord(): Promise<BackupRecordSummary | null> {
  const record = await prisma.backupRecord.findFirst({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
  });

  return record ? mapBackupRecord(record) : null;
}

function inferFormatFromPath(filePath: string): "sql" | "json" {
  const lower = filePath.toLowerCase();
  if (lower.includes(".json")) {
    return "json";
  }
  return "sql";
}

function inferFormatFromManifest(manifestJson: unknown): "sql" | "json" | undefined {
  if (!manifestJson || typeof manifestJson !== "object") {
    return undefined;
  }

  const engine = (manifestJson as { engine?: string }).engine;
  if (engine === "json") {
    return "json";
  }
  if (engine === "pg_dump") {
    return "sql";
  }

  return undefined;
}

function mapBackupRecord(
  record: {
    id: string;
    createdAt: Date;
    trigger: string;
    createdById: string | null;
    createdByName: string | null;
    manifestPath: string;
    filePath: string;
    fileSizeBytes: bigint | null;
    compressed: boolean;
    status: string;
    error: string | null;
    storageType: string;
    manifestJson?: unknown;
  },
  engine?: "pg_dump" | "json"
): BackupRecordSummary {
  const storedInDatabase = record.storageType === "database";
  const manifestFile = storedInDatabase
    ? null
    : resolveBackupFileFromManifest(record.manifestPath);
  const resolvedPath = manifestFile ?? record.filePath;
  const format =
    engine === "json"
      ? "json"
      : engine === "pg_dump"
        ? "sql"
        : inferFormatFromManifest(record.manifestJson) ??
          inferFormatFromPath(resolvedPath);

  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    trigger: record.trigger,
    createdById: record.createdById ?? undefined,
    createdByName: record.createdByName ?? undefined,
    manifestPath: record.manifestPath,
    filePath: resolvedPath,
    fileSizeBytes:
      record.fileSizeBytes !== null ? Number(record.fileSizeBytes) : null,
    compressed: record.compressed,
    status: record.status,
    format,
    storageType: storedInDatabase ? "database" : "filesystem",
    error: record.error ?? undefined,
  };
}
