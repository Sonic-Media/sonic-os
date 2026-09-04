import { ApiError } from "@/lib/api/errors";
import { isOwnerRole } from "@/lib/auth/validation";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import type { AuthSession } from "@/types/auth";

/**
 * Ensures a staff user can only access records in their assigned branch.
 * Owners may access any branch.
 */
export async function assertRecordInSessionBranchScope(
  session: AuthSession,
  branchId: string
): Promise<void> {
  if (isOwnerRole(session.role)) {
    return;
  }

  const filter = await resolveBranchListFilter(session);
  if (!filter.branchId.in.includes(branchId)) {
    throw new ApiError("Record not found.", {
      status: 404,
      code: "not_found",
    });
  }
}
