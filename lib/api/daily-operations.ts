import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type { Entry } from "@/types";

export async function fetchDailyOperations(): Promise<Entry[]> {
  return apiGet<Entry[]>("/api/daily-operations");
}

export async function upsertDailyOperationApi(entry: Entry): Promise<Entry> {
  return apiPost<Entry>("/api/daily-operations", entry);
}

export async function deleteDailyOperationApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/daily-operations/${id}`);
}

export async function importDailyOperationsApi(
  entries: Entry[]
): Promise<Entry[]> {
  return apiPost<Entry[]>("/api/daily-operations/import", { entries });
}

export async function bulkDeleteDailyOperationsApi(
  ids: string[]
): Promise<{ count: number }> {
  return apiPost<{ count: number }>("/api/daily-operations/bulk-delete", {
    ids,
  });
}
