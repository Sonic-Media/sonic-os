import { apiGet, apiPost } from "@/lib/api/client";
import type {
  BusinessDayWipePreview,
  BusinessDayWipeReport,
  ClosedDayExpenseCorrectionInput,
  FinancialCorrectionRecord,
  FinancialDetailResponse,
} from "@/types/financial-correction";

export async function fetchFinancialCorrections(params: {
  branch?: string;
  date?: string;
  sourceId?: string;
  sourceType?: string;
}): Promise<FinancialCorrectionRecord[]> {
  const search = new URLSearchParams();
  if (params.branch) search.set("branch", params.branch);
  if (params.date) search.set("date", params.date);
  if (params.sourceId) search.set("sourceId", params.sourceId);
  if (params.sourceType) search.set("sourceType", params.sourceType);
  const query = search.toString();
  return apiGet<FinancialCorrectionRecord[]>(
    `/api/admin/financial-corrections${query ? `?${query}` : ""}`
  );
}

export async function correctClosedDayExpenseApi(
  input: ClosedDayExpenseCorrectionInput
) {
  return apiPost<{
    sourceType: string;
    sourceId: string;
    amount: number;
    description: string;
    correction: FinancialCorrectionRecord;
    dayStatus: string;
    openedAt: string | null;
    closedAt: string | null;
  }>("/api/admin/financial-corrections", input);
}

export async function fetchFinancialDetail(params: {
  branch: string;
  date: string;
}): Promise<FinancialDetailResponse> {
  const search = new URLSearchParams({
    branch: params.branch,
    date: params.date,
  });
  return apiGet<FinancialDetailResponse>(
    `/api/admin/financial-detail?${search.toString()}`
  );
}

export async function previewBusinessDayWipeApi(params: {
  branch: string;
  date: string;
}): Promise<BusinessDayWipePreview> {
  const search = new URLSearchParams(params);
  return apiGet<BusinessDayWipePreview>(
    `/api/admin/business-day-wipe?${search.toString()}`
  );
}

export async function wipeBusinessDayApi(input: {
  branch: string;
  date: string;
  confirmation: string;
}): Promise<BusinessDayWipeReport> {
  return apiPost<BusinessDayWipeReport>("/api/admin/business-day-wipe", input);
}
