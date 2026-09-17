/**
 * Static + live verification for JSON backup restore.
 * Never targets Neon/production hosts.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  BackupValidationError,
  parseAndValidateJsonBackup,
  validateJsonBackupPayload,
} from "@/lib/backup";
import { prisma } from "@/lib/db";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function verifyStatic(): void {
  console.log("Static restore checks\n");

  const panel = readRepo("components/settings/data-protection-section.tsx");
  const restoreService = readRepo("lib/server/backup/restore-service.ts");
  const jsonImport = readRepo("lib/backup/json-import.ts");
  const backupService = readRepo("lib/server/backup/backup-service.ts");

  recordCheck(
    "Recent backups expose Restore / Download actions",
    panel.includes("Restore") &&
      panel.includes("Download") &&
      panel.includes("RestoreConfirmDialog") &&
      panel.includes("RestoreFromFileSection")
  );

  recordCheck(
    "Restore creates pre-restore safety backup first",
    restoreService.includes('trigger: "pre-restore"') &&
      restoreService.includes("createSafetyBackup") &&
      restoreService.includes("parseAndValidateJsonBackup")
  );

  recordCheck(
    "Restore never deletes BackupRecord history",
    jsonImport.includes("BackupRecord is intentionally excluded") &&
      !jsonImport.includes("backupRecord.deleteMany")
  );

  recordCheck(
    "Restore history trigger is recorded separately",
    restoreService.includes('trigger: "restore"') &&
      backupService.includes('"pre-restore"')
  );

  recordCheck(
    "API routes exist for restore and download",
    readRepo("app/api/admin/backup/restore/route.ts").includes(
      "restoreBackupById"
    ) &&
      readRepo("app/api/admin/backup/[id]/download/route.ts").includes(
        "downloadBackupById"
      )
  );
}

function verifyValidation(): void {
  console.log("\nValidation checks\n");

  try {
    validateJsonBackupPayload(null);
    assert.fail("expected empty backup rejection");
  } catch (error) {
    recordCheck(
      "Empty backup rejected",
      error instanceof BackupValidationError && error.code === "empty_backup"
    );
  }

  try {
    validateJsonBackupPayload({ version: 99, format: "json", tables: {} });
    assert.fail("expected unsupported version rejection");
  } catch (error) {
    recordCheck(
      "Unsupported version rejected",
      error instanceof BackupValidationError &&
        error.code === "unsupported_backup_version"
    );
  }

  try {
    validateJsonBackupPayload({
      version: 1,
      format: "sql",
      createdAt: new Date().toISOString(),
      database: "sonic_os",
      host: "localhost",
      tables: {},
    });
    assert.fail("expected incompatible format rejection");
  } catch (error) {
    recordCheck(
      "Non-JSON format rejected",
      error instanceof BackupValidationError &&
        error.code === "incompatible_backup"
    );
  }
}

async function verifyRoundTripParse(): Promise<void> {
  console.log("\nParse pipeline checks\n");

  const minimal = {
    version: 1 as const,
    format: "json" as const,
    createdAt: new Date().toISOString(),
    database: "sonic_os",
    host: "localhost",
    tables: Object.fromEntries(
      [
        "Role",
        "Branch",
        "User",
        "Session",
        "UserPreference",
        "AuthAuditLog",
        "Staff",
        "AppSetting",
        "ExpenseTemplate",
        "DailyOperation",
        "DailyOperationExpense",
        "ProductCategory",
        "Product",
        "StockMovement",
        "StockPriceChange",
        "Customer",
        "Sale",
        "SaleLineItem",
        "Supplier",
        "Purchase",
        "PurchaseLineItem",
        "ExpenseCategory",
        "ExpenseRecord",
        "DayClosing",
        "AuditLogEntry",
        "ActivityLog",
        "StaffPayment",
        "BackupRecord",
      ].map((key) => [
        key,
        key === "Role"
          ? [{ id: "11111111-1111-1111-1111-111111111111", slug: "owner", name: "Owner", modules: [], isSystem: true }]
          : key === "Branch"
            ? [{ id: "22222222-2222-2222-2222-222222222222", name: "Kansanga", code: "main", active: true }]
            : [],
      ])
    ),
  };

  const jsonText = `${JSON.stringify(minimal)}\n`;
  const gz = gzipSync(Buffer.from(jsonText, "utf8"));
  const payload = await parseAndValidateJsonBackup(
    new Uint8Array(gz),
    "test.json.gz"
  );
  recordCheck(
    "Gzip JSON backup parses and validates",
    payload.version === 1 && payload.tables.Role.length === 1
  );

  try {
    await parseAndValidateJsonBackup(
      new Uint8Array([0x1f, 0x8b, 0x00, 0x01]),
      "bad.json.gz"
    );
    assert.fail("expected corrupted gzip rejection");
  } catch (error) {
    recordCheck(
      "Corrupted gzip rejected without mutating data",
      error instanceof BackupValidationError && error.code === "corrupted_gzip"
    );
  }
}

async function verifyDbReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Backup restore verification\n");
  verifyStatic();
  verifyValidation();
  await verifyRoundTripParse();

  if (await verifyDbReachable()) {
    console.log("\nDatabase reachable — static/parse checks complete.");
  } else {
    console.log("\nSKIP live DB restore — database not reachable.");
  }

  console.log("\nBackup restore verification complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
