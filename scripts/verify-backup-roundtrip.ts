import "dotenv/config";

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDatabaseBackup } from "../lib/backup/backup";
import { parseJsonBackupPayload } from "../lib/backup/json-import";
import { exportDatabaseJson } from "../lib/backup/json-export";
import { restoreDatabaseJson } from "../lib/backup/json-import";
import { parseDatabaseUrl } from "../lib/backup/database-url";
import { prisma } from "../lib/db";

function requireRestoreTestDatabaseUrl(): string {
  const url = process.env.RESTORE_TEST_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Set RESTORE_TEST_DATABASE_URL to a disposable PostgreSQL database before running backup roundtrip verification."
    );
  }

  if (/neon\.tech|vercel/i.test(url)) {
    throw new Error(
      "Refusing to run destructive restore verification against Neon/Vercel production URLs."
    );
  }

  return url;
}

async function withRestoreDatabase<T>(
  databaseUrl: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  try {
    return await fn();
  } finally {
    if (previous) {
      process.env.DATABASE_URL = previous;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
}

async function countBranchRecords(branchCode: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) {
    return { branchCode, products: 0, sales: 0, dailyOps: 0 };
  }

  const [products, sales, dailyOps] = await Promise.all([
    prisma.product.count({ where: { branchId: branch.id, deletedAt: null } }),
    prisma.sale.count({ where: { branchId: branch.id } }),
    prisma.dailyOperation.count({ where: { branchId: branch.id } }),
  ]);

  return { branchCode, products, sales, dailyOps };
}

async function main() {
  const restoreTestUrl = requireRestoreTestDatabaseUrl();
  const sourceUrl = process.env.DATABASE_URL?.trim();

  if (!sourceUrl) {
    throw new Error("DATABASE_URL is required for backup export.");
  }

  if (sourceUrl === restoreTestUrl) {
    throw new Error(
      "RESTORE_TEST_DATABASE_URL must differ from DATABASE_URL."
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonic-os-backup-verify-"));
  const jsonPath = path.join(tmpDir, "roundtrip.json");

  console.log("[verify-backup] Exporting JSON backup from source database...");
  const connection = parseDatabaseUrl(sourceUrl);
  await exportDatabaseJson({ connection, outputPath: jsonPath, timestamp: new Date() });

  const raw = fs.readFileSync(jsonPath, "utf8");
  const payload = parseJsonBackupPayload(raw);

  assert.equal(payload.format, "json");
  assert.ok(payload.tables.Branch?.length >= 2, "Expected at least two branches");
  assert.ok(payload.tables.DailyOperation?.length >= 0);

  const sampleOp = payload.tables.DailyOperation?.[0] as
    | { timestamp?: string | number | bigint }
    | undefined;
  if (sampleOp?.timestamp !== undefined) {
    assert.equal(
      typeof sampleOp.timestamp,
      "string",
      "DailyOperation.timestamp must serialize as string"
    );
  }

  const backupRecord = payload.tables.BackupRecord?.[0] as
    | { payload?: unknown }
    | undefined;
  if (backupRecord) {
    assert.equal(
      backupRecord.payload,
      undefined,
      "BackupRecord.payload must be excluded from JSON export"
    );
  }

  console.log("[verify-backup] Restoring into disposable test database...");
  await withRestoreDatabase(restoreTestUrl, async () => {
    const { inserted } = await restoreDatabaseJson({
      payload,
      clearExisting: true,
    });
    assert.ok(inserted > 0, "Expected rows to be inserted during restore");

    for (const branchCode of ["kansanga", "salaama"]) {
      const counts = await countBranchRecords(branchCode);
      console.log(
        `[verify-backup] ${branchCode}: products=${counts.products}, sales=${counts.sales}, dailyOps=${counts.dailyOps}`
      );
    }

    const sourceKansanga = await (async () => {
      const previous = process.env.DATABASE_URL;
      process.env.DATABASE_URL = sourceUrl;
      try {
        return countBranchRecords("kansanga");
      } finally {
        process.env.DATABASE_URL = previous;
      }
    })();

    const restoredKansanga = await countBranchRecords("kansanga");
    assert.equal(
      restoredKansanga.products,
      sourceKansanga.products,
      "Kansanga product count must match after restore"
    );
    assert.equal(
      restoredKansanga.sales,
      sourceKansanga.sales,
      "Kansanga sale count must match after restore"
    );
    assert.equal(
      restoredKansanga.dailyOps,
      sourceKansanga.dailyOps,
      "Kansanga daily operation count must match after restore"
    );
  });

  console.log("[verify-backup] Creating compressed backup artifact...");
  const backup = await createDatabaseBackup({
    backupDir: tmpDir,
    compress: false,
    engine: "json",
  });
  assert.ok(backup.jsonPath, "Expected JSON backup file path");

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("[verify-backup] Backup roundtrip verification passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "[verify-backup] Verification failed."
  );
  process.exit(1);
});
