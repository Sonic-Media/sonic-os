import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";

export { DEFAULT_BRANCH_CODE };

const DEFAULT_CREATED_AT = "2024-01-01T00:00:00.000Z";

export const DEFAULT_BRANCHES: BranchEntity[] = [
  {
    id: "branch-main",
    name: "Kansanga",
    code: "main",
    address: "",
    phone: "",
    manager: "",
    active: true,
    createdAt: DEFAULT_CREATED_AT,
  },
];

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeBranchEntity(value: unknown): BranchEntity | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const code =
    typeof raw.code === "string" ? raw.code.trim().toLowerCase() : "";

  if (!id || !name || !code) return null;

  return {
    id,
    name,
    code,
    address: normalizeOptionalString(raw.address),
    phone: normalizeOptionalString(raw.phone),
    manager: normalizeOptionalString(raw.manager),
    active: raw.active !== false,
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt.trim()
        ? raw.createdAt
        : DEFAULT_CREATED_AT,
  };
}

export function normalizeBranchList(value: unknown): BranchEntity[] {
  if (!Array.isArray(value)) {
    return DEFAULT_BRANCHES.map((branch) => ({ ...branch }));
  }

  const branches = value
    .map(normalizeBranchEntity)
    .filter((branch): branch is BranchEntity => branch !== null);

  return branches.length > 0
    ? branches
    : DEFAULT_BRANCHES.map((branch) => ({ ...branch }));
}

export function sortBranchesByName(branches: BranchEntity[]): BranchEntity[] {
  return [...branches].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function buildBranchLookup(
  branches: BranchEntity[]
): Map<string, BranchEntity> {
  return new Map(branches.map((branch) => [branch.code, branch]));
}

export function normalizeBranchCode(value: unknown): Branch {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }

  return DEFAULT_BRANCH_CODE;
}
