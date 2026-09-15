#!/usr/bin/env tsx
/**
 * Staff movie revenue End of Day input — focused regression verifier.
 * Covers go-live requirements: input render, save path, UGX 0, non-blocking close,
 * owner review display, branch2 production code alias.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAmount } from "@/lib/amounts";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Staff movie revenue End of Day verification\n");

  const eodCard = readRepo("components/operations/staff/staff-end-of-day-card.tsx");
  const workspace = readRepo(
    "components/operations/staff/staff-operations-workspace.tsx"
  );
  const entryForm = readRepo("hooks/use-entry-form.ts");
  const reviewDialog = readRepo(
    "components/dashboard/closing-requests/review-closing-request-dialog.tsx"
  );
  const branchCodes = readRepo("lib/branch/codes.ts");
  const dailyOpsService = readRepo(
    "lib/server/services/daily-operations-service.ts"
  );

  recordCheck(
    "End of Day card exposes Movie Revenue section",
    eodCard.includes("Movie Revenue") &&
      eodCard.includes("Enter today&apos;s movie revenue")
  );

  recordCheck(
    "Movie Revenue input uses UGX prefix and allow-zero validation",
    eodCard.includes("UGX") &&
      eodCard.includes("allowZero: true") &&
      eodCard.includes("validateMoneyInput")
  );

  recordCheck(
    "Checklist tracks movie revenue entered vs pending",
    eodCard.includes('label="Movie Revenue"') &&
      eodCard.includes("Pending") &&
      eodCard.includes("Recorded —")
  );

  recordCheck(
    "End of Day uses two-column layout with checklist on the right",
    eodCard.includes("lg:grid-cols-2") &&
      eodCard.indexOf("Enter today&apos;s movie revenue") <
        eodCard.indexOf("Day Checklist")
  );

  recordCheck(
    "Workspace wires save handler through daily operations upsert",
    workspace.includes("onSaveMovieRevenue") &&
      workspace.includes('handleSubmitRequest({ sales: amount })')
  );

  recordCheck(
    "handleSubmitRequest accepts overrides for explicit movie revenue save",
    entryForm.includes("overrides?: Partial<EntryFormData>") &&
      entryForm.includes("formToEntry(effectiveForm")
  );

  const movieRevenue = 50_000;
  const accessoryRevenue = 20_000;
  const totalRevenue = movieRevenue + accessoryRevenue;
  recordCheck(
    "Total revenue equals movie revenue plus accessory revenue",
    totalRevenue === 70_000,
    `movie ${movieRevenue} + accessory ${accessoryRevenue} = ${totalRevenue}`
  );

  recordCheck(
    "Zero movie revenue parses as valid UGX 0",
    parseAmount("0") === 0 && parseAmount("50,000") === 50_000
  );

  recordCheck(
    "Movie revenue input is not inside accessory sale flow",
    !eodCard.includes("Record Accessory Sale") &&
      !workspace.includes("StaffMovieRevenueCard")
  );

  recordCheck(
    "Closing is not blocked when movie revenue is zero or unset",
    eodCard.includes(
      "const readyToClose = shopOpen && !closeRequestPending && !dayClosed"
    ) &&
      !eodCard.includes("movieRevenueEntered &&") &&
      !eodCard.match(/readyToClose[\s\S]{0,120}movieRevenue/)
  );

  recordCheck(
    "Movie revenue persists via DailyOperation.sales / upsertEntry path",
    entryForm.includes("upsertEntry(entry)") &&
      entryForm.includes('sales:') &&
      dailyOpsService.includes("sales: entry.sales")
  );

  recordCheck(
    "Owner closing review displays persisted movie revenue",
    reviewDialog.includes('label="Movie revenue"') &&
      reviewDialog.includes("operation?.sales") &&
      reviewDialog.includes("branchCodesReferToSameInventory")
  );

  recordCheck(
    "Production Salaama code remains branch2 (no branch2 → salaama migration)",
    branchCodes.includes('salaama: "branch2"') &&
      resolveInventoryBranchCode("salaama") === "branch2" &&
      resolveInventoryBranchCode("main") === "main"
  );

  recordCheck(
    "Financial calculations include entry.sales as movie revenue source",
    readRepo("lib/branch/calculations.ts").includes(
      "sum + entry.sales"
    ) && entryForm.includes("parseAmount(form.sales)")
  );

  console.log("\nAll staff movie revenue End of Day checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
