import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Environment variables that must never be replaced by values from .env files
 * when already present in the process environment (shell export, CI, Vercel, etc.).
 */
const PRESERVE_FROM_PROCESS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "APP_ENV",
  "NODE_ENV",
  "NEXT_PUBLIC_USE_API",
] as const;

/**
 * Load local env files for Prisma CLI and Node scripts.
 *
 * Priority (highest wins):
 * 1. Variables already in `process.env` before this runs (exported shell / platform env)
 * 2. `.env.local`
 * 3. `.env`
 */
export function loadEnvFiles(cwd: string = process.cwd()): void {
  const preserved = Object.fromEntries(
    PRESERVE_FROM_PROCESS.map((key) => [key, process.env[key]])
  ) as Record<(typeof PRESERVE_FROM_PROCESS)[number], string | undefined>;

  const envPath = path.join(cwd, ".env");
  const localPath = path.join(cwd, ".env.local");

  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }

  if (existsSync(localPath)) {
    config({ path: localPath, override: true });
  }

  for (const key of PRESERVE_FROM_PROCESS) {
    const value = preserved[key]?.trim();
    if (value) {
      process.env[key] = value;
    }
  }
}

export function getDatabaseUrlFromEnv(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}
