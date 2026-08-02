import type { Prisma } from "@/lib/prisma";
import type { AuthSession } from "@/types/auth";

export async function recordTransactionAudit(
  tx: Prisma.TransactionClient,
  session: AuthSession,
  action: string,
  detail: string
): Promise<void> {
  await tx.authAuditLog.create({
    data: {
      userId: session.userId,
      username: session.username,
      branchCode: session.branch,
      action,
      detail,
    },
  });
}
