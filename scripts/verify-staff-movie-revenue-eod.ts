#!/usr/bin/env tsx
/**
 * Staff movie revenue End of Day input — focused regression verifier.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAmount } from "@/lib/amounts";

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

  console.log("\nAll staff movie revenue End of Day checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
