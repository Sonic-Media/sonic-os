import { ACTIVITY_LOG_STORAGE_KEY } from "@/lib/constants";

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

const MAX_ACTIVITY_RECORDS = 50;

function isActivityRecord(value: unknown): value is ActivityRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as ActivityRecord;
  return (
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    typeof record.timestamp === "string"
  );
}

export function getActivityRecords(): ActivityRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isActivityRecord);
  } catch {
    return [];
  }
}

export function recordActivity(
  input: Omit<ActivityRecord, "id" | "timestamp">
): ActivityRecord {
  const record: ActivityRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  if (typeof window !== "undefined") {
    const next = [record, ...getActivityRecords()].slice(0, MAX_ACTIVITY_RECORDS);
    localStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(next));
  }

  return record;
}

export function clearActivityRecords(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVITY_LOG_STORAGE_KEY);
}
