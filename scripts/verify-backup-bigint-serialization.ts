/**
 * Focused regression coverage for BigInt-safe backup serialization.
 * Does NOT execute a destructive shop reset.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  serializeJsonValue,
  stringifyJsonSafe,
} from "@/lib/backup/json-serialize";

type Check = { id: string; name: string; passed: boolean; detail?: string };

const checks: Check[] = [];

function recordCheck(
  id: string,
  name: string,
  passed: boolean,
  detail = ""
): void {
  checks.push({ id, name, passed, detail });
  console.log(
    `${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`
  );
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function assertBackupStillGatesReset(): void {
  const service = fs.readFileSync(
    path.join(process.cwd(), "lib/server/branch-shop-reset-service.ts"),
    "utf8"
  );

  const backupBeforeDelete =
    service.indexOf("createDatabaseBackup") <
      service.indexOf("deleteBranchScopedData") &&
    service.includes("createDatabaseBackup") &&
    service.includes("Backup failed — shop reset was not started");

  const throwsOnBackupFailure =
    service.includes('code: "backup_failed"') &&
    service.includes("createDatabaseBackup");

  recordCheck(
    "E",
    "Backup failure still prevents Shop Reset deletion",
    backupBeforeDelete && throwsOnBackupFailure,
    "createDatabaseBackup remains before deleteBranchScopedData; backup_failed aborts reset"
  );
}

function main(): void {
  console.log("Verifying BigInt-safe backup serialization...\n");

  // A. Top-level BigInt serializes successfully
  const topLevel = { timestamp: 1735689600000n, label: "ok" };
  const topLevelJson = stringifyJsonSafe(topLevel);
  const topLevelParsed = JSON.parse(topLevelJson) as {
    timestamp: string;
    label: string;
  };
  recordCheck(
    "A",
    "Backup containing BigInt values serializes successfully",
    topLevelParsed.timestamp === "1735689600000" &&
      topLevelParsed.label === "ok" &&
      !topLevelJson.includes("Do not know how to serialize a BigInt"),
    `timestamp=${topLevelParsed.timestamp}`
  );

  // B. Nested BigInt
  const nested = {
    tables: {
      DailyOperation: [{ id: "op-1", timestamp: 9007199254740993n }],
    },
  };
  const nestedParsed = JSON.parse(stringifyJsonSafe(nested)) as {
    tables: { DailyOperation: Array<{ id: string; timestamp: string }> };
  };
  recordCheck(
    "B",
    "Nested BigInt values serialize successfully",
    nestedParsed.tables.DailyOperation[0]?.timestamp === "9007199254740993",
    nestedParsed.tables.DailyOperation[0]?.timestamp
  );

  // C. Arrays containing BigInt
  const arrayPayload = {
    values: [1n, 2n, { nested: 3n }, [4n]],
  };
  const arrayParsed = JSON.parse(stringifyJsonSafe(arrayPayload)) as {
    values: [string, string, { nested: string }, [string]];
  };
  recordCheck(
    "C",
    "Arrays containing BigInt values serialize successfully",
    arrayParsed.values[0] === "1" &&
      arrayParsed.values[1] === "2" &&
      arrayParsed.values[2].nested === "3" &&
      arrayParsed.values[3][0] === "4"
  );

  // D. Precision preserved via string (not Number)
  const huge = 9007199254740993n; // Number.MAX_SAFE_INTEGER + 2
  const asString = serializeJsonValue(huge);
  const unsafeNumber = Number(huge);
  recordCheck(
    "D",
    "BigInt precision preserved by decimal string (not Number)",
    asString === "9007199254740993" &&
      typeof asString === "string" &&
      String(unsafeNumber) !== "9007199254740993",
    `string=${asString} unsafeNumber=${unsafeNumber}`
  );

  // F. Normal JSON-compatible data unchanged
  const normal = {
    name: "Sonic",
    amount: 1500,
    active: true,
    note: null as null,
    tags: ["a", "b"],
  };
  const normalParsed = JSON.parse(stringifyJsonSafe(normal, 2));
  recordCheck(
    "F",
    "Existing backup behavior for normal JSON-compatible data unchanged",
    JSON.stringify(normalParsed) === JSON.stringify(normal)
  );

  // Native JSON.stringify still throws without helper (documents the root cause)
  let nativeThrew = false;
  try {
    JSON.stringify({ timestamp: 1n });
  } catch (error) {
    nativeThrew =
      error instanceof TypeError &&
      String(error.message).includes("BigInt");
  }
  recordCheck(
    "ROOT",
    "Native JSON.stringify still throws on BigInt (root-cause retained)",
    nativeThrew
  );

  // Write a sample backup-shaped payload to disk (proves file write path)
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonic-bigint-backup-"));
  const samplePath = path.join(tempDir, "sample.json");
  const samplePayload = {
    version: 1,
    format: "json",
    tables: {
      DailyOperation: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          timestamp: 1735689600123n,
          sales: 0,
        },
      ],
      BackupRecord: [
        {
          id: "00000000-0000-0000-0000-000000000002",
          fileSizeBytes: 1048576n,
        },
      ],
    },
  };
  fs.writeFileSync(samplePath, `${stringifyJsonSafe(samplePayload, 2)}\n`, "utf8");
  const fromDisk = JSON.parse(fs.readFileSync(samplePath, "utf8")) as {
    tables: {
      DailyOperation: Array<{ timestamp: string }>;
      BackupRecord: Array<{ fileSizeBytes: string }>;
    };
  };
  recordCheck(
    "FILE",
    "Sample JSON backup file writes and reloads BigInt fields as strings",
    fromDisk.tables.DailyOperation[0]?.timestamp === "1735689600123" &&
      fromDisk.tables.BackupRecord[0]?.fileSizeBytes === "1048576",
    samplePath
  );

  assertBackupStillGatesReset();

  // Confirm json-export uses the safe helper
  const exportSource = fs.readFileSync(
    path.join(process.cwd(), "lib/backup/json-export.ts"),
    "utf8"
  );
  recordCheck(
    "WIRE",
    "json-export uses stringifyJsonSafe / serializeJsonValue",
    exportSource.includes("stringifyJsonSafe") &&
      exportSource.includes("serializeJsonValue") &&
      !exportSource.includes("JSON.stringify(payload")
  );

  const passed = checks.filter((check) => check.passed).length;
  console.log(`\nverify:backup-bigint: ${passed}/${checks.length} PASS`);
  assert.equal(passed, checks.length);
}

main();
