#!/usr/bin/env tsx
/**
 * Safely delete an empty inactive `s2` branch record from the database.
 *
 * Usage:
 *   tsx scripts/delete-empty-s2-branch-production.ts            # audit only (default)
 *   tsx scripts/delete-empty-s2-branch-production.ts --execute  # delete when deps = 0
 *
 * Production: set PRODUCTION_DATABASE_URL (or DATABASE_URL) to the production Neon URL.
 * Local dev is blocked unless --allow-local is passed.
 */
import "dotenv/config";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const TARGET_CODE = "s2";
const PROTECTED_CODES = new Set(["main", "branch2"]);
/** Dev DBs may use `salaama` while production uses `branch2`. */
const SALAAMA_EQUIVALENT_CODES = new Set(["branch2", "salaama"]);

type DependencyCounts = Record<string, number>;

function recordCheck(label: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function resolveDatabaseUrl(): string {
  return (
    process.env.PRODUCTION_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function classifyTarget(url: string): "production" | "local" | "unknown" {
  if (!url) return "unknown";
  if (/localhost|127\.0\.0\.1/.test(url)) return "local";
  return "production";
}

function createPrisma(databaseUrl: string): PrismaClient {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function countBranchDependencies(
  prisma: PrismaClient,
  branchId: string,
  branchCode: string
): Promise<{ fk: DependencyCounts; stringRefs: DependencyCounts }> {
  const fk: DependencyCounts = {
    users: await prisma.user.count({ where: { branchId } }),
    staff: await prisma.staff.count({ where: { branchId } }),
    dailyOperations: await prisma.dailyOperation.count({ where: { branchId } }),
    sales: await prisma.sale.count({ where: { branchId } }),
    purchases: await prisma.purchase.count({ where: { branchId } }),
    expenseRecords: await prisma.expenseRecord.count({ where: { branchId } }),
    stockMovements: await prisma.stockMovement.count({ where: { branchId } }),
    staffPayments: await prisma.staffPayment.count({ where: { branchId } }),
    dayClosings: await prisma.dayClosing.count({ where: { branchId } }),
    products: await prisma.product.count({ where: { branchId } }),
  };

  const stringRefs: DependencyCounts = {
    auditLogEntriesByBranchCode: await prisma.auditLogEntry.count({
      where: { branchCode },
    }),
    authAuditLogsByBranchCode: await prisma.authAuditLog.count({
      where: { branchCode },
    }),
    userPreferencesActiveBranchCode: await prisma.userPreference.count({
      where: { activeBranchCode: branchCode },
    }),
  };

  return { fk, stringRefs };
}

function sumCounts(counts: DependencyCounts): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

async function listActiveBranches(prisma: PrismaClient) {
  return prisma.branch.findMany({
    orderBy: { code: "asc" },
    select: { id: true, name: true, code: true, active: true },
  });
}

async function main() {
  const execute = process.argv.includes("--execute");
  const allowLocal = process.argv.includes("--allow-local");
  const databaseUrl = resolveDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or PRODUCTION_DATABASE_URL is required.");
  }

  const targetClass = classifyTarget(databaseUrl);
  console.log(`Target database class: ${targetClass}`);
  console.log(`Mode: ${execute ? "EXECUTE DELETE" : "AUDIT ONLY"}\n`);

  if (targetClass === "local" && execute && !allowLocal) {
    throw new Error(
      "Refusing to delete on localhost without --allow-local. Set PRODUCTION_DATABASE_URL for production."
    );
  }

  const prisma = createPrisma(databaseUrl);

  try {
    const branchesBefore = await listActiveBranches(prisma);
    console.log("Branches before:");
    for (const branch of branchesBefore) {
      console.log(
        `  - ${branch.name} (code=${branch.code}, active=${branch.active}, id=${branch.id})`
      );
    }
    console.log("");

    const target = await prisma.branch.findUnique({
      where: { code: TARGET_CODE },
    });

    if (!target) {
      recordCheck(
        `${TARGET_CODE} branch lookup`,
        true,
        "already absent — nothing to delete"
      );

      const main = branchesBefore.find((b) => b.code === "main");
      const salaama = branchesBefore.find((b) =>
        SALAAMA_EQUIVALENT_CODES.has(b.code)
      );
      recordCheck("Kansanga (main) still present", Boolean(main?.active), main?.id ?? "missing");
      recordCheck(
        "Salaama (branch2/salaama) still present",
        Boolean(salaama?.active),
        salaama ? `${salaama.code} id=${salaama.id}` : "missing"
      );
      return;
    }

    recordCheck("Target is s2 only", target.code === TARGET_CODE, `id=${target.id}`);
    recordCheck(
      "Protected branches untouched pre-delete",
      !PROTECTED_CODES.has(target.code),
      target.code
    );

    const { fk, stringRefs } = await countBranchDependencies(
      prisma,
      target.id,
      target.code
    );

    console.log("Foreign-key dependency counts:");
    for (const [key, value] of Object.entries(fk)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log("\nString-reference counts (non-FK, informational):");
    for (const [key, value] of Object.entries(stringRefs)) {
      console.log(`  ${key}: ${value}`);
    }

    const fkTotal = sumCounts(fk);
    console.log(`\nFK dependency total: ${fkTotal}`);

    if (fkTotal > 0) {
      throw new Error(
        `STOP: ${TARGET_CODE} has ${fkTotal} FK-dependent records. Deletion aborted.`
      );
    }

    if (!execute) {
      console.log(
        "\nAudit complete — zero FK dependencies. Re-run with --execute to delete."
      );
      return;
    }

    await prisma.branch.delete({ where: { id: target.id } });
    recordCheck("Deleted s2 branch record", true, `id=${target.id}`);

    const after = await listActiveBranches(prisma);
    const s2After = after.find((b) => b.code === TARGET_CODE);
    const main = after.find((b) => b.code === "main");
    const salaama = after.find((b) => SALAAMA_EQUIVALENT_CODES.has(b.code));

    recordCheck("Post-delete: s2 absent", !s2After);
    recordCheck(
      "Post-delete: Kansanga main active",
      Boolean(main?.active),
      main ? `${main.name} id=${main.id}` : "missing"
    );
    recordCheck(
      "Post-delete: Salaama branch active",
      Boolean(salaama?.active),
      salaama ? `${salaama.name} code=${salaama.code} id=${salaama.id}` : "missing"
    );

    const mainBefore = branchesBefore.find((b) => b.code === "main");
    recordCheck(
      "Protected branch main unchanged",
      Boolean(mainBefore && main) &&
        mainBefore.id === main.id &&
        mainBefore.name === main.name &&
        mainBefore.active === main.active,
      main ? `id=${main.id}` : "missing"
    );

    const salaamaBefore = branchesBefore.find((b) =>
      SALAAMA_EQUIVALENT_CODES.has(b.code)
    );
    recordCheck(
      "Protected Salaama branch unchanged",
      Boolean(salaamaBefore && salaama) &&
        salaamaBefore.id === salaama.id &&
        salaamaBefore.name === salaama.name &&
        salaamaBefore.active === salaama.active,
      salaama ? `code=${salaama.code} id=${salaama.id}` : "missing"
    );

    if (!allowLocal && !after.some((b) => b.code === "branch2")) {
      recordCheck(
        "Production requires authoritative Salaama code branch2",
        false,
        "branch2 record missing (production DB expected)"
      );
    }

    console.log("\nDeletion and post-delete verification succeeded.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
