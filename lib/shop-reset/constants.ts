import {
  DEFAULT_BRANCH_CODE,
  DEFAULT_BRANCH_NAME,
  SALAAMA_BRANCH_CODE,
  SALAAMA_BRANCH_NAME,
} from "@/lib/constants";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import type { Branch } from "@/types";

export const SHOP_RESET_CONFIRM_KANSANGA = "RESET KANSANGA SHOP";
export const SHOP_RESET_CONFIRM_SALAAMA = "RESET SALAAMA SHOP";
export const SHOP_RESET_CONFIRM_BOTH = "RESET BOTH SONIC SHOPS";

export type ShopResetScope = "main" | "salaama" | "both";

export interface ShopResetScopeOption {
  scope: ShopResetScope;
  label: string;
  branchCode: Branch;
  confirmationPhrase: string;
}

export const SHOP_RESET_SCOPE_OPTIONS: ShopResetScopeOption[] = [
  {
    scope: "main",
    label: DEFAULT_BRANCH_NAME,
    branchCode: DEFAULT_BRANCH_CODE,
    confirmationPhrase: SHOP_RESET_CONFIRM_KANSANGA,
  },
  {
    scope: "salaama",
    label: SALAAMA_BRANCH_NAME,
    branchCode: SALAAMA_BRANCH_CODE,
    confirmationPhrase: SHOP_RESET_CONFIRM_SALAAMA,
  },
];

export function resolveShopResetScope(value: string): ShopResetScope {
  const normalized = value.trim().toLowerCase();
  if (normalized === "main" || normalized === "kansanga") {
    return "main";
  }
  if (normalized === "salaama" || normalized === "branch2") {
    return "salaama";
  }
  if (normalized === "both") {
    return "both";
  }
  throw new Error("Invalid shop reset scope.");
}

export function resolveCanonicalBranchCode(scope: Exclude<ShopResetScope, "both">): Branch {
  const option = SHOP_RESET_SCOPE_OPTIONS.find((item) => item.scope === scope);
  if (!option) {
    throw new Error("Invalid shop reset scope.");
  }
  return resolveInventoryBranchCode(option.branchCode);
}

export function getShopResetConfirmationPhrase(scope: ShopResetScope): string {
  if (scope === "both") {
    return SHOP_RESET_CONFIRM_BOTH;
  }

  const option = SHOP_RESET_SCOPE_OPTIONS.find((item) => item.scope === scope);
  if (!option) {
    throw new Error("Invalid shop reset scope.");
  }

  return option.confirmationPhrase;
}

/**
 * Normalize confirmation input before exact phrase comparison.
 * Strips accidental wrapping quotes copied from UI labels like:
 * Type "RESET KANSANGA SHOP" to confirm
 */
export function normalizeShopResetConfirmation(confirmation: string): string {
  const trimmed = confirmation.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'")
    ) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export function assertShopResetConfirmation(
  scope: ShopResetScope,
  confirmation: string
): void {
  const expected = getShopResetConfirmationPhrase(scope);
  if (normalizeShopResetConfirmation(confirmation) !== expected) {
    throw new Error(`Confirmation phrase must be exactly "${expected}".`);
  }
}

/**
 * Pure target-resolution helper for dry-run / regression checks.
 * Returns the branch codes used to look up branch IDs (aliases allowed).
 * Does not touch the database.
 */
export function resolveShopResetLookupCodes(scope: ShopResetScope): Branch[] {
  if (scope === "both") {
    return ["main", "salaama"];
  }
  if (scope === "main") {
    return ["main"];
  }
  // salaama inventory canonical is branch2; lookups accept either alias.
  return [resolveCanonicalBranchCode("salaama")];
}
