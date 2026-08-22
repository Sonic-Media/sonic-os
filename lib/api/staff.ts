import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { Staff } from "@/types";
import type { StaffInput } from "@/types/staff-role";

export type StaffUpdateInput = Partial<
  Omit<Staff, "id" | "userId">
>;

export async function fetchStaff(): Promise<Staff[]> {
  return apiGet<Staff[]>("/api/staff");
}

export async function fetchLinkedStaffMe(): Promise<Staff> {
  return apiGet<Staff>("/api/staff/me");
}

export async function createStaffApi(input: StaffInput): Promise<Staff> {
  return apiPost<Staff>("/api/staff", input);
}

export async function updateStaffApi(
  id: string,
  input: StaffUpdateInput
): Promise<Staff> {
  return apiPatch<Staff>(`/api/staff/${id}`, input);
}

export async function deleteStaffApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/staff/${id}`);
}

export async function linkStaffUserApi(
  id: string,
  input: { userId: string; username?: string }
): Promise<Staff> {
  return apiPost<Staff>(`/api/staff/${id}/link-user`, input);
}

export async function unlinkStaffUserApi(id: string): Promise<Staff> {
  return apiPost<Staff>(`/api/staff/${id}/unlink-user`, {});
}
