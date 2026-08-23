import type { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { AuditLogInput, AuditLogRecord } from "@/types/audit-log";
import type { Branch } from "@/types";

const auditLogInputSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  userName: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1),
  module: z.string().trim().min(1),
  recordId: z.string().trim().optional(),
  detail: z.string().trim().optional(),
  oldValues: z.record(z.string(), z.unknown()).nullable().optional(),
  newValues: z.record(z.string(), z.unknown()).nullable().optional(),
});

function mapAuditLogEntry(record: {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  role: string;
  branchCode: string;
  action: string;
  module: string;
  recordId: string | null;
  detail: string | null;
  oldValues: unknown;
  newValues: unknown;
}): AuditLogRecord {
  return {
    id: record.id,
    timestamp: record.timestamp.toISOString(),
    userId: record.userId,
    userName: record.userName,
    role: record.role,
    branch: record.branchCode as Branch,
    action: record.action,
    module: record.module as AuditLogRecord["module"],
    recordId: record.recordId ?? undefined,
    oldValues:
      record.oldValues &&
      typeof record.oldValues === "object" &&
      !Array.isArray(record.oldValues)
        ? (record.oldValues as Record<string, unknown>)
        : undefined,
    newValues:
      record.newValues &&
      typeof record.newValues === "object" &&
      !Array.isArray(record.newValues)
        ? (record.newValues as Record<string, unknown>)
        : undefined,
  };
}

export async function listAuditLogEntries(): Promise<AuditLogRecord[]> {
  const records = await prisma.auditLogEntry.findMany({
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  return records.map(mapAuditLogEntry);
}

export async function createAuditLogEntry(
  input: unknown,
  sessionDefaults?: {
    userId: string;
    userName: string;
    role: string;
    branch: string;
  }
): Promise<AuditLogRecord> {
  const parsed = auditLogInputSchema.parse(input);

  const userId = parsed.userId ?? sessionDefaults?.userId;
  const userName = parsed.userName ?? sessionDefaults?.userName;
  const role = parsed.role ?? sessionDefaults?.role;
  const branch = parsed.branch ?? sessionDefaults?.branch;

  if (!userId || !userName || !role || !branch) {
    throw new Error("Audit log entry requires user context.");
  }

  const record = await prisma.auditLogEntry.create({
    data: {
      userId,
      userName,
      role,
      branchCode: branch,
      action: parsed.action,
      module: parsed.module,
      recordId: parsed.recordId ?? null,
      detail: parsed.detail ?? null,
      oldValues: (parsed.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
      newValues: (parsed.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  return mapAuditLogEntry(record);
}

export async function listAuditLogEntriesForUser(
  userId: string
): Promise<AuditLogRecord[]> {
  const records = await prisma.auditLogEntry.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  return records.map(mapAuditLogEntry);
}

const ATTENDANCE_ACTIONS = [
  "Start Shift",
  "Clock In",
  "Clock Out",
  "Open Shop",
] as const;

export async function listStaffAttendanceEntries(
  staffId: string,
  date: string
): Promise<AuditLogRecord[]> {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const records = await prisma.auditLogEntry.findMany({
    where: {
      userId: staffId,
      action: { in: [...ATTENDANCE_ACTIONS] },
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { timestamp: "asc" },
  });

  return records.map(mapAuditLogEntry);
}

export type { AuditLogInput };
