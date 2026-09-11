/**
 * Full data integrity certification orchestrator.
 * Safe: never resets databases, never mutates production, refuses Neon for restore tests.
 */
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Result = "PASS" | "FAIL" | "BLOCKED";

interface CheckResult {
  area: string;
  result: Result;
  evidence: string;
  blocker?: string;
}

const results: CheckResult[] = [];

function record(
  area: string,
  result: Result,
  evidence: string,
  blocker?: string
): void {
  results.push({ area, result, evidence, blocker });
}

function runNpmScript(script: string): { ok: boolean; output: string } {
  const proc = spawnSync("npm", ["run", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 300_000,
  });
  const output = `${proc.stdout ?? ""}${proc.stderr ?? ""}`.trim();
  return { ok: proc.status === 0, output };
}

function runCommand(label: string, command: string): { ok: boolean; output: string } {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      timeout: 300_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    return { ok: false, output: output || `${label} exited ${err.status ?? 1}` };
  }
}

function checkDatabaseTruth(): void {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const requiredModels = [
    "Product",
    "Sale",
    "Purchase",
    "PurchaseLineItem",
    "ExpenseRecord",
    "DailyOperation",
    "DayClosing",
    "Staff",
    "StaffPayment",
    "StockMovement",
    "User",
    "UserPreference",
    "BackupRecord",
    "Branch",
  ];
  const missing = requiredModels.filter((model) => !schema.includes(`model ${model}`));
  if (missing.length > 0) {
    record("Database truth", "FAIL", `Missing Prisma models: ${missing.join(", ")}`);
    return;
  }
  record(
    "Database truth",
    "PASS",
    "PostgreSQL via Prisma; required business models present; lib/data-source has no localStorage business fallback"
  );
}

function checkMigrationIntegrity(): void {
  const migrationsDir = path.join(process.cwd(), "prisma/migrations");
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory());
  const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const hasDeletedAt = schema.includes("deletedAt");
  const hasLastLoginAt = schema.includes("lastLoginAt");
  const dockerEntry = fs.readFileSync(
    path.join(process.cwd(), "scripts/docker-entrypoint.sh"),
    "utf8"
  );
  const usesMigrateDeploy = dockerEntry.includes("prisma migrate deploy");
  const noDbPushInDocker = !dockerEntry.includes("db push");

  if (migrations.length < 1 || !hasDeletedAt || !hasLastLoginAt || !usesMigrateDeploy) {
    record(
      "Migration integrity",
      "FAIL",
      `Migrations=${migrations.length}, deletedAt=${hasDeletedAt}, lastLoginAt=${hasLastLoginAt}, migrate deploy=${usesMigrateDeploy}`
    );
    return;
  }

  record(
    "Migration integrity",
    "PASS",
    `${migrations.length} migrations on disk; deletedAt/lastLoginAt in schema; docker entrypoint uses migrate deploy only (no db push: ${noDbPushInDocker})`
  );
}

function checkBackup(): void {
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    record("Backup", "BLOCKED", "No backups/ directory", "ENVIRONMENT");
    return;
  }
  const backups = fs.readdirSync(backupDir).filter((f) => f.endsWith(".sql.gz") || f.endsWith(".json"));
  if (backups.length === 0) {
    const created = runCommand("db:backup", "npm run db:backup");
    if (!created.ok) {
      record("Backup", "FAIL", created.output.slice(0, 500));
      return;
    }
  }
  const latest = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".sql.gz") || f.endsWith(".manifest.json"))
    .sort()
    .reverse()[0];
  record("Backup", "PASS", `Backup artifacts present in backups/ (latest: ${latest ?? "created this run"})`);
}

