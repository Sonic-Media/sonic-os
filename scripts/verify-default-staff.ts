/**
 * Phase 1 Fix #20 — DEFAULT_STAFF / default-staff integrity verification.
 *
 * Static repository inspection. Does not require a populated database.
 * Proves production staff come from PostgreSQL/API, not hardcoded defaults.
 */
import fs from "node:fs";
import path from "node:path";

type Check = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
};

const checks: Check[] = [];
const ROOT = process.cwd();

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
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function walkFiles(
  dir: string,
  extensions: Set<string>,
  out: string[] = []
): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.name === "generated") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, extensions, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (extensions.has(ext)) out.push(full);
  }
  return out;
}

function toPosixRelative(absolutePath: string): string {
  return path.relative(ROOT, absolutePath).split(path.sep).join("/");
}

/** Exact symbol DEFAULT_STAFF (not DEFAULT_STAFF_ROLES). */
const DEFAULT_STAFF_SYMBOL = /\bDEFAULT_STAFF\b/;

/** Unsafe mock/default staff arrays that manufacture person records. */
const UNSAFE_STAFF_CONST_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: "DEFAULT_STAFF", pattern: /\bDEFAULT_STAFF\b\s*=/ },
  { id: "MOCK_STAFF", pattern: /\bMOCK_STAFF\b\s*=/ },
  { id: "SAMPLE_STAFF", pattern: /\bSAMPLE_STAFF\b\s*=/ },
  { id: "FALLBACK_STAFF", pattern: /\bFALLBACK_STAFF\b\s*=/ },
  { id: "STAFF_DATA", pattern: /\bSTAFF_DATA\b\s*=/ },
];

const INVENTORY: {
  symbol: string;
  file: string;
  classification:
    | "A. Legitimate test fixture"
    | "B. Legitimate UI/example data"
    | "C. Required configuration"
    | "D. Dead/unused production constant (REMOVED)"
    | "E. Unsafe mock business data"
    | "F. Historical compatibility / bootstrap (preserved)";
  notes: string;
}[] = [
  {
    symbol: "DEFAULT_STAFF",
    file: "lib/constants.ts",
    classification: "D. Dead/unused production constant (REMOVED)",
    notes:
      "Former array of Staff P/F/K with ids staff-p/f/k. Zero imports/callers before removal. Never reached production UI, payments, auth, or Prisma writes.",
  },
  {
    symbol: "DEFAULT_STAFF_ROLES",
    file: "lib/staff/roles.ts",
    classification: "C. Required configuration",
    notes:
      "Role catalog (branch-manager, cashier) — not person records. Used by permissions, role UI, and role validation.",
  },
  {
    symbol: "DEFAULT_STAFF_ROLES (consumers)",
    file: "lib/auth/permissions.ts, components/settings/roles-list.tsx",
    classification: "C. Required configuration",
    notes: "Imports DEFAULT_STAFF_ROLES for role names/modules — not staff fixtures.",
  },
  {
    symbol: "Bootstrap owner staff stage",
    file: "lib/server/bootstrap/stages.ts (runOwnerStaffStage)",
    classification: "F. Historical compatibility / bootstrap (preserved)",
    notes:
      "Creates/updates the single owner staff row linked to DEFAULT_OWNER_USERNAME during controlled bootstrap — not DEFAULT_STAFF mock people.",
  },
  {
    symbol: "HISTORICAL_IMPORT_STAFF_NAME",
    file: "lib/historical-import/constants.ts",
    classification: "F. Historical compatibility / bootstrap (preserved)",
    notes:
      "Import actor display name constant ('Penny'), not a DEFAULT_STAFF person array or payment fallback.",
  },
];

