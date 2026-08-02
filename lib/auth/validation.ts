import type {
  AppUser,
  AppUserInput,
  AppUserUpdateInput,
  LoginInput,
  UserRole,
} from "@/types/auth";
import { isStaffRoleId } from "@/lib/staff/roles";

export function hasValidationErrors(
  errors: Record<string, string | undefined>
): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateLoginInput(
  input: LoginInput
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.username.trim()) {
    errors.username = "Username is required.";
  }

  if (!input.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateAppUserInput(
  input: AppUserInput,
  users: AppUser[],
  excludeId?: string
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};
  const username = input.username.trim().toLowerCase();

  if (!username) {
    errors.username = "Username is required.";
  } else if (!/^[a-z0-9._-]+$/.test(username)) {
    errors.username = "Use lowercase letters, numbers, dots, dashes, or underscores.";
  } else if (
    users.some(
      (user) => user.username === username && user.id !== excludeId
    )
  ) {
    errors.username = "Username already exists.";
  }

  if (!input.displayName.trim()) {
    errors.displayName = "Display name is required.";
  }

  if (!input.password.trim()) {
    errors.password = "Password is required.";
  } else if (input.password.trim().length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }

  if (!input.role) {
    errors.role = "Select a role.";
  } else if (input.role === "owner") {
    errors.role = "Owner accounts cannot be created here.";
  }

  return errors;
}

export function validateAppUserUpdateInput(
  input: AppUserUpdateInput,
  existingRole: UserRole
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!input.displayName.trim()) {
    errors.displayName = "Display name is required.";
  }

  if (!input.role) {
    errors.role = "Select a role.";
  } else if (existingRole === "owner" && input.role !== "owner") {
    errors.role = "The owner role cannot be changed.";
  } else if (input.role === "owner" && existingRole !== "owner") {
    errors.role = "Owner accounts cannot be assigned here.";
  }

  return errors;
}

export function validatePasswordReset(
  password: string
): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  if (!password.trim()) {
    errors.password = "Password is required.";
  } else if (password.trim().length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }

  return errors;
}

export function isUserRole(value: unknown): value is UserRole {
  if (value === "owner") return true;
  return isStaffRoleId(value);
}

export function normalizeUserRole(value: unknown): UserRole {
  if (value === "owner") return "owner";
  if (isStaffRoleId(value)) return value;
  if (value === "staff") return "store-attendant";
  if (value === "manager") return "manager";
  if (value === "cashier") return "cashier";
  return "store-attendant";
}
