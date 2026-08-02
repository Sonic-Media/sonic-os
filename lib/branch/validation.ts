import type { BranchEntity, BranchInput } from "@/types/branch";

export function hasValidationErrors(
  errors: Record<string, string | undefined>
): boolean {
  return Object.values(errors).some(Boolean);
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function validateBranchInput(
  input: BranchInput,
  branches: BranchEntity[],
  excludeId?: string
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};
  const name = input.name.trim();
  const code = normalizeCode(input.code);

  if (!name) {
    errors.name = "Branch name is required.";
  }

  if (!code) {
    errors.code = "Branch code is required.";
  } else if (!/^[a-z0-9-]+$/.test(code)) {
    errors.code = "Code must use lowercase letters, numbers, or hyphens.";
  } else if (
    branches.some(
      (branch) => branch.code === code && branch.id !== excludeId
    )
  ) {
    errors.code = "A branch with this code already exists.";
  }

  return errors;
}
