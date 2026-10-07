import type { DayClosingSummary } from "@/types/day-closing";

export interface CloseRequestInfo {
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
}

export interface CloseRequestRejection {
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  reason: string;
}

export type DayClosingSummaryWithRequest = DayClosingSummary & {
  closeRequest?: CloseRequestInfo;
  rejection?: CloseRequestRejection;
  rejectionHistory?: CloseRequestRejection[];
};

export function withCloseRequest(
  summary: DayClosingSummary | DayClosingSummaryWithRequest,
  request: CloseRequestInfo
): DayClosingSummaryWithRequest {
  const previous = summary as DayClosingSummaryWithRequest;
  return {
    ...previous,
    closeRequest: request,
    rejection: undefined,
  };
}

export function withCloseRequestRejection(
  summary: DayClosingSummary | DayClosingSummaryWithRequest | unknown,
  rejection: CloseRequestRejection
): DayClosingSummaryWithRequest {
  const previous =
    summary && typeof summary === "object"
      ? (summary as DayClosingSummaryWithRequest)
      : ({} as DayClosingSummaryWithRequest);
  const history = [
    ...(Array.isArray(previous.rejectionHistory) ? previous.rejectionHistory : []),
    rejection,
  ];
  return {
    ...previous,
    rejection,
    rejectionHistory: history,
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

export function readCloseRequestRejection(
  summary: DayClosingSummary | unknown
): CloseRequestRejection | undefined {
  if (!summary || typeof summary !== "object") {
    return undefined;
  }

  const rejection = (summary as DayClosingSummaryWithRequest).rejection;
  if (!rejection || typeof rejection !== "object") {
    return undefined;
  }

  const reason = typeof rejection.reason === "string" ? rejection.reason.trim() : "";
  if (!reason) {
    return undefined;
  }

  return { ...rejection, reason };
}

export function readCloseRequestRejectionHistory(
  summary: DayClosingSummary | unknown
): CloseRequestRejection[] {
  if (!summary || typeof summary !== "object") {
    return [];
  }

  const history = (summary as DayClosingSummaryWithRequest).rejectionHistory;
  return Array.isArray(history) ? history : [];
}
