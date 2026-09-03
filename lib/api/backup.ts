import { apiGet, apiPost } from "@/lib/api/client";

export interface BackupRecordSummary {
  id: string;
  createdAt: string;
  trigger: string;
  createdById?: string;
  createdByName?: string;
  manifestPath: string;
  filePath: string;
  fileSizeBytes: number | null;
  compressed: boolean;
  status: string;
  format: "sql" | "json";
  storageType: "filesystem" | "database";
  error?: string;
}

export async function listBackupsApi(): Promise<BackupRecordSummary[]> {
  return apiGet<BackupRecordSummary[]>("/api/admin/backup");
}

export async function triggerBackupApi(): Promise<BackupRecordSummary> {
  return apiPost<BackupRecordSummary>("/api/admin/backup", {});
}
