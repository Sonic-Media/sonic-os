import type { Branch } from "@/types";
import type { StaffRoleId, StaffStatus } from "@/types/staff-role";

export type UserRole = "owner" | StaffRoleId;

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  branch: Branch;
  branchCode: string;
  active: boolean;
  loginEnabled: boolean;
  lastLoginAt: string | null;
  passwordSet: boolean;
  staffId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  branch: Branch;
  staffId?: string;
  locked: boolean;
  loggedInAt: string;
}

export interface AuthAuditRecord {
  id: string;
  userId: string;
  username: string;
  branch: Branch;
  action: string;
  detail: string;
  timestamp: string;
}

export interface AppUserInput {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
  branch: Branch;
  staffId?: string;
}

export interface AppUserUpdateInput {
  displayName: string;
  role: UserRole;
  branch: Branch;
}

export interface AuthValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
  user?: AppUser;
}

export interface LoginInput {
  username: string;
  password: string;
}
