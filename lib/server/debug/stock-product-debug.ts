/**
 * TEMPORARY diagnostics for Add Product / opening stock investigation.
 * Remove after root cause is confirmed.
 */

function isPrismaError(error: unknown): error is Error & {
  code?: string;
  meta?: unknown;
  clientVersion?: string;
} {
  return (
    error instanceof Error &&
    ("code" in error || error.name.includes("Prisma"))
  );
}

export function logStockProductDebug(
  step: string,
  context: Record<string, unknown>
): void {
  console.error(
    JSON.stringify(
      {
        level: "debug",
        event: "stock.product.debug",
        step,
        timestamp: new Date().toISOString(),
        ...context,
      },
      null,
      2
    )
  );
}

export function logStockProductFailure(
  step: string,
  sourceLine: string,
  error: unknown,
  context: Record<string, unknown> = {}
): never {
  const err = error instanceof Error ? error : new Error(String(error));
  const prisma = isPrismaError(error)
    ? {
        prismaCode: error.code,
        prismaMeta: error.meta,
        prismaClientVersion: error.clientVersion,
      }
    : {};

  console.error(
    JSON.stringify(
      {
        level: "error",
        event: "stock.product.failure",
        step,
        sourceLine,
        timestamp: new Date().toISOString(),
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
        ...prisma,
        ...context,
      },
      null,
      2
    )
  );

  throw error;
}

export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development";
}
