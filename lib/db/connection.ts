import { Pool, type PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

export interface DatabaseUrlDiagnostics {
  configured: boolean;
  host?: string;
  port?: string;
  database?: string;
  schema?: string;
  sslmode?: string | null;
  user?: string;
  normalizedFromEnv?: boolean;
  invalid?: boolean;
  parseError?: string;
}

export function getDatabaseUrlFromEnv(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

export function resolveDatabaseUrl(): string {
  const connectionString = getDatabaseUrlFromEnv();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return normalizeDatabaseUrl(connectionString);
}

export function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const isLocal = isLocalDatabaseHost(url.hostname);

    if (!isLocal && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function isLocalDatabaseHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

export function getDatabaseUrlDiagnostics(): DatabaseUrlDiagnostics {
  const raw = getDatabaseUrlFromEnv();
  if (!raw) {
    return { configured: false };
  }

  try {
    const normalized = normalizeDatabaseUrl(raw);
    const url = new URL(normalized);

    return {
      configured: true,
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, ""),
      schema: url.searchParams.get("schema") || "public",
      sslmode: url.searchParams.get("sslmode"),
      user: url.username,
      normalizedFromEnv: normalized !== raw,
    };
  } catch (error) {
    return {
      configured: true,
      invalid: true,
      parseError:
        error instanceof Error ? error.message : "DATABASE_URL is not a valid URL.",
    };
  }
}

export function getPoolConfig(connectionString: string): PoolConfig {
  const normalized = normalizeDatabaseUrl(connectionString);

  let hostname = "";
  let sslmode: string | null = null;

  try {
    const url = new URL(normalized);
    hostname = url.hostname;
    sslmode = url.searchParams.get("sslmode");
  } catch {
    hostname = "";
  }

  const isLocal = isLocalDatabaseHost(hostname);
  const sslRequired =
    !isLocal ||
    sslmode === "require" ||
    sslmode === "verify-full" ||
    hostname.includes("neon.tech");

  const config: PoolConfig = {
    connectionString: normalized,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  if (sslRequired && !isLocal) {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
}

export function formatDatabaseConnectionError(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message.trim()];
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message.trim()) {
      parts.push(cause.message.trim());
    }
    return parts.filter(Boolean).join(" | ");
  }

  return String(error);
}

export async function verifyPgConnection(connectionString: string): Promise<void> {
  const pool = new Pool(getPoolConfig(connectionString));

  try {
    await pool.query("SELECT 1");
  } finally {
    await pool.end().catch(() => undefined);
  }
}
