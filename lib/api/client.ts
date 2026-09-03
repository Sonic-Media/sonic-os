import { mergeActiveBranchIntoBody } from "@/lib/api/branch-request";
import { ApiError } from "@/lib/api/errors";

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

function readApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  let payload: ApiEnvelope<T> | unknown;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      readApiErrorMessage(payload, `Request failed (${response.status}).`),
      {
        status: response.status,
        code:
          payload && typeof payload === "object" && payload !== null
            ? (payload as ApiEnvelope<T>).error?.code
            : undefined,
        details:
          payload && typeof payload === "object" && payload !== null
            ? (payload as ApiEnvelope<T>).error?.details
            : undefined,
      }
    );
  }

  const envelope = payload as ApiEnvelope<T>;

  if (envelope.data === undefined) {
    throw new ApiError("Missing response data.", { status: response.status });
  }

  return envelope.data;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(mergeActiveBranchIntoBody(body)),
  });
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(mergeActiveBranchIntoBody(body)),
  });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" });
}