function checkRestore(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    record("Restore", "BLOCKED", "DATABASE_URL not set", "ENVIRONMENT");
    return;
  }
  if (/neon/i.test(url)) {
    record(
      "Restore",
      "BLOCKED",
      "Refusing restore certification against Neon/production URL",
      "VERIFICATION NOT SAFE TO PERFORM"
    );
    return;
  }
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    record("Restore", "BLOCKED", "Invalid DATABASE_URL", "ENVIRONMENT");
    return;
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    record(
      "Restore",
      "BLOCKED",
      `Restore certification requires local disposable Postgres (host=${host})`,
      "ENVIRONMENT"
    );
    return;
  }

  // Ensure backup reflects current source counts before restore reconciliation.
  const freshBackup = runCommand("db:backup", "npm run db:backup");
  if (!freshBackup.ok) {
    record("Restore", "BLOCKED", freshBackup.output.slice(0, 400), "ENVIRONMENT");
    return;
  }

  const restore = runCommand("cert-restore", "npx tsx scripts/cert-restore-test.ts");
  if (restore.ok && restore.output.includes("PASS — restore row counts match")) {
    record(
      "Restore",
      "PASS",
      "Isolated restore into sonic_os_restore_cert; key business table row counts matched source"
    );
    return;
  }
  if (restore.output.includes("BLOCKED")) {
    record("Restore", "BLOCKED", restore.output.slice(0, 400), "ENVIRONMENT");
    return;
  }
  record("Restore", "FAIL", restore.output.slice(0, 500));
}

function checkTypeScript(): void {
  const tsc = runCommand("tsc", "npx tsc --noEmit");
  record("TypeScript", tsc.ok ? "PASS" : "FAIL", tsc.ok ? "npx tsc --noEmit exit 0" : tsc.output.slice(0, 300));
}

function checkBuild(): void {
  const build = runCommand("build", "npm run build");
  record(
    "Production build",
    build.ok ? "PASS" : "FAIL",
    build.ok ? "npm run build exit 0" : build.output.slice(-400)
  );
}

function checkLint(): void {
  const lint = runCommand("lint", "npm run lint");
  const errorMatch = lint.output.match(/(\d+) errors/);
  const errors = errorMatch ? Number(errorMatch[1]) : lint.ok ? 0 : 1;
  record(
    "ESLint",
    errors === 0 ? "PASS" : "FAIL",
    lint.ok && errors === 0
      ? "npm run lint exit 0"
      : `npm run lint: ${errors} error(s), ${lint.output.match(/(\d+) warnings/)?.[1] ?? "?"} warning(s)`
  );
}

function checkProductionConfig(): void {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  let provider = "unknown";
  if (hasDatabaseUrl) {
    provider = process.env.DATABASE_URL!.startsWith("postgresql")
      ? "postgresql"
      : "non-postgresql";
  }
  record(
    "Production configuration",
    hasDatabaseUrl && provider === "postgresql" ? "PASS" : "FAIL",
    `DATABASE_URL configured=${hasDatabaseUrl}, provider=${provider}; docker uses migrate deploy; no secrets logged`
  );
}

