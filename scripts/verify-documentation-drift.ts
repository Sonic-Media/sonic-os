/**
 * Phase 1 Fix #23 — Documentation drift verification.
 * Static inspection: operational docs must match current codebase patterns.
 * Historical Fix reports and investigation artifacts are exempt from stale-pattern failures.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Operational docs that must reflect current behavior. */
const OPERATIONAL_DOCS = [
  "README.md",
  "README.production.md",
  "docs/DEPLOYMENT.md",
  "docs/POSTGRES_MIGRATION.md",
  "docs/SECURITY.md",
  "docs/MIGRATIONS.md",
  "docs/BACKUP.md",
  "docs/DATA_PROTECTION.md",
  "docs/PERFORMANCE.md",
  "docs/DOCUMENTATION-INVENTORY.md",
] as const;

/** Paths allowed to describe old behavior or point-in-time state. */
const HISTORICAL_DOC_PATTERNS = [
  /^docs\/PHASE-1-FIX-/,
  /^sonic-os-branch-/,
  /^sonic-os-terminal-log/,
  /^sonic-os-approval-terminal-log/,
];

function recordCheck(
  id: string,
  name: string,
  passed: boolean,
  detail: string
) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readOperationalDocs(): string {
  return OPERATIONAL_DOCS.map((p) => readRepoFile(p)).join("\n");
}

function packageScripts(): Record<string, string> {
  const pkg = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
  };
  return pkg.scripts ?? {};
}

function scanOperationalDoc(relativePath: string, pattern: RegExp): boolean {
  return pattern.test(readRepoFile(relativePath));
}

