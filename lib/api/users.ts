import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  AppUser,
  AppUserInput,
  AppUserUpdateInput,
} from "@/types/auth";

export async function fetchUsers(): Promise<AppUser[]> {
  return apiGet<AppUser[]>("/api/users");
}

export async function createUserApi(input: AppUserInput): Promise<AppUser> {
  return apiPost<AppUser>("/api/users", input);
}

export async function updateUserApi(
  id: string,
  input: AppUserUpdateInput
): Promise<AppUser> {
  return apiPatch<AppUser>(`/api/users/${id}`, input);
}

export async function resetUserPasswordApi(
  id: string,
  password: string
): Promise<AppUser> {
  return apiPost<AppUser>(`/api/users/${id}/reset-password`, { password });
}

export async function disableUserApi(id: string): Promise<AppUser> {
  return apiPost<AppUser>(`/api/users/${id}/disable`, {});
}

export async function enableUserApi(id: string): Promise<AppUser> {
  return apiPost<AppUser>(`/api/users/${id}/enable`, {});
}

export async function deleteUserApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/users/${id}`);
}