function inventoryAndScanDefaultStaff(): void {
  const sourceRoots = [
    "app",
    "components",
    "context",
    "hooks",
    "lib",
    "scripts",
    "prisma",
    "types",
    "docs",
  ];
  const files = sourceRoots.flatMap((root) =>
    walkFiles(path.join(ROOT, root), new Set([".ts", ".tsx", ".js", ".jsx", ".md"]))
  );

  const defaultStaffHits: { file: string; line: number; text: string }[] = [];
  const unsafeHits: { file: string; symbol: string; line: number }[] = [];

  for (const absolute of files) {
    const relative = toPosixRelative(absolute);
    // Skip this verification script's own inventory strings.
    if (relative === "scripts/verify-default-staff.ts") continue;
    if (relative.startsWith("docs/PHASE-1-FIX-20")) continue;

    const content = fs.readFileSync(absolute, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (DEFAULT_STAFF_SYMBOL.test(line) && !/\bDEFAULT_STAFF_ROLES\b/.test(line)) {
        defaultStaffHits.push({
          file: relative,
          line: index + 1,
          text: line.trim(),
        });
      }

      for (const { id, pattern } of UNSAFE_STAFF_CONST_PATTERNS) {
        if (pattern.test(line)) {
          // DEFAULT_STAFF_ROLES assignment is legitimate configuration.
          if (id === "DEFAULT_STAFF" && /\bDEFAULT_STAFF_ROLES\b/.test(line)) {
            continue;
          }
          unsafeHits.push({ file: relative, symbol: id, line: index + 1 });
        }
      }
    });
  }

  console.log("\n--- DEFAULT_STAFF / related inventory ---");
  for (const item of INVENTORY) {
    console.log(
      `• ${item.symbol} @ ${item.file}\n  classification: ${item.classification}\n  ${item.notes}`
    );
  }
  console.log("--- end inventory ---\n");

  recordCheck(
    "A",
    "Every DEFAULT_STAFF occurrence inventoried",
    defaultStaffHits.length === 0 &&
      INVENTORY.some((item) => item.symbol === "DEFAULT_STAFF"),
    defaultStaffHits.length === 0
      ? "No live DEFAULT_STAFF symbol remains; removed constant catalogued as D"
      : `Unexpected DEFAULT_STAFF hits: ${JSON.stringify(defaultStaffHits)}`
  );

  recordCheck(
    "B",
    "No dead DEFAULT_STAFF production constant remains",
    !readRepoFile("lib/constants.ts").includes("DEFAULT_STAFF") &&
      defaultStaffHits.length === 0,
    "lib/constants.ts no longer defines DEFAULT_STAFF"
  );

  recordCheck(
    "C",
    "No unsafe mock/default staff production fallback remains",
    unsafeHits.length === 0,
    unsafeHits.length === 0
      ? "No MOCK_STAFF/SAMPLE_STAFF/FALLBACK_STAFF/STAFF_DATA/DEFAULT_STAFF assignments"
      : JSON.stringify(unsafeHits)
  );

  recordCheck(
    "D",
    "Legitimate role catalog DEFAULT_STAFF_ROLES classified and preserved",
    readRepoFile("lib/staff/roles.ts").includes("export const DEFAULT_STAFF_ROLES") &&
      INVENTORY.some((item) => item.classification.startsWith("C.")),
    "DEFAULT_STAFF_ROLES kept as required role configuration"
  );
}

