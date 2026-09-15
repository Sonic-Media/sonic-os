import { SALAAMA_BRANCH_CODE, SALAAMA_BRANCH_NAME } from "@/lib/constants";
import { prisma } from "@/lib/db";

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

async function deactivateGhostBranch(branchId: string, code: string, name: string) {
  await prisma.branch.update({
    where: { id: branchId },
    data: {
      active: false,
      code: `${code}-inactive-${branchId.slice(0, 8)}`,
      name: `${name} (inactive duplicate)`,
    },
  });
}

/**
 * When bootstrap or a legacy deployment created both `salaama` and `branch2`,
 * keep the branch record that owns related data and deactivate the empty duplicate.
 */
export async function reconcileDuplicateSalaamaBranches(): Promise<void> {
  const salaama = await prisma.branch.findUnique({
    where: { code: SALAAMA_BRANCH_CODE },
    select: { id: true, name: true, code: true },
  });
  const branch2 = await prisma.branch.findUnique({
    where: { code: "branch2" },
    select: { id: true, name: true, code: true },
  });

  if (!salaama || !branch2 || salaama.id === branch2.id) {
    return;
  }

  const [salaamaRefs, branch2Refs] = await Promise.all([
    countBranchReferences(salaama.id),
    countBranchReferences(branch2.id),
  ]);

  const ghost =
    branch2Refs >= salaamaRefs
      ? salaama
      : branch2;
  const keeper =
    branch2Refs >= salaamaRefs
      ? branch2
      : salaama;

  await deactivateGhostBranch(ghost.id, ghost.code, ghost.name);

  await prisma.branch.update({
    where: { id: keeper.id },
    data: {
      name: SALAAMA_BRANCH_NAME,
      active: true,
    },
  });
}
