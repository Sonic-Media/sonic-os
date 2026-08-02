import { ApiError } from "@/lib/api/errors";
import { ZodError } from "zod";

export interface RequestLogContext {
  requestId: string;
  method: string;
  pathname: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  username?: string;
}

export interface ErrorLogContext extends RequestLogContext {
  code?: string;
  message: string;
  stack?: string;
}

function formatLogPayload(
  level: "info" | "warn" | "error",
  event: string,
  context: Record<string, unknown> | RequestLogContext | ErrorLogContext
): string {
  return JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function logRequestStart(context: RequestLogContext): void {
  console.info(
    formatLogPayload("info", "request.start", {
      requestId: context.requestId,
      method: context.method,
      pathname: context.pathname,
      userId: context.userId,
      username: context.username,
    })
  );
}

export function logRequestComplete(context: RequestLogContext): void {
  console.info(
    formatLogPayload("info", "request.complete", {
      requestId: context.requestId,
      method: context.method,
      pathname: context.pathname,
      status: context.status,
      durationMs: context.durationMs,
      userId: context.userId,
      username: context.username,
    })
  );
}

export function logServerError(context: ErrorLogContext): void {
  console.error(formatLogPayload("error", "request.error", context));
}

export function logSecurityEvent(
  event: string,
  context: Record<string, unknown>
): void {
  console.warn(formatLogPayload("warn", event, context));
}

export function toPublicErrorMessage(error: unknown): {
  status: number;
  code: string;
  message: string;
  details?: unknown;
} {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "validation_error",
      message: "Validation failed.",
      details: error.flatten(),
    };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Unexpected server error.",
  };
}
