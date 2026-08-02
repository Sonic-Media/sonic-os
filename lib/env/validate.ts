import { z } from "zod";
import {
  type AppEnvironment,
  getEnvironmentProfile,
  isAppEnvironment,
} from "@/lib/env/environments";

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(
      issues.length === 1
        ? issues[0]
        : `Environment validation failed:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

const rawEnvSchema = z.object({
  APP_ENV: z.string().optional(),
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  NEXT_PUBLIC_USE_API: z.string().optional(),
  PORT: z.string().optional(),
  HOSTNAME: z.string().optional(),
});

function resolveAppEnvironment(): AppEnvironment {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();

  if (appEnv) {
    if (!isAppEnvironment(appEnv)) {
      throw new EnvValidationError([
        `APP_ENV must be one of: development, staging, production (received "${process.env.APP_ENV}").`,
      ]);
    }

    return appEnv;
  }

  return "development";
}

function validatePort(port: string | undefined, issues: string[]): void {
  if (port === undefined || port.trim() === "") {
    return;
  }

  const parsed = Number(port);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    issues.push(`PORT must be an integer between 1 and 65535 (received "${port}").`);
  }
}

function validateNextPublicUseApi(
  value: string | undefined,
  appEnv: AppEnvironment,
  issues: string[]
): void {
  if (value === undefined || value.trim() === "") {
    return;
  }

  if (value !== "true" && value !== "false") {
    issues.push(
      `NEXT_PUBLIC_USE_API must be "true" or "false" (received "${value}").`
    );
    return;
  }

  const profile = getEnvironmentProfile(appEnv);
  if (
    profile.requiresDatabase &&
    value === "false"
  ) {
    issues.push(
      `NEXT_PUBLIC_USE_API must be "true" when APP_ENV is "${appEnv}".`
    );
  }
}

export interface EnvValidationResult {
  appEnv: AppEnvironment;
  nodeEnv: string;
  databaseConfigured: boolean;
  sessionSecretConfigured: boolean;
  useApiClient: boolean;
  port: number;
  hostname: string;
}

let cachedValidationResult: EnvValidationResult | null = null;

export function validateEnvAtStartup(options?: {
  exitOnError?: boolean;
}): EnvValidationResult {
  if (cachedValidationResult) {
    return cachedValidationResult;
  }

  const parsed = rawEnvSchema.safeParse(process.env);
  const issues: string[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  }

  const env = parsed.success ? parsed.data : {};
  const appEnv = resolveAppEnvironment();
  const profile = getEnvironmentProfile(appEnv);
  const nodeEnv = env.NODE_ENV?.trim() || process.env.NODE_ENV || "development";

  validatePort(env.PORT, issues);
  validateNextPublicUseApi(env.NEXT_PUBLIC_USE_API, appEnv, issues);

  const databaseUrl = env.DATABASE_URL?.trim();
  const sessionSecret = env.SESSION_SECRET?.trim();
  const databaseConfigured = Boolean(databaseUrl);
  const sessionSecretConfigured = Boolean(sessionSecret);

  if (profile.requiresDatabase && !databaseConfigured) {
    issues.push(`DATABASE_URL is required when APP_ENV is "${appEnv}".`);
  }

  if (profile.requiresSessionSecret) {
    if (!sessionSecretConfigured) {
      issues.push(`SESSION_SECRET is required when APP_ENV is "${appEnv}".`);
    } else if ((sessionSecret?.length ?? 0) < 32) {
      issues.push(
        `SESSION_SECRET must be at least 32 characters when APP_ENV is "${appEnv}".`
      );
    }
  } else if (sessionSecretConfigured && (sessionSecret?.length ?? 0) < 32) {
    issues.push("SESSION_SECRET must be at least 32 characters when set.");
  }

  if (appEnv === "production" && nodeEnv !== "production") {
    issues.push(
      'NODE_ENV must be "production" when APP_ENV is "production".'
    );
  }

  if (issues.length > 0) {
    const error = new EnvValidationError(issues);
    if (options?.exitOnError) {
      console.error(`[env] ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const useApiClient =
    env.NEXT_PUBLIC_USE_API?.trim() === "false"
      ? false
      : profile.defaultUseApi;

  cachedValidationResult = {
    appEnv,
    nodeEnv,
    databaseConfigured,
    sessionSecretConfigured,
    useApiClient,
    port: env.PORT?.trim() ? Number(env.PORT) : 3000,
    hostname: env.HOSTNAME?.trim() || "0.0.0.0",
  };

  return cachedValidationResult;
}

export function resetEnvValidationCache(): void {
  cachedValidationResult = null;
}