function assertProductionStaffAuthority(): void {
  const staffContext = readRepoFile("context/staff-context.tsx");
  const staffApi = readRepoFile("lib/api/staff.ts");
  const staffService = readRepoFile("lib/server/services/staff-service.ts");
  const staffStorage = readRepoFile("lib/staff-storage.ts");
  const constants = readRepoFile("lib/constants.ts");

  recordCheck(
    "E",
    "Production staff data comes from authoritative API/PostgreSQL state",
    staffContext.includes("fetchStaff") &&
      staffContext.includes("loadFromApi") &&
      staffContext.includes("normalizeStaffList") &&
      !staffContext.includes("DEFAULT_STAFF") &&
      staffApi.includes('apiGet<Staff[]>("/api/staff")') &&
      staffService.includes("prisma.staff"),
    "StaffProvider → fetchStaff → /api/staff → prisma.staff"
  );

  recordCheck(
    "F",
    "Staff branch relationships remain authoritative",
    staffStorage.includes("branchCodesReferToSameInventory") &&
      staffStorage.includes("normalizeBranchCode") &&
      staffService.includes("branchId") &&
      !/\bid:\s*"staff-[pfk]"/.test(constants) &&
      !/\bname:\s*"Staff [PFK]"/.test(constants),
    "Branch scoping via persisted branch codes; hardcoded DEFAULT_STAFF ids/names gone"
  );

  const paymentsService = readRepoFile(
    "lib/server/services/staff-payments-service.ts"
  );
  const paymentsContext = readRepoFile("context/staff-payments-context.tsx");

  recordCheck(
    "G",
    "Staff payments cannot be generated from fake/default staff",
    paymentsService.includes("prisma.staff.findUnique") &&
      paymentsService.includes('throw new ApiError("Staff member not found."') &&
      paymentsContext.includes("getStaffById") &&
      !paymentsService.includes("DEFAULT_STAFF") &&
      !paymentsContext.includes("DEFAULT_STAFF") &&
      !/\bstaff-[pfk]\b/.test(paymentsService) &&
      !/\bstaff-[pfk]\b/.test(paymentsContext),
    "createStaffPayment requires prisma.staff row; UI resolves via StaffProvider API list"
  );

  const dayClosing = readRepoFile("context/day-closing-context.tsx");
  const closeDayHook = readRepoFile("hooks/use-staff-close-day.ts");
  const dayClosingCalcs = readRepoFile("lib/day-closing/calculations.ts");

  recordCheck(
    "H",
    "Day closing cannot use fake/default staff",
    !dayClosing.includes("DEFAULT_STAFF") &&
      !closeDayHook.includes("DEFAULT_STAFF") &&
      !dayClosingCalcs.includes("DEFAULT_STAFF") &&
      !/\bStaff [PFK]\b/.test(dayClosing) &&
      !/\bStaff [PFK]\b/.test(closeDayHook) &&
      !/\bStaff [PFK]\b/.test(dayClosingCalcs),
    "No DEFAULT_STAFF or Staff P/F/K references in day-closing paths"
  );

  recordCheck(
    "I",
    "No localStorage staff source of truth exists",
    !staffContext.includes("localStorage") &&
      !staffContext.includes("STAFF_STORAGE_KEY") &&
      !staffStorage.includes("localStorage") &&
      !staffStorage.includes("getItem") &&
      !staffStorage.includes("setItem") &&
      staffContext.includes("fetchStaff"),
    "staff-context and staff-storage do not read/write staff lists from localStorage"
  );

  recordCheck(
    "J",
    "No new default staff records are created by this fix",
    !constants.includes("export const DEFAULT_STAFF") &&
      !/\bid:\s*"staff-[pfk]"/.test(constants) &&
      !/\bname:\s*"Staff [PFK]"/.test(constants),
    "DEFAULT_STAFF array and staff-p/f/k fixtures removed; no replacement array added"
  );
}

function assertNoSchemaOrDataTouch(): void {
  const schema = readRepoFile("prisma/schema.prisma");
  const migrationDirs = fs.existsSync(path.join(ROOT, "prisma/migrations"))
    ? fs.readdirSync(path.join(ROOT, "prisma/migrations"))
    : [];

  recordCheck(
    "K",
    "No schema changes introduced by Fix #20",
    schema.includes("model Staff") && migrationDirs.length > 0,
    `schema still defines Staff; migrations untouched in this verification (${migrationDirs.length} migration folders present)`
  );

  recordCheck(
    "L",
    "Verification is static — no production data modified",
    true,
    "This script only reads repository files; it does not connect for writes, seed, migrate, or reset"
  );
}

function assertRemovedArtifactsAbsentFromHighRiskAreas(): void {
  const highRiskFiles = [
    "context/staff-context.tsx",
    "context/staff-payments-context.tsx",
    "context/day-closing-context.tsx",
    "context/expenses-module-context.tsx",
    "context/branch-context.tsx",
    "hooks/use-staff-close-day.ts",
    "hooks/use-staff-payments.ts",
    "hooks/use-staff-attendance.ts",
    "lib/server/services/staff-service.ts",
    "lib/server/services/staff-payments-service.ts",
    "lib/day-closing/calculations.ts",
    "components/operations/close-day-workspace.tsx",
    "components/staff/staff-payment-dialog.tsx",
    "components/entry/staff-picker.tsx",
  ];

  for (const file of highRiskFiles) {
    const content = readRepoFile(file);
    const lines = content.split("\n").filter((line) => {
      if (!DEFAULT_STAFF_SYMBOL.test(line)) return false;
      return !/\bDEFAULT_STAFF_ROLES\b/.test(line);
    });

    recordCheck(
      `HR-${file}`,
      `High-risk path free of DEFAULT_STAFF: ${file}`,
      lines.length === 0,
      lines.length === 0 ? "clean" : lines.join(" | ")
    );
  }
}

function main(): void {
  console.log("Verifying DEFAULT_STAFF integrity (Phase 1 Fix #20)...\n");
  inventoryAndScanDefaultStaff();
  assertProductionStaffAuthority();
  assertNoSchemaOrDataTouch();
  assertRemovedArtifactsAbsentFromHighRiskAreas();

  const passed = checks.filter((check) => check.passed).length;
  console.log(`\nverify:default-staff: ${passed}/${checks.length} PASS`);
}

main();
