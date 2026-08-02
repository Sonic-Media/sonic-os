import { shouldUseApiDataSource } from "@/lib/env";

export async function isApiAvailable(): Promise<boolean> {
  if (!shouldUseApiDataSource()) {
    return false;
  }

  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) return false;

    const payload = (await response.json()) as {
      data?: { databaseConnected?: boolean };
    };

    return Boolean(payload.data?.databaseConnected);
  } catch {
    return false;
  }
}
