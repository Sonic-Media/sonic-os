import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/api/errors";
import { logServerError, toPublicErrorMessage, createRequestId } from "@/lib/server/security/logging";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonError(
  error: unknown,
  context?: { requestId?: string; method?: string; pathname?: string }
) {
  const publicError = toPublicErrorMessage(error);

  if (publicError.status >= 500) {
    logServerError({
      requestId: context?.requestId ?? createRequestId(),
      method: context?.method ?? "unknown",
      pathname: context?.pathname ?? "unknown",
      status: publicError.status,
      code: publicError.code,
      message: error instanceof Error ? error.message : publicError.message,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return NextResponse.json(
    {
      error: {
        message: publicError.message,
        code: publicError.code,
        ...(publicError.details ? { details: publicError.details } : {}),
        ...(context?.requestId ? { requestId: context.requestId } : {}),
      },
    },
    { status: publicError.status }
  );
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
