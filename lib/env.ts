import { z } from "zod";
import {
  type AppEnvironment,
  APP_ENVIRONMENTS,
  getEnvironmentProfile,
} from "@/lib/env/environments";
import {
  EnvValidationError,
  validateEnvAtStartup,
  type EnvValidationResult,
} from "@/lib/env/validate";

const serverEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVIRONMENTS).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOSTNAME: z.string().min(1).default("0.0.0.0"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_USE_API: z.enum(["true", "false"]).default("true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export { EnvValidationError, validateEnvAtStartup, type EnvValidationResult };
export {
  APP_ENVIRONMENTS,
  type AppEnvironment,
  getEnvironmentProfile,
};

function getValidatedRuntime(): EnvValidationResult {
  return validateEnvAtStartup();
}

export function getAppEnvironment(): AppEnvironment {
  return getValidatedRuntime().appEnv;
}

export function getServerEnv(): ServerEnv {
  const runtime = getValidatedRuntime();

  return serverEnvSchema.parse({
    APP_ENV: runtime.appEnv,
    DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
    SESSION_SECRET: process.env.SESSION_SECRET?.trim() || undefined,
    NODE_ENV: runtime.nodeEnv,
    PORT: runtime.port,
    HOSTNAME: runtime.hostname,
  });
}

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API ?? "true",
  });
}

export function shouldUseApiDataSource(): boolean {
  if (typeof window === "undefined") {
    return getValidatedRuntime().databaseConfigured;
  }

  return getClientEnv().NEXT_PUBLIC_USE_API === "true";
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === "production";
}

export function isStagingEnvironment(): boolean {
  return getAppEnvironment() === "staging";
}
