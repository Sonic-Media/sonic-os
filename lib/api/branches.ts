import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { BranchEntity, BranchInput, BranchUpdateInput } from "@/types/branch";

export async function fetchBranches(): Promise<BranchEntity[]> {
  return apiGet<BranchEntity[]>("/api/branches");
}

export async function createBranchApi(input: BranchInput): Promise<BranchEntity> {
  return apiPost<BranchEntity>("/api/branches", input);
}

export async function updateBranchApi(
  id: string,
  input: BranchUpdateInput
): Promise<BranchEntity> {
  return apiPatch<BranchEntity>(`/api/branches/${id}`, input);
}

export async function setBranchActiveApi(
  id: string,
  active: boolean
): Promise<BranchEntity> {
  return apiPatch<BranchEntity>(`/api/branches/${id}`, { active });
}
