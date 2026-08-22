import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import type { Branch } from "@/types";

export function resolveBranchDisplayName(
  code: Branch,
  branchEntityName?: string | null
): string {
  const entityName = branchEntityName?.trim();
  if (entityName) return entityName;

  return DEFAULT_APP_SETTINGS.branchNames[code] ?? code;
}
