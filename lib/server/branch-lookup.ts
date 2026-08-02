import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";

const branchCodeToId = new Map<string, string>();
const branchIdToCode = new Map<string, string>();

export async function getBranchIdByCode(code: string): Promise<string> {
  const normalized = code.trim().toLowerCase();
  const cached = branchCodeToId.get(normalized);
  if (cached) return cached;

  const branch = await prisma.branch.findUnique({
    where: { code: normalized },
  });

  if (!branch) {
    throw new ApiError(`Branch not found: ${code}`, {
      status: 404,
      code: "branch_not_found",
    });
  }

  branchCodeToId.set(normalized, branch.id);
  branchIdToCode.set(branch.id, normalized);
  return branch.id;
}

export async function getBranchCodeById(id: string): Promise<string> {
  const cached = branchIdToCode.get(id);
  if (cached) return cached;

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) {
    throw new ApiError("Branch not found.", {
      status: 404,
      code: "branch_not_found",
    });
  }

  branchCodeToId.set(branch.code, branch.id);
  branchIdToCode.set(branch.id, branch.code);
  return branch.code;
}

export function clearBranchLookupCache() {
  branchCodeToId.clear();
  branchIdToCode.clear();
}
