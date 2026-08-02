import { ApiError } from "@/lib/api/errors";

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
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

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new ApiError(payload.error?.message ?? "Request failed.", {
      status: response.status,
      code: payload.error?.code,
      details: payload.error?.details,
    });
  }

  if (payload.data === undefined) {
    throw new ApiError("Missing response data.", { status: response.status });
  }

  return payload.data;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" });
}
