#!/usr/bin/env tsx
/**
 * Read-only audit of Salaama branch identity in the connected database.
 * Does NOT mutate production data.
 */
import { prisma } from "@/lib/db";
import { SALAAMA_BRANCH_CODE, SALAAMA_BRANCH_NAME } from "@/lib/constants";

async function countBranchReferences(branchId: string): Promise<number> {
  const counts = await Promise.all([
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

  return counts.reduce((total, count) => total + count, 0);
}

async function main() {
  const branches = await prisma.branch.findMany({
    where: {
      OR: [
        { code: SALAAMA_BRANCH_CODE },
        { code: "branch2" },
        { name: { equals: SALAAMA_BRANCH_NAME, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("Salaama branch audit (read-only)\n");

  if (branches.length === 0) {
    console.log("No Salaama-related branch records found.");
    return;
  }

  for (const branch of branches) {
    const refs = await countBranchReferences(branch.id);
    console.log(`- id=${branch.id}`);
    console.log(`  name=${branch.name}`);
    console.log(`  code=${branch.code}`);
    console.log(`  active=${branch.active}`);
    console.log(`  relatedRecords=${refs}`);
    console.log("");
  }

  const salaama = branches.find((branch) => branch.code === SALAAMA_BRANCH_CODE);
  const branch2 = branches.find((branch) => branch.code === "branch2");

  console.log("Safety checklist:");
  console.log(`  exactly one Salaama-named branch expected: ${branches.filter((b) => b.name === SALAAMA_BRANCH_NAME).length}`);
  console.log(`  salaama code exists: ${Boolean(salaama)}`);
  console.log(`  branch2 code exists: ${Boolean(branch2)}`);
  console.log(`  duplicate Salaama codes present: ${Boolean(salaama && branch2)}`);

  if (branch2 && !salaama) {
    console.log("\nProduction migration step (manual, when approved):");
    console.log(
      `  UPDATE "Branch" SET code = '${SALAAMA_BRANCH_CODE}' WHERE id = '${branch2.id}';`
    );
    console.log("  (Preserves branch ID and all foreign-key relationships.)");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
