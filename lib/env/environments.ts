export const APP_ENVIRONMENTS = ["development", "staging", "production"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export interface EnvironmentProfile {
  /** Human-readable label for logs and health checks. */
  label: string;
  /** PostgreSQL is mandatory before the app can serve API traffic. */
  requiresDatabase: boolean;
  /** SESSION_SECRET must be set (min 32 chars). */
  requiresSessionSecret: boolean;
  /** NEXT_PUBLIC_USE_API should be true when using PostgreSQL. */
  defaultUseApi: boolean;
  /** Prisma query logging verbosity. */
  prismaLog: ("error" | "warn" | "info")[];
}

export const ENVIRONMENT_PROFILES: Record<AppEnvironment, EnvironmentProfile> =
  {
    development: {
      label: "Development",
      requiresDatabase: false,
      requiresSessionSecret: false,
      defaultUseApi: true,
      prismaLog: ["error", "warn"],
    },
    staging: {
      label: "Staging",
      requiresDatabase: true,
      requiresSessionSecret: true,
      defaultUseApi: true,
      prismaLog: ["error", "warn"],
    },
    production: {
      label: "Production",
      requiresDatabase: true,
      requiresSessionSecret: true,
      defaultUseApi: true,
      prismaLog: ["error"],
    },
  };

export function isAppEnvironment(value: string): value is AppEnvironment {
  return (APP_ENVIRONMENTS as readonly string[]).includes(value);
}

export function getEnvironmentProfile(
  appEnv: AppEnvironment
): EnvironmentProfile {
  return ENVIRONMENT_PROFILES[appEnv];
}
