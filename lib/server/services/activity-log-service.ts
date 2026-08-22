import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActivityRecord, ActivityType } from "@/lib/activity-log";

const activityInputSchema = z.object({
  type: z.enum(["staff-added", "template-updated", "settings-changed"]),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

function mapActivityLog(record: {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: Date;
}): ActivityRecord {
  return {
    id: record.id,
    type: record.type as ActivityType,
    title: record.title,
    description: record.description,
    timestamp: record.createdAt.toISOString(),
  };
}

export async function listActivityLogs(): Promise<ActivityRecord[]> {
  const records = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return records.map(mapActivityLog);
}

export async function createActivityLog(
  input: unknown
): Promise<ActivityRecord> {
  const parsed = activityInputSchema.parse(input);

  const record = await prisma.activityLog.create({
    data: {
      type: parsed.type,
      title: parsed.title,
      description: parsed.description,
    },
  });

  return mapActivityLog(record);
}
