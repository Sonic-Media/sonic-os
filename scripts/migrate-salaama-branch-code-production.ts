#!/usr/bin/env tsx
/**
 * Production migration: rename Salaama Branch.code branch2 → salaama.
 *
 * Default: audit-only (read-only). Pass --execute to apply the migration.
 * Uses DATABASE_URL unless PRODUCTION_DATABASE_URL is set (production target).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { SALAAMA_BRANCH_CODE, SALAAMA_BRANCH_NAME } from "@/lib/constants";

const EXECUTE = process.argv.includes("--execute");
const ALLOW_LOCAL = process.argv.includes("--allow-local");

function resolveDatabaseUrl(): string {
  const url = process.env.PRODUCTION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL or PRODUCTION_DATABASE_URL is required.");
  }
  return url;
}

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

type BranchSnapshot = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

type DependencyCounts = {
  users: number;
  staff: number;
  dailyOperations: number;
  sales: number;
  purchases: number;
  expenseRecords: number;
  stockMovements: number;
  staffPayments: number;
  dayClosings: number;
  products: number;
};

async function countDependencies(
  prisma: PrismaClient,
  branchId: string
): Promise<DependencyCounts> {
  const [
    users,
    staff,
    dailyOperations,
    sales,
    purchases,
    expenseRecords,
    stockMovements,
    staffPayments,
    dayClosings,
    products,
  ] = await Promise.all([
    prisma.user.count({ where: { branchId } }),
    prisma.staff.count({ where: { branchId } }),
    prisma.dailyOperation.count({ where: { branchId } }),
    prisma.sale.count({ where: { branchId } }),
    prisma.purchase.count({ where: { branchId } }),
    prisma.expenseRecord.count({ where: { branchId } }),
    prisma.stockMovement.count({ where: { branchId } }),
    prisma.staffPayment.count({ where: { branchId } }),
    prisma.dayClosing.count({ where: { branchId } }),
    prisma.product.count({ where: { branchId } }),
  ]);

  return {
    users,
    staff,
    dailyOperations,
    sales,
    purchases,
    expenseRecords,
    stockMovements,
    staffPayments,
    dayClosings,
    products,
  };
}

function printCounts(label: string, counts: DependencyCounts) {
  console.log(`  ${label}:`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`    ${key}: ${value}`);
  }
}

function recordCheck(label: string, pass: boolean, detail = "") {
  const status = pass ? "PASS" : "FAIL";
  console.log(`${status} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) {
    throw new Error(`Check failed: ${label}`);
  }
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  if (isLocalhost(databaseUrl) && !ALLOW_LOCAL) {
    throw new Error(
      "Refusing to run against localhost. Set PRODUCTION_DATABASE_URL or pass --allow-local for dev validation."
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    console.log(
      `Salaama branch code migration (${EXECUTE ? "EXECUTE" : "AUDIT ONLY"})\n`
    );

    const branches = await prisma.branch.findMany({
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true, active: true },
    });

    const kansanga = branches.find((b) => b.code === "main");
    const salaamaByCode = branches.find((b) => b.code === SALAAMA_BRANCH_CODE);
    const branch2 = branches.find((b) => b.code === "branch2");
    const s2 = branches.find((b) => b.code === "s2");

    console.log("Current branches:");
    for (const branch of branches) {
      console.log(
        `  ${branch.name} | ${branch.code} | ${branch.active ? "Active" : "Inactive"} | id=${branch.id}`
      );
    }
    console.log("");

    recordCheck(
      "Kansanga exists with code main and active",
      Boolean(kansanga?.active && kansanga.name === "Kansanga"),
      kansanga ? `${kansanga.code} id=${kansanga.id}` : "missing"
    );

    recordCheck("s2 branch does not exist", !s2, s2 ? `found id=${s2.id}` : "absent");

    if (salaamaByCode && branch2) {
      throw new Error(
        "Both salaama and branch2 codes exist. Reconcile duplicates before migration."
      );
    }

    const salaamaTarget: BranchSnapshot | undefined = branch2 ?? salaamaByCode;
    recordCheck(
      "Salaama branch record identified",
      Boolean(
        salaamaTarget &&
          salaamaTarget.name === SALAAMA_BRANCH_NAME &&
          salaamaTarget.active
      ),
      salaamaTarget
        ? `code=${salaamaTarget.code} id=${salaamaTarget.id}`
        : "missing"
    );

    if (!salaamaTarget) {
      throw new Error("Cannot identify Salaama branch record.");
    }

    if (salaamaByCode && !branch2) {
      recordCheck(
        "Salaama already uses authoritative code salaama",
        salaamaByCode.id === salaamaTarget.id,
        `id=${salaamaByCode.id}`
      );
      console.log("\nMigration not required — authoritative code is already salaama.");
      return;
    }

    recordCheck(
      "No code collision for salaama",
      !salaamaByCode,
      salaamaByCode ? `collision id=${salaamaByCode.id}` : "zero branches with code salaama"
    );

    const beforeCounts = await countDependencies(prisma, salaamaTarget.id);
    const salaamaBranchIdBefore = salaamaTarget.id;

    printCounts("Dependent record counts (before)", beforeCounts);

    if (!EXECUTE) {
      console.log("\nAudit complete. Re-run with --execute to apply migration.");
      console.log(
        `Planned change: UPDATE Branch SET code='${SALAAMA_BRANCH_CODE}' WHERE id='${salaamaBranchIdBefore}'`
      );
      return;
    }

    await prisma.$executeRawUnsafe(`
DO $$
DECLARE
  salaama_branch_id UUID;
  branch2_branch_id UUID;
  salaama_code_count INT;
  branch2_code_count INT;
  kansanga_count INT;
BEGIN
  SELECT COUNT(*) INTO kansanga_count FROM "Branch" WHERE code = 'main' AND active = true;
  IF kansanga_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active Kansanga branch (code=main), found %', kansanga_count;
  END IF;

  SELECT COUNT(*) INTO salaama_code_count FROM "Branch" WHERE code = 'salaama';
  SELECT COUNT(*) INTO branch2_code_count FROM "Branch" WHERE code = 'branch2';

  IF salaama_code_count > 0 AND branch2_code_count > 0 THEN
    RAISE EXCEPTION 'Both salaama and branch2 branch codes exist';
  END IF;

  IF salaama_code_count = 1 AND branch2_code_count = 0 THEN
    RETURN;
  END IF;

  IF branch2_code_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one branch2 record, found %', branch2_code_count;
  END IF;

  SELECT id INTO branch2_branch_id FROM "Branch" WHERE code = 'branch2';

  IF NOT EXISTS (
    SELECT 1 FROM "Branch"
    WHERE id = branch2_branch_id AND lower(name) = lower('Salaama') AND active = true
  ) THEN
    RAISE EXCEPTION 'branch2 record is not the active Salaama branch';
  END IF;

  UPDATE "Branch" SET code = 'salaama', "updatedAt" = CURRENT_TIMESTAMP WHERE id = branch2_branch_id;
END $$;
`);

    const afterBranches = await prisma.branch.findMany({
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true, active: true },
    });

    const salaamaAfter = afterBranches.find((b) => b.code === SALAAMA_BRANCH_CODE);
    const branch2After = afterBranches.find((b) => b.code === "branch2");

    recordCheck(
      "Salaama branch ID unchanged after migration",
      salaamaAfter?.id === salaamaBranchIdBefore,
      `before=${salaamaBranchIdBefore} after=${salaamaAfter?.id ?? "missing"}`
    );

    recordCheck(
      "Salaama code is salaama after migration",
      salaamaAfter?.code === SALAAMA_BRANCH_CODE && salaamaAfter.active,
      salaamaAfter?.code ?? "missing"
    );

    recordCheck("branch2 code no longer exists", !branch2After);

    const afterCounts = await countDependencies(prisma, salaamaBranchIdBefore);
    printCounts("Dependent record counts (after)", afterCounts);

    for (const key of Object.keys(beforeCounts) as (keyof DependencyCounts)[]) {
      recordCheck(
        `Dependent count unchanged: ${key}`,
        beforeCounts[key] === afterCounts[key],
        `${beforeCounts[key]} → ${afterCounts[key]}`
      );
    }

    console.log("\nMigration completed successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
