import { apiGet } from "@/lib/api/client";
import type { StaffRoleDefinition } from "@/types/staff-role";

export async function fetchRoles(): Promise<StaffRoleDefinition[]> {
  return apiGet<StaffRoleDefinition[]>("/api/roles");
}
