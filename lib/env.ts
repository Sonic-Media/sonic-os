import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_USE_API: z.enum(["true", "false"]).default("true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });
}

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API ?? "true",
  });
}

export function shouldUseApiDataSource(): boolean {
  if (typeof window === "undefined") {
    return getServerEnv().DATABASE_URL !== undefined;
  }

  return getClientEnv().NEXT_PUBLIC_USE_API === "true";
}
