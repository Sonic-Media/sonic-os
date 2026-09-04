import fs from "node:fs";
import path from "node:path";
import { getBackupConfig, requireDatabaseUrl } from "@/lib/backup/config";
import { compressFile, getFileSizeBytes } from "@/lib/backup/compress";
import {
  parseDatabaseUrl,
  sanitizeDatabaseName,
} from "@/lib/backup/database-url";
import { exportDatabaseSql } from "@/lib/backup/export";
import { exportDatabaseJson } from "@/lib/backup/json-export";
import {
  createBackupBasename,
  resolveUniqueBackupPath,
} from "@/lib/backup/paths";
import {
  ensureBackupDirectory,
  resolveBackupEngine,
  resolveRuntimeBackupDir,
  type BackupEngine,
} from "@/lib/backup/runtime";

export interface BackupManifest {
  app: "sonic-os";
  type: "database-backup";
  engine: BackupEngine;
  createdAt: string;
  database: string;
  host: string;
  compressed: boolean;
  files: {
    sql?: string;
    json?: string;
    archive?: string;
    manifest: string;
  };
  sizes: {
    sqlBytes?: number;
    jsonBytes?: number;
    archiveBytes?: number;
  };
}

export interface BackupResult {
  basename: string;
  engine: BackupEngine;
  sqlPath?: string;
  jsonPath?: string;
  archivePath?: string;
  manifestPath: string;
  manifest: BackupManifest;
}

export interface CreateBackupOptions {
  backupDir?: string;
  compress?: boolean;
  pgDumpPath?: string;
  timestamp?: Date;
  engine?: BackupEngine;
}

async function writeManifestAndMaybeCompress(options: {
  backupDir: string;
  actualBasename: string;
  timestamp: Date;
  connection: ReturnType<typeof parseDatabaseUrl>;
  compress: boolean;
  engine: BackupEngine;
  sourcePath: string;
  sourceKind: "sql" | "json";
}): Promise<BackupResult> {
  const manifestPath = resolveUniqueBackupPath(
    options.backupDir,
    options.actualBasename,
    ".manifest.json"
  );

  const manifest: BackupManifest = {
    app: "sonic-os",
    type: "database-backup",
    engine: options.engine,
    createdAt: options.timestamp.toISOString(),
    database: options.connection.database,
    host: options.connection.host,
    compressed: options.compress,
    files: {
      manifest: path.basename(manifestPath),
    },
    sizes: {},
  };

  if (options.sourceKind === "sql") {
    manifest.files.sql = path.basename(options.sourcePath);
    manifest.sizes.sqlBytes = getFileSizeBytes(options.sourcePath);
  } else {
    manifest.files.json = path.basename(options.sourcePath);
    manifest.sizes.jsonBytes = getFileSizeBytes(options.sourcePath);
  }

  let archivePath: string | undefined;
  let sqlPath: string | undefined;
  let jsonPath: string | undefined;

  if (options.compress) {
    const ext = options.sourceKind === "sql" ? ".sql.gz" : ".json.gz";
    archivePath = resolveUniqueBackupPath(
      options.backupDir,
      options.actualBasename,
      ext
    );
    await compressFile(options.sourcePath, archivePath);
    manifest.files.archive = path.basename(archivePath);
    manifest.sizes.archiveBytes = getFileSizeBytes(archivePath);
    fs.unlinkSync(options.sourcePath);
    manifest.files.sql = undefined;
    manifest.files.json = undefined;
    manifest.sizes.sqlBytes = undefined;
    manifest.sizes.jsonBytes = undefined;
  } else if (options.sourceKind === "sql") {
    sqlPath = options.sourcePath;
  } else {
    jsonPath = options.sourcePath;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    basename: options.actualBasename,
    engine: options.engine,
    sqlPath,
    jsonPath,
    archivePath,
    manifestPath,
    manifest,
  };
}

async function createPgDumpBackup(options: {
  backupDir: string;
  compress: boolean;
  pgDumpPath: string;
  timestamp: Date;
  connection: ReturnType<typeof parseDatabaseUrl>;
  basename: string;
}): Promise<BackupResult> {
  const sqlPath = resolveUniqueBackupPath(
    options.backupDir,
    options.basename,
    ".sql"
  );

  await exportDatabaseSql({
    connection: options.connection,
    outputPath: sqlPath,
    pgDumpPath: options.pgDumpPath,
  });

  return writeManifestAndMaybeCompress({
    backupDir: options.backupDir,
    actualBasename: path.basename(sqlPath, ".sql"),
    timestamp: options.timestamp,
    connection: options.connection,
    compress: options.compress,
    engine: "pg_dump",
    sourcePath: sqlPath,
    sourceKind: "sql",
  });
}

async function createJsonBackup(options: {
  backupDir: string;
  compress: boolean;
  timestamp: Date;
  connection: ReturnType<typeof parseDatabaseUrl>;
  basename: string;
}): Promise<BackupResult> {
  const jsonPath = resolveUniqueBackupPath(
    options.backupDir,
    options.basename,
    ".json"
  );

  await exportDatabaseJson({
    connection: options.connection,
    outputPath: jsonPath,
    timestamp: options.timestamp,
  });

  return writeManifestAndMaybeCompress({
    backupDir: options.backupDir,
    actualBasename: path.basename(jsonPath, ".json"),
    timestamp: options.timestamp,
    connection: options.connection,
    compress: options.compress,
    engine: "json",
    sourcePath: jsonPath,
    sourceKind: "json",
  });
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

  ensureBackupDirectory(backupDir);

  const engine =
    options.engine ?? (await resolveBackupEngine(pgDumpPath));

  if (engine === "pg_dump") {
    try {
      return await createPgDumpBackup({
        backupDir,
        compress,
        pgDumpPath,
        timestamp,
        connection,
        basename,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "pg_dump backup failed.";
      console.error("[backup] pg_dump failed, falling back to JSON export:", message);
      return createJsonBackup({
        backupDir,
        compress,
        timestamp,
        connection,
        basename,
      });
    }
  }

  return createJsonBackup({
    backupDir,
    compress,
    timestamp,
    connection,
    basename,
  });
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
  const resolvedInput = path.resolve(options.inputPath);
  const lower = resolvedInput.toLowerCase();

  if (lower.endsWith(".json") || lower.endsWith(".json.gz")) {
    const { decompressToFile } = await import("@/lib/backup/compress");
    const { parseJsonBackupPayload, restoreDatabaseJson } = await import(
      "@/lib/backup/json-import"
    );
    const fs = await import("node:fs");
    const os = await import("node:os");

    let jsonPath = resolvedInput;
    let tempDir: string | undefined;

    if (lower.endsWith(".json.gz")) {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonic-os-restore-"));
      jsonPath = path.join(tempDir, "restore.json");
      await decompressToFile(resolvedInput, jsonPath);
    }

    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      const payload = parseJsonBackupPayload(raw);
      await restoreDatabaseJson({ payload, clearExisting: true });
    } finally {
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    return;
  }

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
