import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/prisma";
import type { AuthSession } from "@/types/auth";

export async function recordSecurityAudit(
  session: AuthSession,
  action: string,
  detail: string
): Promise<void> {
  await prisma.authAuditLog.create({
    data: {
      userId: session.userId,
      username: session.username,
      branchCode: session.branch,
      action,
      detail,
    },
  });
}

export async function recordSecurityAuditInTransaction(
  tx: Prisma.TransactionClient,
  session: AuthSession | null,
  action: string,
  detail: string,
  options?: {
    userId: string;
    username: string;
    branchCode: string;
  }
): Promise<void> {
  const userId = session?.userId ?? options?.userId;
  const username = session?.username ?? options?.username;
  const branchCode = session?.branch ?? options?.branchCode;

  if (!userId || !username || !branchCode) {
    return;
  }

  await tx.authAuditLog.create({
    data: {
      userId,
      username,
      branchCode,
      action,
      detail,
    },
  });
}
