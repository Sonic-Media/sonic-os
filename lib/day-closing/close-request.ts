import type { DayClosingSummary } from "@/types/day-closing";

export interface CloseRequestInfo {
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
}

export type DayClosingSummaryWithRequest = DayClosingSummary & {
  closeRequest?: CloseRequestInfo;
};

export function withCloseRequest(
  summary: DayClosingSummary,
  request: CloseRequestInfo
): DayClosingSummaryWithRequest {
  return {
    ...summary,
    closeRequest: request,
  };
}

export function readCloseRequest(
  summary: DayClosingSummary | unknown
): CloseRequestInfo | undefined {
  if (!summary || typeof summary !== "object") {
    return undefined;
  }

  const closeRequest = (summary as DayClosingSummaryWithRequest).closeRequest;
  if (!closeRequest || typeof closeRequest !== "object") {
    return undefined;
  }

  return closeRequest;
}
