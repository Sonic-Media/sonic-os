import { ApiError } from "@/lib/api/errors";
import { EnvValidationError } from "@/lib/env/validate";
import { BootstrapFailedError } from "@/lib/server/bootstrap/types";
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

  if (error instanceof BootstrapFailedError) {
    return {
      status: 503,
      code: "bootstrap_failed",
      message: error.message,
      details:
        process.env.NODE_ENV === "development"
          ? { stage: error.stage, stack: error.stack }
          : { stage: error.stage },
    };
  }

  if (error instanceof EnvValidationError) {
    return {
      status: 503,
      code: "configuration_error",
      message:
        error.issues.length === 1
          ? error.issues[0]!
          : "Server configuration is incomplete.",
      details:
        process.env.NODE_ENV === "development" ? error.issues : undefined,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes("SESSION_SECRET must be configured")) {
      return {
        status: 503,
        code: "configuration_error",
        message:
          "SESSION_SECRET must be configured for this deployment (minimum 32 characters).",
      };
    }

    if (error.message.includes("DATABASE_URL is not configured")) {
      return {
        status: 503,
        code: "database_unavailable",
        message: "Database is not configured.",
      };
    }

    if (error.message.includes("does not exist in the current database")) {
      return {
        status: 503,
        code: "database_unavailable",
        message:
          "Database schema is out of date. Redeploy the latest version or run migrations.",
      };
    }

    const prismaCode =
      "code" in error && typeof error.code === "string" ? error.code : null;
    if (prismaCode?.startsWith("P")) {
      if (prismaCode === "P1001" || prismaCode === "P1000") {
        return {
          status: 503,
          code: "database_unavailable",
          message: "Unable to connect to the database.",
        };
      }

      if (prismaCode === "P2021") {
        return {
          status: 503,
          code: "database_unavailable",
          message:
            "Database schema is not ready. Run migrations before signing in.",
        };
      }
    }
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "validation_error",
      message: "Validation failed.",
      details: error.flatten(),
    };
  }

  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    const prismaError = error as Error & { code?: string; meta?: unknown };
    return {
      status: 500,
      code: prismaError.code ?? "internal_error",
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        ...(prismaError.code ? { prismaCode: prismaError.code } : {}),
        ...(prismaError.meta !== undefined ? { prismaMeta: prismaError.meta } : {}),
      },
    };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Unexpected server error.",
  };
}
