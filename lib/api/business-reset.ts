import { apiGet, apiPost } from "@/lib/api/client";
import type { BusinessResetCategory } from "@/lib/business-reset/categories";

export interface BusinessResetPreviewResponse {
  counts: Record<BusinessResetCategory, number>;
  preserved: {
    users: number;
    roles: number;
    branches: number;
    settings: number;
  };
}

export interface BusinessResetReportResponse {
  requested: BusinessResetCategory[];
  executed: BusinessResetCategory[];
  deleted: Record<BusinessResetCategory, number>;
  preserved: BusinessResetPreviewResponse["preserved"];
}

export async function previewBusinessDataResetApi(): Promise<BusinessResetPreviewResponse> {
  return apiGet<BusinessResetPreviewResponse>("/api/admin/business-reset");
}

export async function resetBusinessDataApi(input: {
  confirmation: string;
  categories: BusinessResetCategory[];
}): Promise<BusinessResetReportResponse> {
  return apiPost<BusinessResetReportResponse>("/api/admin/business-reset", input);
}
