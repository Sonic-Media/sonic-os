import { apiGet } from "@/lib/api/client";
import type { ReportPeriod, ReportSummary } from "@/types";

export async function fetchReportSummary(
  period: ReportPeriod
): Promise<ReportSummary> {
  const params = new URLSearchParams({ period });
  return apiGet<ReportSummary>(`/api/reports/summary?${params.toString()}`);
}
