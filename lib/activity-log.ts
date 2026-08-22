import { createActivityLogApi } from "@/lib/api/activity-log";

export type ActivityType =
  | "staff-added"
  | "template-updated"
  | "settings-changed";

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

let activityCache: ActivityRecord[] = [];

export function setActivityRecordsCache(records: ActivityRecord[]): void {
  activityCache = records;
}

export function getActivityRecords(): ActivityRecord[] {
  return activityCache;
}

export function recordActivity(
  input: Omit<ActivityRecord, "id" | "timestamp">
): ActivityRecord {
  const record: ActivityRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  void createActivityLogApi(input).catch((error) => {
    console.error("[activity-log] failed to persist entry:", error);
  });

  return record;
}

export async function fetchActivityRecords(): Promise<ActivityRecord[]> {
  const { fetchActivityLogs } = await import("@/lib/api/activity-log");
  return fetchActivityLogs();
}
