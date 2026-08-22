import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  databaseUrl: string | undefined;
};

function getDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return connectionString;
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

function createPrismaClient(connectionString: string): PrismaClient {
  const pool = createPool(connectionString);
  globalForPrisma.pgPool = pool;
  globalForPrisma.databaseUrl = connectionString;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
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
  const connectionString = getDatabaseUrl();

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
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
