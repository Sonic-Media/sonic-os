import fs from "node:fs";
import path from "node:path";
import {
  createDatabaseBackup,
  type BackupResult,
} from "@/lib/backup/backup";
import { getBackupConfig } from "@/lib/backup/config";
import { resolveBackupFileFromManifest } from "@/lib/db/admin-prisma";
import { prisma } from "@/lib/db";

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
  error?: string;
}

export interface TriggerBackupOptions {
  trigger: "manual" | "scheduled";
  createdById?: string;
  createdByName?: string;
}

function resolveBackupFileSize(
  result: BackupResult
): { filePath: string; fileSizeBytes: number | null } {
  const filePath = result.archivePath ?? result.sqlPath;
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

export async function triggerDatabaseBackup(
  options: TriggerBackupOptions
): Promise<BackupRecordSummary> {
  let result: BackupResult;
  let status = "completed";
  let error: string | undefined;
  let filePath = "";
  let fileSizeBytes: number | null = null;

  try {
    result = await createDatabaseBackup();
    const resolved = resolveBackupFileSize(result);
    filePath = resolved.filePath;
    fileSizeBytes = resolved.fileSizeBytes;
  } catch (caught) {
    status = "failed";
    error =
      caught instanceof Error ? caught.message : "Database backup failed.";
    result = {
      basename: "",
      manifestPath: "",
      manifest: {
        app: "sonic-os",
        type: "database-backup",
        createdAt: new Date().toISOString(),
        database: "unknown",
        host: "unknown",
        compressed: getBackupConfig().compress,
        files: { manifest: "" },
        sizes: {},
      },
    };
  }

  const record = await prisma.backupRecord.create({
    data: {
      trigger: options.trigger,
      createdById: options.createdById ?? null,
      createdByName: options.createdByName ?? null,
      manifestPath: result.manifestPath || path.join(getBackupConfig().backupDir, "failed.manifest.json"),
      filePath: filePath || result.manifestPath,
      fileSizeBytes: fileSizeBytes ?? undefined,
      compressed: result.manifest.compressed,
      status,
      error: error ?? null,
    },
  });

  if (status === "failed") {
    throw new Error(error ?? "Database backup failed.");
  }

  return mapBackupRecord(record);
}

export async function listBackupRecords(limit = 20): Promise<BackupRecordSummary[]> {
  const records = await prisma.backupRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map(mapBackupRecord);
}

export async function getLatestBackupRecord(): Promise<BackupRecordSummary | null> {
  const record = await prisma.backupRecord.findFirst({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
  });

  return record ? mapBackupRecord(record) : null;
}

function mapBackupRecord(record: {
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
}): BackupRecordSummary {
  const manifestFile = resolveBackupFileFromManifest(record.manifestPath);

  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    trigger: record.trigger,
    createdById: record.createdById ?? undefined,
    createdByName: record.createdByName ?? undefined,
    manifestPath: record.manifestPath,
    filePath: manifestFile ?? record.filePath,
    fileSizeBytes:
      record.fileSizeBytes !== null ? Number(record.fileSizeBytes) : null,
    compressed: record.compressed,
    status: record.status,
    error: record.error ?? undefined,
  };
}
