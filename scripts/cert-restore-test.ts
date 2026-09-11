/**
 * Disposable restore certification test — NEVER targets production Neon.
 * Uses local DATABASE_URL host; creates sonic_os_restore_cert if permitted.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { restoreDatabaseBackup } from "@/lib/backup/backup";

const RESTORE_DB = "sonic_os_restore_cert";

async function countTables(): Promise<Record<string, number>> {
  const tables = [
    "branch",
    "product",
    "sale",
    "expenseRecord",
    "staff",
    "staffPayment",
    "dailyOperation",
    "dayClosing",
    "user",
  ] as const;
  const counts: Record<string, number> = {};
  for (const table of tables) {
    counts[table] = await (prisma as Record<string, { count: () => Promise<number> }>)[
      table
    ].count();
  }
  return counts;
}

function parseDbUrl(url: string) {
  const u = new URL(url);
  if (/neon/i.test(url)) {
    throw new Error("Refusing restore certification against Neon/production URL.");
  }
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || "5432",
    database: u.pathname.replace(/^\//, "").split("?")[0] ?? "",
  };
}

function psqlEnv(password: string) {
  return { ...process.env, PGPASSWORD: password };
}

function runPsql(
  conn: ReturnType<typeof parseDbUrl>,
  database: string,
  sql: string
): string {
  const uri = `postgresql://${conn.user}@${conn.host}:${conn.port}/${database}`;
  return execSync(`psql "${uri}" -tAc "${sql}"`, {
    env: psqlEnv(conn.password),
    encoding: "utf8",
  }).trim();
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("BLOCKED — RESTORE VERIFICATION ENVIRONMENT: DATABASE_URL not set");
    process.exit(2);
  }

  const conn = parseDbUrl(databaseUrl);
  if (conn.host !== "localhost" && conn.host !== "127.0.0.1") {
    console.log(
      `BLOCKED — RESTORE VERIFICATION ENVIRONMENT: host ${conn.host} is not local disposable Postgres`
    );
    process.exit(2);
  }

  const beforeCounts = await countTables();
  console.log("Source counts:", JSON.stringify(beforeCounts));

  const backupDir = path.join(process.cwd(), "backups");
  const backups = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".sql.gz"))
    .sort()
    .reverse();
  const latest = backups[0];
  if (!latest) {
    console.log("BLOCKED — RESTORE VERIFICATION ENVIRONMENT: no .sql.gz backup found");
    process.exit(2);
  }
  const backupPath = path.join(backupDir, latest);
  console.log("Using backup:", backupPath);

  try {
    const exists = runPsql(conn, "postgres", `SELECT 1 FROM pg_database WHERE datname='${RESTORE_DB}'`);
    if (exists !== "1") {
      runPsql(conn, "postgres", `CREATE DATABASE ${RESTORE_DB}`);
      console.log(`Created database ${RESTORE_DB}`);
    } else {
      console.log(`Database ${RESTORE_DB} already exists — dropping and recreating`);
      runPsql(conn, "postgres", `DROP DATABASE ${RESTORE_DB} WITH (FORCE)`);
      runPsql(conn, "postgres", `CREATE DATABASE ${RESTORE_DB}`);
    }
  } catch (error) {
    console.log(
      "BLOCKED — RESTORE VERIFICATION ENVIRONMENT:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(2);
  }

  const sourceUrl = databaseUrl;
  const restoreUrl = `postgresql://${conn.user}:${encodeURIComponent(conn.password)}@${conn.host}:${conn.port}/${RESTORE_DB}?schema=public`;
  process.env.DATABASE_URL = restoreUrl;

  await restoreDatabaseBackup({ inputPath: backupPath });
  console.log("Restore completed into", RESTORE_DB);
  const { resetPrismaClientCache, prisma: restorePrisma } = await import("@/lib/db");
  resetPrismaClientCache();
  try {
    const afterCounts: Record<string, number> = {};
    for (const table of Object.keys(beforeCounts)) {
      afterCounts[table] = await (restorePrisma as Record<string, { count: () => Promise<number> }>)[
        table
      ].count();
    }
    console.log("Restored counts:", JSON.stringify(afterCounts));

    const mismatches = Object.keys(beforeCounts).filter(
      (k) => beforeCounts[k] !== afterCounts[k]
    );
    if (mismatches.length > 0) {
      console.log("FAIL — row count mismatch:", mismatches.join(", "));
      process.exit(1);
    }
    console.log("PASS — restore row counts match source for key business tables");
  } finally {
    await restorePrisma.$disconnect();
    process.env.DATABASE_URL = sourceUrl;
    resetPrismaClientCache();
  }
}

main()
  .catch((error) => {
    console.error("FAIL — restore test:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
