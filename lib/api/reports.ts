import { apiGet } from "@/lib/api/client";
import type { ReportPeriod, ReportSummary } from "@/types";

export interface FetchReportSummaryOptions {
  period: ReportPeriod;
  branchScope?: string;
  referenceDate?: string;
}

export async function fetchReportSummary(
  periodOrOptions: ReportPeriod | FetchReportSummaryOptions
): Promise<ReportSummary> {
  const options =
    typeof periodOrOptions === "string"
      ? { period: periodOrOptions }
      : periodOrOptions;

  const params = new URLSearchParams({ period: options.period });

  if (options.branchScope) {
    params.set("branch", options.branchScope);
  }

  if (options.referenceDate) {
    params.set("date", options.referenceDate);
  }

  return apiGet<ReportSummary>(`/api/reports/summary?${params.toString()}`);
}
