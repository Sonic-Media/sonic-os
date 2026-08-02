import fs from "node:fs";
import path from "node:path";
import { getBackupConfig, requireDatabaseUrl } from "@/lib/backup/config";
import { compressFile, getFileSizeBytes } from "@/lib/backup/compress";
import {
  parseDatabaseUrl,
  sanitizeDatabaseName,
} from "@/lib/backup/database-url";
import { exportDatabaseSql } from "@/lib/backup/export";
import {
  createBackupBasename,
  resolveUniqueBackupPath,
} from "@/lib/backup/paths";

export interface BackupManifest {
  app: "sonic-os";
  type: "database-backup";
  createdAt: string;
  database: string;
  host: string;
  compressed: boolean;
  files: {
    sql?: string;
    archive?: string;
    manifest: string;
  };
  sizes: {
    sqlBytes?: number;
    archiveBytes?: number;
  };
}

export interface BackupResult {
  basename: string;
  sqlPath?: string;
  archivePath?: string;
  manifestPath: string;
  manifest: BackupManifest;
}

export interface CreateBackupOptions {
  backupDir?: string;
  compress?: boolean;
  pgDumpPath?: string;
  timestamp?: Date;
}

export async function createDatabaseBackup(
  options: CreateBackupOptions = {}
): Promise<BackupResult> {
  const config = getBackupConfig();
  const databaseUrl = requireDatabaseUrl();
  const connection = parseDatabaseUrl(databaseUrl);
  const backupDir = options.backupDir ?? config.backupDir;
  const compress = options.compress ?? config.compress;
  const pgDumpPath = options.pgDumpPath ?? config.pgDumpPath;
  const timestamp = options.timestamp ?? new Date();
  const basename = createBackupBasename(
    sanitizeDatabaseName(connection.database),
    timestamp
  );

  const sqlPath = resolveUniqueBackupPath(backupDir, basename, ".sql");
  await exportDatabaseSql({
    connection,
    outputPath: sqlPath,
    pgDumpPath,
  });

  const actualBasename = path.basename(sqlPath, ".sql");
  const manifestPath = resolveUniqueBackupPath(
    backupDir,
    actualBasename,
    ".manifest.json"
  );

  const manifest: BackupManifest = {
    app: "sonic-os",
    type: "database-backup",
    createdAt: timestamp.toISOString(),
    database: connection.database,
    host: connection.host,
    compressed: compress,
    files: {
      sql: path.basename(sqlPath),
      manifest: path.basename(manifestPath),
    },
    sizes: {
      sqlBytes: getFileSizeBytes(sqlPath),
    },
  };

  let archivePath: string | undefined;

  if (compress) {
    archivePath = resolveUniqueBackupPath(backupDir, actualBasename, ".sql.gz");
    await compressFile(sqlPath, archivePath);
    manifest.files.archive = path.basename(archivePath);
    manifest.sizes.archiveBytes = getFileSizeBytes(archivePath);
    fs.unlinkSync(sqlPath);
    manifest.files.sql = undefined;
    manifest.sizes.sqlBytes = undefined;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    basename,
    sqlPath: compress ? undefined : sqlPath,
    archivePath,
    manifestPath,
    manifest,
  };
}

export interface RestoreBackupOptions {
  inputPath: string;
  psqlPath?: string;
}

export async function restoreDatabaseBackup(
  options: RestoreBackupOptions
): Promise<void> {
  const config = getBackupConfig();
  const databaseUrl = requireDatabaseUrl();
  const connection = parseDatabaseUrl(databaseUrl);
  const { restoreDatabaseSql } = await import("@/lib/backup/restore");

  await restoreDatabaseSql({
    connection,
    inputPath: options.inputPath,
    psqlPath: options.psqlPath ?? config.psqlPath,
  });
}

export async function runScheduledBackup(): Promise<BackupResult> {
  return createDatabaseBackup();
}
