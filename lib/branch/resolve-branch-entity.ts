import { resolveBranchDisplayName } from "@/lib/branch/display-name";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";
import type { AuthSession } from "@/types/auth";

/**
 * Minimal branch row for client-side metrics when the full branches catalog
 * is unavailable (e.g. cashier role cannot GET /api/branches).
 * Close-day calculations only need branch.code for scoping.
 */
export function buildBranchEntityFallback(
  code: Branch,
  name?: string
): BranchEntity {
  const normalized = resolveInventoryBranchCode(code);
  return {
    id: `code:${normalized}`,
    name: name?.trim() || resolveBranchDisplayName(normalized),
    code: normalized,
    active: true,
    createdAt: new Date(0).toISOString(),
  };
}

export function buildAssignedBranchFallback(session: AuthSession): BranchEntity {
  const code = resolveInventoryBranchCode(session.branch);
  return buildBranchEntityFallback(code);
}

export function resolveBranchEntityForMetrics(
  code: Branch,
  getBranchByCode: (code: Branch) => BranchEntity | undefined,
  getBranchName: (code: Branch) => string
): BranchEntity {
  const normalized = resolveInventoryBranchCode(code);
  return (
    getBranchByCode(normalized) ??
    buildBranchEntityFallback(normalized, getBranchName(normalized))
  );
}
