import "dotenv/config";

import { describeDatabaseTarget } from "@/lib/server/database-target-guard";
import {
  getSafeTransactionalResetPreview,
  verifySafeTransactionalResetState,
} from "@/lib/server/safe-transactional-reset";

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}`);
  }
}

async function main() {
  const identity = describeDatabaseTarget();
  console.log("Verifying safe transactional reset state...\n");
  console.log(
    `Target: host=${identity.host}, database=${identity.database}, fingerprint=${identity.fingerprint}\n`
  );

  const preview = await getSafeTransactionalResetPreview();
  const verification = await verifySafeTransactionalResetState();

  recordCheck("A", "Users still exist", (preview.preserved.user ?? 0) > 0, `count=${preview.preserved.user ?? 0}`);
  recordCheck("B", "Branches still exist", (preview.preserved.branch ?? 0) > 0, `count=${preview.preserved.branch ?? 0}`);
  recordCheck("C", "Products still exist", (preview.preserved.product ?? 0) > 0, `count=${preview.preserved.product ?? 0}`);
  recordCheck("D", "No sales remain", (preview.transactional.sale ?? 0) === 0, `count=${preview.transactional.sale ?? 0}`);
  recordCheck("E", "No expenses remain", (preview.transactional.expenseRecord ?? 0) === 0, `count=${preview.transactional.expenseRecord ?? 0}`);
  recordCheck("F", "No purchases remain", (preview.transactional.purchase ?? 0) === 0, `count=${preview.transactional.purchase ?? 0}`);
  recordCheck("G", "No staff payments remain", (preview.transactional.staffPayment ?? 0) === 0, `count=${preview.transactional.staffPayment ?? 0}`);
  recordCheck("H", "No daily operations remain", (preview.transactional.dailyOperation ?? 0) === 0, `count=${preview.transactional.dailyOperation ?? 0}`);
  recordCheck("I", "No day closings remain", (preview.transactional.dayClosing ?? 0) === 0, `count=${preview.transactional.dayClosing ?? 0}`);
  recordCheck("J", "No pending closing requests remain", verification.closeRequestedCount === 0, `count=${verification.closeRequestedCount}`);
  recordCheck("K", "No open business days remain", verification.openDayClosingCount === 0, `count=${verification.openDayClosingCount}`);
  recordCheck("L", "No operational audit log rows remain", (preview.transactional.auditLogEntry ?? 0) === 0, `count=${preview.transactional.auditLogEntry ?? 0}`);

  if (!verification.passed) {
    console.error("\nVerification issues:");
    for (const issue of verification.errors) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log("\nSafe transactional reset state verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
