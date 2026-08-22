import { apiGet, apiPost } from "@/lib/api/client";
import type { ActivityRecord } from "@/lib/activity-log";

export async function fetchActivityLogs(): Promise<ActivityRecord[]> {
  return apiGet<ActivityRecord[]>("/api/activity-log");
}

export async function createActivityLogApi(
  input: Omit<ActivityRecord, "id" | "timestamp">
): Promise<ActivityRecord> {
  return apiPost<ActivityRecord>("/api/activity-log", input);
}
