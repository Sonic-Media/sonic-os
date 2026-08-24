import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Keys that must never be loaded from files or written at runtime. */
const READONLY_ENV_KEYS = new Set<string>(["NODE_ENV"]);

function isEnvValuePresent(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

function getInitialEnvKeys(): Set<string> {
  return new Set(
    Object.entries(process.env)
      .filter(([, value]) => isEnvValuePresent(value))
      .map(([key]) => key)
  );
}

function setEnvVar(key: string, value: string): void {
  if (READONLY_ENV_KEYS.has(key)) {
    return;
  }

  try {
    process.env[key] = value;
  } catch {
    // Some platforms mark certain env vars as read-only (e.g. NODE_ENV on Vercel).
  }
}

function loadEnvFile(
  filePath: string,
  initialEnvKeys: Set<string>
): void {
  if (!existsSync(filePath)) {
    return;
  }

  const parsed = parse(readFileSync(filePath));

  for (const [key, value] of Object.entries(parsed)) {
    if (READONLY_ENV_KEYS.has(key)) {
      continue;
    }

    if (initialEnvKeys.has(key)) {
      continue;
    }

    if (value === undefined) {
      continue;
    }

    setEnvVar(key, value);
  }
}

/**
 * Load local env files for Prisma CLI and Node scripts.
 *
 * Priority (highest wins):
 * 1. Variables already in `process.env` before this runs (exported shell / platform env)
 * 2. `.env.local`
 * 3. `.env`
 *
 * Only missing keys are loaded from files. `NODE_ENV` is never read or written.
 */
export function loadEnvFiles(cwd: string = process.cwd()): void {
  const initialEnvKeys = getInitialEnvKeys();

  loadEnvFile(path.join(cwd, ".env"), initialEnvKeys);
  loadEnvFile(path.join(cwd, ".env.local"), initialEnvKeys);
}

export function getDatabaseUrlFromEnv(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}
