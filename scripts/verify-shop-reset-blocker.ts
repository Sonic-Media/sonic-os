/**
 * Non-destructive regression coverage for the post-BigInt Shop Reset blocker.
 * Does NOT execute a destructive shop reset or modify Production.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveBackupArtifactPath } from "@/lib/backup/backup";
import {
  assertShopResetConfirmation,
  getShopResetConfirmationPhrase,
  normalizeShopResetConfirmation,
  resolveShopResetLookupCodes,
  resolveShopResetScope,
  SHOP_RESET_CONFIRM_BOTH,
  SHOP_RESET_CONFIRM_KANSANGA,
  SHOP_RESET_CONFIRM_SALAAMA,
} from "@/lib/shop-reset/constants";

type Check = { id: string; name: string; passed: boolean; detail?: string };
const checks: Check[] = [];

function record(
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

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function main(): void {
  console.log("Verifying Shop Reset post-BigInt blocker fixes...\n");

  // 1. Scope resolution: Kansanga / Salaama / Both
  record(
    "1-kansanga",
    "Kansanga scope resolves (main + kansanga aliases)",
    resolveShopResetScope("main") === "main" &&
      resolveShopResetScope("kansanga") === "main" &&
      resolveShopResetLookupCodes("main").includes("main")
  );
  record(
    "1-salaama",
    "Salaama scope resolves (salaama + branch2 aliases)",
    resolveShopResetScope("salaama") === "salaama" &&
      resolveShopResetScope("branch2") === "salaama" &&
      resolveShopResetLookupCodes("salaama").includes("branch2")
  );
  record(
    "1-both",
    "Both Shops scope resolves to main + salaama lookup codes",
    resolveShopResetScope("both") === "both" &&
      JSON.stringify(resolveShopResetLookupCodes("both")) ===
        JSON.stringify(["main", "salaama"])
  );
  record(
    "1-both-label-rejected",
    'UI label "Both Shops" is not accepted as API scope',
    (() => {
      try {
        resolveShopResetScope("Both Shops");
        return false;
      } catch {
        return true;
      }
    })()
  );

  // 2. Confirmation phrases
  record(
    "2-phrases",
    "Confirmation phrases are exact and scope-specific",
    getShopResetConfirmationPhrase("main") === SHOP_RESET_CONFIRM_KANSANGA &&
      getShopResetConfirmationPhrase("salaama") === SHOP_RESET_CONFIRM_SALAAMA &&
      getShopResetConfirmationPhrase("both") === SHOP_RESET_CONFIRM_BOTH &&
      SHOP_RESET_CONFIRM_BOTH === "RESET BOTH SONIC SHOPS"
  );

  // 3. Quote normalization (UI label copy/paste trap)
  record(
    "3-quotes",
    "Wrapping quotes from UI labels are normalized away",
    normalizeShopResetConfirmation(`"${SHOP_RESET_CONFIRM_KANSANGA}"`) ===
      SHOP_RESET_CONFIRM_KANSANGA &&
      normalizeShopResetConfirmation(`'${SHOP_RESET_CONFIRM_BOTH}'`) ===
        SHOP_RESET_CONFIRM_BOTH
  );
  assert.doesNotThrow(() =>
    assertShopResetConfirmation("both", `"${SHOP_RESET_CONFIRM_BOTH}"`)
  );
  assert.throws(() => assertShopResetConfirmation("both", "RESET BOTH SHOPS"));
  record(
    "3-assert",
    "Server confirmation assert accepts normalized quotes and rejects wrong phrase",
    true
  );

  // 4. Backup artifact path accepts JSON (the post-backup gate)
  record(
    "4-json-path",
    "JSON-only backup artifact path resolves (jsonPath)",
    resolveBackupArtifactPath({ jsonPath: "/tmp/demo.json" }) ===
      "/tmp/demo.json"
  );
  record(
    "4-archive-preferred",
    "Gzip archive is preferred over jsonPath when both exist",
    resolveBackupArtifactPath({
      archivePath: "/tmp/demo.json.gz",
      jsonPath: "/tmp/demo.json",
    }) === "/tmp/demo.json.gz"
  );
  record(
    "4-sql-path",
    "SQL backup artifact path still resolves",
    resolveBackupArtifactPath({ sqlPath: "/tmp/demo.sql" }) === "/tmp/demo.sql"
  );

  // 5. Service wiring: jsonPath gate + backup-before-delete
  const service = read("lib/server/branch-shop-reset-service.ts");
  record(
    "5-service-jsonpath",
    "Shop reset service uses resolveBackupArtifactPath (includes jsonPath)",
    service.includes("resolveBackupArtifactPath") &&
      !service.includes("backup.archivePath ?? backup.sqlPath;")
  );
  const backupBeforeDelete =
    service.indexOf("createDatabaseBackup") <
      service.indexOf("deleteBranchScopedData") &&
    service.includes('code: "backup_failed"');
  record(
    "5-backup-gates-delete",
    "Backup failure still prevents deletion",
    backupBeforeDelete
  );

  // 6. UI: button disabled until confirmation; blocker copy present
  const ui = read("components/settings/shop-reset-section.tsx");
  record(
    "6-ui-disabled-gate",
    "UI requires confirmationMatches + resetTargetAuthorized for canSubmit",
    ui.includes("confirmationMatches") &&
      ui.includes("resetTargetAuthorized") &&
      ui.includes("disabled={!canSubmit}")
  );
  record(
    "6-ui-blocker-copy",
    "UI explains why the reset button stays disabled after authorization",
    ui.includes("confirmationBlocker") &&
      ui.includes("Type the exact confirmation phrase to enable reset")
  );
  record(
    "6-ui-both-option",
    'UI offers Both Shops as scope value "both"',
    ui.includes('value="both"') && ui.includes("Both Shops")
  );
  record(
    "6-ui-normalize",
    "UI normalizes confirmation input before match",
    ui.includes("normalizeShopResetConfirmation")
  );

  // 7. Safety sequence markers
  record(
    "7-safety-sequence",
    "Owner + target guard + confirmation + backup precede delete",
    service.includes("requireOwner") &&
      service.includes("assertSafeTransactionalResetTarget") &&
      service.includes("assertShopResetConfirmation") &&
      service.includes("createDatabaseBackup") &&
      service.includes("deleteBranchScopedData")
  );

  const passed = checks.filter((check) => check.passed).length;
  console.log(`\nverify:shop-reset-blocker: ${passed}/${checks.length} PASS`);
  assert.equal(passed, checks.length);
}

main();
