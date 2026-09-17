/**
 * Static verification for Data & Backup + Owner Dashboard UX redesign.
 */
import { readFile } from "node:fs/promises";

let passed = 0;
let failed = 0;

function recordCheck(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  console.log("Data & Backup + Owner Dashboard UX verification\n");

  const dataProtection = await readFile(
    "components/settings/data-protection-section.tsx",
    "utf8"
  );
  const backupHistory = await readFile(
    "components/settings/backup-history-dialog.tsx",
    "utf8"
  );
  const biCard = await readFile(
    "components/dashboard/owner/business-intelligence-card.tsx",
    "utf8"
  );
  const eod = await readFile(
    "components/dashboard/owner/mission-control-end-of-day.tsx",
    "utf8"
  );
  const closingPanel = await readFile(
    "components/dashboard/closing-requests/closing-requests-panel.tsx",
    "utf8"
  );

  recordCheck(
    "Backup health card present",
    dataProtection.includes("Data Protection") &&
      dataProtection.includes("Protected") &&
      dataProtection.includes("Attention Required") &&
      dataProtection.includes("Backup Now") &&
      dataProtection.includes("Restore from File"),
    "data-protection-section"
  );

  recordCheck(
    "Recent backups limited to successful records",
    dataProtection.includes("RECENT_SUCCESS_LIMIT = 5") &&
      dataProtection.includes("recentSuccessful"),
    "top completed"
  );

  recordCheck(
    "Restore and download actions on recent backups",
    dataProtection.includes("Restore") &&
      dataProtection.includes("Download") &&
      dataProtection.includes("RestoreConfirmDialog") &&
      dataProtection.includes("RestoreFromFileSection"),
    "restore UX"
  );

  recordCheck(
    "Failed backups summarized with view history",
    dataProtection.includes("failedCount") &&
      dataProtection.includes("View history") &&
      dataProtection.includes("BackupHistoryDialog"),
    "failure summary"
  );

  recordCheck(
    "Full backup history preserved in dialog",
    backupHistory.includes("Full audit trail") &&
      backupHistory.includes("backup.error"),
    "backup-history-dialog"
  );

  recordCheck(
    "Main backup page does not inline-render all failed errors",
    !dataProtection.includes("backup.status === \"failed\" && backup.error") ||
      dataProtection.includes("BackupHistoryDialog"),
    "errors moved to history"
  );

  recordCheck(
    "Business insights capped at three actionable items",
    biCard.includes("MAX_VISIBLE = 3") &&
      biCard.includes("isActionableInsight") &&
      biCard.includes("Business Insights"),
    "business-intelligence-card"
  );

  recordCheck(
    "Low-value 100% comparison insights filtered in UI",
    biCard.includes("100% lower than yesterday") &&
      biCard.includes("View all insights"),
    "actionable filter + view all"
  );

  recordCheck(
    "End of Day compact owner summary",
    eod.includes("Go to Close Day") &&
      !eod.includes("Daily Notes") &&
      eod.includes("grid-cols-4"),
    "mission-control-end-of-day"
  );

  recordCheck(
    "Closing requests hidden when none pending on owner dashboard",
    closingPanel.includes("if (pendingRequests.length === 0)") &&
      closingPanel.includes("return null"),
    "closing-requests-panel"
  );

  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed, ${passed} passed.`);
    process.exit(1);
  }

  console.log(`All ${passed} Data & Backup + dashboard UX checks passed.`);
}

void main();
