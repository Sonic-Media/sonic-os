import {
  BRANCH_IDS,
  DEFAULT_APP_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from "@/lib/constants";
import { parseAmount } from "@/lib/amounts";
import type { AppSettings, Branch, BranchConfig } from "@/types";

export function buildBranchConfigs(
  branchNames: Record<Branch, string>
): BranchConfig[] {
  return BRANCH_IDS.map((id) => ({
    id,
    name: branchNames[id],
  }));
}

function normalizeBranchNames(
  value: unknown
): Record<Branch, string> {
  const names = { ...DEFAULT_APP_SETTINGS.branchNames };

  if (!value || typeof value !== "object") {
    return names;
  }

  for (const id of BRANCH_IDS) {
    const name = (value as Record<string, unknown>)[id];
    if (typeof name === "string" && name.trim()) {
      names[id] = name.trim();
    }
  }

  return names;
}

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_APP_SETTINGS;
  }

  const raw = value as Record<string, unknown>;

  return {
    businessName:
      typeof raw.businessName === "string" && raw.businessName.trim()
        ? raw.businessName.trim()
        : DEFAULT_APP_SETTINGS.businessName,
    ownerName:
      typeof raw.ownerName === "string" && raw.ownerName.trim()
        ? raw.ownerName.trim()
        : DEFAULT_APP_SETTINGS.ownerName,
    branchNames: normalizeBranchNames(raw.branchNames),
    defaultLunchAmount: Math.max(
      0,
      parseAmount(raw.defaultLunchAmount ?? DEFAULT_APP_SETTINGS.defaultLunchAmount)
    ),
  };
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return normalizeSettings(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