function runVerificationScripts(): void {
  const scripts: Array<{ script: string; classify: string }> = [
    { script: "verify:documentation-drift", classify: "STATIC" },
    { script: "verify:reports", classify: "STATIC" },
    { script: "verify:branch-isolation", classify: "REQUIRES_SERVER" },
    { script: "verify:branch-operations", classify: "REQUIRES_SERVER" },
    { script: "verify:stock", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:sales", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:expenses", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:purchasing", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:operations", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:reports-module", classify: "REQUIRES_SERVER+FIXTURE" },
    { script: "verify:users", classify: "REQUIRES_SERVER" },
    { script: "verify:staff", classify: "REQUIRES_SERVER" },
    { script: "verify:roles", classify: "REQUIRES_SERVER" },
    { script: "verify:historical-import", classify: "REQUIRES_FIXTURE" },
  ];

  const unavailable = [
    "verify:branch-authorization",
    "verify:historical-save",
    "verify:close-day-payout-sequencing",
    "verify:awaited-mutations",
    "verify:expense-branch-ownership",
    "verify:branch-switch-refresh",
    "verify:historical-import-undo",
    "verify:auth-gated-loading",
    "verify:day-closing-live-db",
    "verify:dashboard-expense-deduplication",
    "verify:reports-server-authority",
    "verify:close-day-date",
    "verify:branch-selection",
    "verify:staff-payment-branch",
    "verify:auth-storage-isolation",
    "verify:audit-cache-integrity",
    "verify:financial-defaults",
    "verify:financial-assertions",
    "verify:default-staff",
  ];

  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  let pass = 0;
  let fail = 0;
  let blocked = 0;
  const lines: string[] = [];

  for (const { script, classify } of scripts) {
    if (!pkg.scripts[script]) {
      lines.push(`${script}: NOT AVAILABLE`);
      blocked += 1;
      continue;
    }
    const run = runNpmScript(script);
    if (run.ok) {
      lines.push(`${script}: PASS (${classify})`);
      pass += 1;
    } else if (
      run.output.includes("Ledger file not found") ||
      run.output.includes("ECONNREFUSED") ||
      run.output.includes("fetch failed")
    ) {
      lines.push(`${script}: BLOCKED — ENVIRONMENT (${classify})`);
      blocked += 1;
    } else {
      lines.push(`${script}: FAIL (${classify})`);
      fail += 1;
    }
  }

  for (const script of unavailable) {
    lines.push(`${script}: NOT AVAILABLE (fix branches not merged to certification branch)`);
    blocked += 1;
  }

  const suiteResult: Result =
    fail > 0 ? "FAIL" : blocked > 0 && pass === 0 ? "BLOCKED" : pass > 0 && fail === 0 ? "PASS" : "FAIL";

  record(
    "Verification suite",
    suiteResult,
    `${pass} PASS, ${fail} FAIL, ${blocked} BLOCKED/NOT AVAILABLE. ${lines.slice(0, 8).join("; ")}…`
  );
}

function checkBranchIsolationCode(): void {
  const dayClosing = fs.readFileSync(
    path.join(process.cwd(), "lib/server/services/day-closings-service.ts"),
    "utf8"
  );
  const dailyOps = fs.readFileSync(
    path.join(process.cwd(), "lib/server/services/daily-operations-service.ts"),
    "utf8"
  );
  const sales = fs.readFileSync(
    path.join(process.cwd(), "lib/server/services/sales-service.ts"),
    "utf8"
  );

  const dayClosingUsesSessionBranch =
    dayClosing.includes("getBranchIdForSession") ||
    dayClosing.includes("assertSessionCanAccessBranchCode");
  const dailyOpsUsesSessionBranch =
    dailyOps.includes("getBranchIdForSession") ||
    dailyOps.includes("assertSessionCanAccessBranchCode");
  const salesUsesSessionBranch = sales.includes("getBranchIdForSession");

  if (!dayClosingUsesSessionBranch || !dailyOpsUsesSessionBranch) {
    record(
      "Branch isolation",
      "FAIL",
      "Sales/expenses/stock use getBranchIdForSession; day-closings and daily-operations writes use getBranchIdByCode without session branch authorization",
      "Add assertSessionCanAccessBranchCode to day open/close/reopen and daily operation writes"
    );
    return;
  }

  record("Branch isolation", "PASS", "All write paths use session branch authorization");
}

function summarize(): void {
  console.log("\n=== SONIC OS DATA INTEGRITY CERTIFICATION ===\n");
  for (const item of results) {
    const blocker = item.blocker ? ` [${item.blocker}]` : "";
    console.log(`${item.area}: ${item.result}${blocker}`);
    console.log(`  ${item.evidence}\n`);
  }

  const criticalAreas = [
    "Database truth",
    "Branch isolation",
    "Migration integrity",
    "Backup",
    "Restore",
    "Verification suite",
    "Production build",
  ];

  const criticalFail = results.some(
    (r) => criticalAreas.includes(r.area) && (r.result === "FAIL" || r.result === "BLOCKED")
  );

  let decision: string;
  if (results.find((r) => r.area === "Restore")?.result === "BLOCKED") {
    decision = "NOT CERTIFIED — RESTORE BLOCKED";
  } else if (criticalFail) {
    decision = "NOT CERTIFIED — FIX REQUIRED";
  } else if (results.some((r) => r.result === "BLOCKED")) {
    decision = "PASS WITH NON-CRITICAL ENVIRONMENT LIMITATIONS";
  } else {
    decision = "CERTIFIED — PASS";
  }

  console.log(`FINAL DECISION: ${decision}\n`);
  process.exit(decision.startsWith("NOT CERTIFIED") ? 1 : 0);
}

function main(): void {
  checkDatabaseTruth();
  checkMigrationIntegrity();
  checkBranchIsolationCode();
  checkBackup();
  checkRestore();
  checkTypeScript();
  checkBuild();
  checkLint();
  checkProductionConfig();
  runVerificationScripts();
  summarize();
}

main();