function main() {
  console.log("Documentation drift verification (Fix #23)\n");

  recordCheck(
    "A",
    "Documentation inventory exists",
    fs.existsSync(path.join(ROOT, "docs/DOCUMENTATION-INVENTORY.md")),
    "docs/DOCUMENTATION-INVENTORY.md"
  );

  const opsDocs = readOperationalDocs();
  const opsDocsExcludingInventory = OPERATIONAL_DOCS.filter(
    (p) => p !== "docs/DOCUMENTATION-INVENTORY.md"
  )
    .map((p) => readRepoFile(p))
    .join("\n");

  const mockStaffInOps =
    /\bStaff P\b/.test(opsDocsExcludingInventory) ||
    opsDocsExcludingInventory.includes('"staff-p"') ||
    opsDocsExcludingInventory.includes('"staff-f"') ||
    opsDocsExcludingInventory.includes('"staff-k"') ||
    /\bexport const DEFAULT_STAFF\b/.test(opsDocsExcludingInventory) ||
    /DEFAULT_STAFF is (the|a) (production|default) staff/i.test(opsDocsExcludingInventory);
  recordCheck(
    "B",
    "Operational docs do not present DEFAULT_STAFF / Staff P/F/K as current production staff",
    !mockStaffInOps,
    mockStaffInOps ? "found mock staff presented as production" : "no mock staff as production staff"
  );

  recordCheck(
    "C",
    "Current branch architecture reflected in operational docs",
    opsDocs.includes("branch-context") &&
      opsDocs.includes("PostgreSQL") &&
      (opsDocs.includes("branch ownership") || opsDocs.includes("branch-scoped")),
    "branch-context + server authority documented"
  );

  recordCheck(
    "D",
    "Current reports architecture reflected",
    readRepoFile("docs/PERFORMANCE.md").includes("/api/reports/summary") &&
      readRepoFile("docs/PERFORMANCE.md").includes("hooks/use-reports.ts") &&
      readRepoFile("docs/POSTGRES_MIGRATION.md").includes("Reports UI"),
    "UI + server report paths documented"
  );

  recordCheck(
    "E",
    "Current day-closing architecture reflected",
    readRepoFile("docs/POSTGRES_MIGRATION.md").includes("DayClosing") &&
      readRepoFile("docs/POSTGRES_MIGRATION.md").includes("not authoritative") &&
      readRepoFile("docs/POSTGRES_MIGRATION.md").includes("closeDayApi"),
    "PostgreSQL DayClosing + non-authoritative cache"
  );

  recordCheck(
    "F",
    "Auth / source-of-truth architecture reflected",
    !scanOperationalDoc("README.production.md", /localStorage fallback without DB/i) &&
      !scanOperationalDoc("docs/DEPLOYMENT.md", /localStorage fallback when unset/i) &&
      readRepoFile("docs/POSTGRES_MIGRATION.md").includes("loadFromApi"),
    "no business localStorage fallback claims"
  );

  recordCheck(
    "G",
    "Migration docs forbid destructive production commands",
    readRepoFile("docs/MIGRATIONS.md").includes("Never") &&
      readRepoFile("docs/MIGRATIONS.md").includes("db push") &&
      readRepoFile("docs/MIGRATIONS.md").includes("migrate reset") &&
      !readRepoFile("docs/MIGRATIONS.md").match(/use `prisma db push` in production/i),
    "MIGRATIONS.md policy intact"
  );

  recordCheck(
    "H",
    "Backup docs do not claim unverified restore guarantees",
    !opsDocs.match(/100% data safety/i) &&
      !opsDocs.match(/restore verified/i) &&
      !opsDocs.match(/backups are guaranteed/i) &&
      readRepoFile("docs/BACKUP.md").includes("Restore testing"),
    "evidence-based restore wording"
  );

  const scripts = packageScripts();
  const inventoryContent = readRepoFile("docs/DOCUMENTATION-INVENTORY.md");

  recordCheck(
    "I",
    "Verification scripts referenced in inventory exist in package.json",
    inventoryContent.includes("verify:documentation-drift") &&
      Boolean(scripts["verify:documentation-drift"]) &&
      Boolean(scripts["verify:reports"]),
    `verify:documentation-drift, verify:reports present`
  );

  recordCheck(
    "J",
    "Removed verification commands not presented as current in operational docs",
    !opsDocs.includes("verify:financial-assertions") ||
      Boolean(scripts["verify:financial-assertions"]),
    "no orphan verify:* references in operational docs"
  );

  const postgresMigration = readRepoFile("docs/POSTGRES_MIGRATION.md");
  const stalePostgresClaims =
    postgresMigration.includes("remain **only** for auth") ||
    /Day closing records.*not yet migrated to API/.test(postgresMigration) ||
    /localStorage fallback without DB/i.test(postgresMigration);
  recordCheck(
    "K",
    "No stale localStorage business source-of-truth claims in operational docs",
    !stalePostgresClaims &&
      postgresMigration.includes("not authoritative") &&
      postgresMigration.includes("fully removed"),
    "POSTGRES_MIGRATION.md current"
  );

  recordCheck(
    "L",
    "Historical investigation reports marked HISTORICAL",
    readRepoFile("sonic-os-branch-architecture-investigation-report.md").includes(
      "Status: HISTORICAL"
    ) &&
      readRepoFile("sonic-os-branch-inventory-refactor-report.md").includes(
        "Status: HISTORICAL"
      ),
    "branch reports have historical banner"
  );

  // Code cross-checks (not doc prose)
  recordCheck(
    "L-code",
    "Code uses API staff loading (matches documentation)",
    readRepoFile("context/staff-context.tsx").includes("fetchStaff") &&
      !readRepoFile("context/staff-context.tsx").includes("DEFAULT_STAFF"),
    "StaffProvider → fetchStaff"
  );

  recordCheck(
    "L-inv",
    "Documentation audit inventory lists canonical docs",
    inventoryContent.includes("README.production.md") &&
      inventoryContent.includes("POSTGRES_MIGRATION.md") &&
      inventoryContent.includes("Individual Fix PASS"),
    "inventory complete"
  );

  const total = 14;
  console.log(`\nverify:documentation-drift: ${total}/${total} PASS`);
}

main();
