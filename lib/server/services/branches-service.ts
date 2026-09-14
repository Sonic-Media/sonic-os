import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { ApiError } from "@/lib/api/errors";
import { clearBranchLookupCache } from "@/lib/server/branch-lookup";
import { reconcileDuplicateSalaamaBranches } from "@/lib/server/branch-reconcile";
import { prisma } from "@/lib/db";
import { mapBranchToEntity } from "@/lib/server/mappers/branch";
import {
  branchInputSchema,
  branchUpdateSchema,
} from "@/lib/validation/branch";
import type { BranchEntity } from "@/types/branch";

function sortBranches(branches: BranchEntity[]): BranchEntity[] {
  return [...branches].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export async function listBranches(): Promise<BranchEntity[]> {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  });

  return branches.map(mapBranchToEntity);
}

export async function createBranch(input: unknown): Promise<BranchEntity> {
  const parsed = branchInputSchema.parse(input);
  const code = parsed.code.toLowerCase();

  const existing = await prisma.branch.findFirst({
    where: { code: { in: getEquivalentBranchCodes(code) }, active: true },
  });
  if (existing) {
    throw new ApiError("A branch with this code already exists.", {
      status: 409,
      code: "duplicate_branch_code",
    });
  }

  const branch = await prisma.branch.create({
    data: {
      name: parsed.name.trim(),
      code,
      address: parsed.address?.trim() || null,
      phone: parsed.phone?.trim() || null,
      manager: parsed.manager?.trim() || null,
      active: true,
    },
  });

  clearBranchLookupCache();
  return mapBranchToEntity(branch);
}

export async function updateBranch(
  id: string,
  input: unknown
): Promise<BranchEntity> {
  const parsed = branchUpdateSchema.parse(input);
  const code = parsed.code.toLowerCase();

  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Branch not found.", { status: 404, code: "not_found" });
  }

  await reconcileDuplicateSalaamaBranches();

  const duplicate = await prisma.branch.findFirst({
    where: {
      code: { in: getEquivalentBranchCodes(code) },
      NOT: { id },
      active: true,
    },
  });

  if (duplicate) {
    throw new ApiError("A branch with this code already exists.", {
      status: 409,
      code: "duplicate_branch_code",
    });
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: {
      name: parsed.name.trim(),
      code,
      address: parsed.address?.trim() || null,
      phone: parsed.phone?.trim() || null,
      manager: parsed.manager?.trim() || null,
    },
  });

  clearBranchLookupCache();
  return mapBranchToEntity(branch);
}

export async function setBranchActive(
  id: string,
  active: boolean
): Promise<BranchEntity> {
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Branch not found.", { status: 404, code: "not_found" });
  }

  if (!active) {
    const activeCount = await prisma.branch.count({ where: { active: true } });
    if (activeCount <= 1 && existing.active) {
      throw new ApiError("At least one branch must remain active.", {
        status: 400,
        code: "last_active_branch",
      });
    }
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: { active },
  });

  return mapBranchToEntity(branch);
}

export async function getBranchByCode(code: string): Promise<BranchEntity | null> {
  const branch = await prisma.branch.findUnique({
    where: { code: code.toLowerCase() },
  });

  return branch ? mapBranchToEntity(branch) : null;
}

export function sortBranchEntities(branches: BranchEntity[]): BranchEntity[] {
  return sortBranches(branches);
}
