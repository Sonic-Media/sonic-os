import { ApiError } from "@/lib/api/errors";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { resolveInventoryBranchCode, branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { prisma } from "@/lib/db";
import { ensureApplicationInitialized } from "@/lib/server/bootstrap";
import type { AuthSession } from "@/types/auth";

function normalizeBranchCode(code: string): string {
  return code.trim().toLowerCase();
}

export function assertSessionCanAccessBranchCode(
  session: AuthSession,
  branchCode: string
): void {
  if (session.role === "owner") return;

  if (branchCodesReferToSameInventory(branchCode, session.branch)) {
    return;
  }

  const normalized = normalizeBranchCode(branchCode);
  const homeBranch = normalizeBranchCode(session.branch);

  if (normalized !== homeBranch) {
    throw new ApiError("You can only access your assigned branch.", {
      status: 403,
      code: "branch_forbidden",
    });
  }
}

const branchCodeToId = new Map<string, string>();
const branchIdToCode = new Map<string, string>();

export async function getBranchIdByCode(code: string): Promise<string> {
  await ensureApplicationInitialized();

  const normalized = resolveInventoryBranchCode(code.trim().toLowerCase());
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

export async function getBranchIdForSession(
  session: AuthSession,
  branchCodeOverride?: string | null
): Promise<string> {
  await ensureApplicationInitialized();

  const targetCode = normalizeBranchCode(
    branchCodeOverride?.trim() || session.branch
  );

  assertSessionCanAccessBranchCode(session, targetCode);

  try {
    return await getBranchIdByCode(targetCode);
  } catch {
    // Fall through to user branch lookup below.
  }

  const candidates = [session.branch, DEFAULT_BRANCH_CODE].filter(
    (value): value is string =>
      typeof value === "string" && value.trim() !== ""
  );

  for (const code of candidates) {
    try {
      return await getBranchIdByCode(code);
    } catch {
      // Try the next candidate.
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { branchId: true },
  });

  if (user?.branchId) {
    return user.branchId;
  }

  throw new ApiError("No branch is configured for this account.", {
    status: 503,
    code: "branch_unavailable",
  });
}

export function clearBranchLookupCache() {
  branchCodeToId.clear();
  branchIdToCode.clear();
}
