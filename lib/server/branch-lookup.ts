import { ApiError } from "@/lib/api/errors";
import { isOwnerRole } from "@/lib/auth/validation";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { resolveInventoryBranchCode, branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { prisma } from "@/lib/db";
import { ensureApplicationInitialized } from "@/lib/server/bootstrap";
import { getActiveBranchPreference } from "@/lib/server/services/auth-service";
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

function cacheBranch(code: string, id: string): void {
  branchCodeToId.set(code, id);
  branchIdToCode.set(id, code);
}

function invalidateBranchCache(code?: string, id?: string): void {
  if (code) {
    const cachedId = branchCodeToId.get(code);
    branchCodeToId.delete(code);
    if (cachedId) {
      branchIdToCode.delete(cachedId);
    }
  }

  if (id) {
    const cachedCode = branchIdToCode.get(id);
    branchIdToCode.delete(id);
    if (cachedCode) {
      branchCodeToId.delete(cachedCode);
    }
  }
}

async function loadActiveBranchIdByCode(code: string): Promise<string> {
  const normalized = resolveInventoryBranchCode(code.trim().toLowerCase());
  const branch = await prisma.branch.findFirst({
    where: { code: normalized, active: true },
    select: { id: true, code: true },
  });

  if (!branch) {
    throw new ApiError(`Branch not found: ${code}`, {
      status: 404,
      code: "branch_not_found",
    });
  }

  cacheBranch(branch.code, branch.id);
  return branch.id;
}

export async function getBranchIdByCode(code: string): Promise<string> {
  await ensureApplicationInitialized();

  const normalized = resolveInventoryBranchCode(code.trim().toLowerCase());
  const cached = branchCodeToId.get(normalized);

  if (cached) {
    const branch = await prisma.branch.findFirst({
      where: { id: cached, active: true },
      select: { id: true, code: true },
    });

    if (branch) {
      cacheBranch(branch.code, branch.id);
      return branch.id;
    }

    invalidateBranchCache(normalized, cached);
  }

  return loadActiveBranchIdByCode(code);
}

export async function getBranchCodeById(id: string): Promise<string> {
  const cached = branchIdToCode.get(id);
  if (cached) {
    const branch = await prisma.branch.findFirst({
      where: { id, active: true },
      select: { id: true, code: true },
    });

    if (branch) {
      cacheBranch(branch.code, branch.id);
      return branch.code;
    }

    invalidateBranchCache(undefined, id);
  }

  const branch = await prisma.branch.findFirst({
    where: { id, active: true },
    select: { code: true },
  });

  if (!branch) {
    throw new ApiError("Branch not found.", {
      status: 404,
      code: "branch_not_found",
    });
  }

  cacheBranch(branch.code, id);
  return branch.code;
}

export async function getBranchIdForSession(
  session: AuthSession,
  branchCodeOverride?: string | null
): Promise<string> {
  await ensureApplicationInitialized();

  const explicitOverride = branchCodeOverride?.trim();
  const targetCode = normalizeBranchCode(
    explicitOverride || session.branch
  );

  assertSessionCanAccessBranchCode(session, targetCode);

  try {
    return await getBranchIdByCode(targetCode);
  } catch (error) {
    if (explicitOverride) {
      throw error;
    }
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
    const branch = await prisma.branch.findFirst({
      where: { id: user.branchId, active: true },
      select: { id: true, code: true },
    });

    if (branch) {
      cacheBranch(branch.code, branch.id);
      return branch.id;
    }
  }

  throw new ApiError("No branch is configured for this account.", {
    status: 503,
    code: "branch_unavailable",
  });
}

/** Resolves the branch for stock writes (opening balance, movements). */
export async function resolveStockBranchIdForSession(
  session: AuthSession,
  branchCode?: string | null
): Promise<string> {
  if (branchCode?.trim()) {
    return getBranchIdForSession(session, branchCode);
  }

  if (isOwnerRole(session.role)) {
    const preferredBranch = await getActiveBranchPreference(session.userId);
    if (preferredBranch) {
      return getBranchIdForSession(session, preferredBranch);
    }
  }

  return getBranchIdForSession(session);
}

export function clearBranchLookupCache() {
  branchCodeToId.clear();
  branchIdToCode.clear();
}
