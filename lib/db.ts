import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/prisma";
import {
  formatDatabaseConnectionError,
  getDatabaseUrlDiagnostics,
  getDatabaseUrlFromEnv,
  getPoolConfig,
  resolveDatabaseUrl,
} from "@/lib/db/connection";
import { softDeleteExtension } from "@/lib/server/data-protection/soft-delete";

export {
  formatDatabaseConnectionError,
  getDatabaseUrlDiagnostics,
  getDatabaseUrlFromEnv,
  normalizeDatabaseUrl,
  resolveDatabaseUrl,
} from "@/lib/db/connection";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  databaseUrl: string | undefined;
};

function createPool(connectionString: string): Pool {
  return new Pool(getPoolConfig(connectionString));
}

function createPrismaClient(connectionString: string): PrismaClient {
  const pool = createPool(connectionString);
  globalForPrisma.pgPool = pool;
  globalForPrisma.databaseUrl = connectionString;

  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  return baseClient.$extends(softDeleteExtension()) as unknown as PrismaClient;
}

function resetCachedClient(): void {
  const pool = globalForPrisma.pgPool;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  globalForPrisma.databaseUrl = undefined;

  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

export function resetPrismaClientCache(): void {
  resetCachedClient();
}

export function getPrismaClient(): PrismaClient {
  const connectionString = resolveDatabaseUrl();

  if (
    globalForPrisma.prisma &&
    globalForPrisma.databaseUrl === connectionString
  ) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma || globalForPrisma.pgPool) {
    resetCachedClient();
  }

  globalForPrisma.prisma = createPrismaClient(connectionString);
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;

    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }

    return value;
  },
});

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrlFromEnv());
}

export async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export interface DatabaseConnectionCheck {
  connected: boolean;
  diagnostics: ReturnType<typeof getDatabaseUrlDiagnostics>;
  error: string | null;
}

export async function checkDatabaseConnection(): Promise<DatabaseConnectionCheck> {
  const diagnostics = getDatabaseUrlDiagnostics();

  if (!diagnostics.configured) {
    return {
      connected: false,
      diagnostics,
      error: "DATABASE_URL is not configured.",
    };
  }

  if (diagnostics.invalid) {
    return {
      connected: false,
      diagnostics,
      error: diagnostics.parseError ?? "DATABASE_URL is not a valid URL.",
    };
  }

  try {
    await verifyDatabaseConnection();
    return {
      connected: true,
      diagnostics,
      error: null,
    };
  } catch (error) {
    return {
      connected: false,
      diagnostics,
      error: formatDatabaseConnectionError(error),
    };
  }
}
