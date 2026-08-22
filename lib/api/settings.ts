import { apiGet, apiPatch } from "@/lib/api/client";
import type { AppSettings } from "@/types";

export async function fetchSettings(): Promise<AppSettings> {
  return apiGet<AppSettings>("/api/settings");
}

export async function updateSettingsApi(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  return apiPatch<AppSettings>("/api/settings", patch);
}
