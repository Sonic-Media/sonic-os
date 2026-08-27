import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AuthSession } from "@/types/auth";

export interface ServerAuditContext {
  session: AuthSession;
  module: string;
  action: string;
  recordId?: string;
  detail?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface ServerAuditDefaults {
  userId: string;
  userName: string;
  role: string;
  branch: string;
}

function sessionToDefaults(session: AuthSession): ServerAuditDefaults {
  return {
    userId: session.userId,
    userName: session.displayName,
    role: session.role,
    branch: session.branch,
  };
}

export async function recordServerAudit(
  context: ServerAuditContext
): Promise<void> {
  const defaults = sessionToDefaults(context.session);

  await prisma.auditLogEntry.create({
    data: {
      userId: defaults.userId,
      userName: defaults.userName,
      role: defaults.role,
      branchCode: defaults.branch,
      action: context.action,
      module: context.module,
      recordId: context.recordId ?? null,
      detail: context.detail ?? null,
      oldValues: (context.oldValues ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      newValues: (context.newValues ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}

export function snapshotRecord(
  record: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!record) {
    return null;
  }

  const snapshot: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      snapshot[key] = value.toISOString();
      continue;
    }

    if (value === undefined) {
      continue;
    }

    snapshot[key] = value;
  }

  return snapshot;
}

export async function recordDeleteAudit(
  session: AuthSession,
  module: string,
  recordId: string,
  oldRecord: Record<string, unknown>,
  detail?: string
): Promise<void> {
  await recordServerAudit({
    session,
    module,
    action: "Delete",
    recordId,
    detail,
    oldValues: snapshotRecord(oldRecord),
    newValues: { deletedAt: new Date().toISOString() },
  });
}

export async function recordUpdateAudit(
  session: AuthSession,
  module: string,
  recordId: string,
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  detail?: string
): Promise<void> {
  await recordServerAudit({
    session,
    module,
    action: "Update",
    recordId,
    detail,
    oldValues: snapshotRecord(oldRecord),
    newValues: snapshotRecord(newRecord),
  });
}

export async function recordCreateAudit(
  session: AuthSession,
  module: string,
  recordId: string,
  newRecord: Record<string, unknown>,
  detail?: string
): Promise<void> {
  await recordServerAudit({
    session,
    module,
    action: "Create",
    recordId,
    detail,
    oldValues: null,
    newValues: snapshotRecord(newRecord),
  });
}
