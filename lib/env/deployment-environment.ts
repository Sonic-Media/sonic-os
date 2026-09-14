import { isProductionMode } from "@/lib/env/production-mode";

export type DeploymentEnvironment =
  | "local"
  | "vercel-preview"
  | "vercel-production"
  | "remote";

const DEPLOYMENT_LABELS: Record<DeploymentEnvironment, string> = {
  local: "Local",
  "vercel-preview": "Vercel Preview",
  "vercel-production": "Vercel Production",
  remote: "Remote / non-local",
};

export function resolveDeploymentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  options?: { isLocalHost?: boolean }
): DeploymentEnvironment {
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();

  if (vercelEnv === "preview") {
    return "vercel-preview";
  }

  if (vercelEnv === "production") {
    return "vercel-production";
  }

  if (options?.isLocalHost) {
    return "local";
  }

  if (env.VERCEL === "1" || Boolean(env.VERCEL)) {
    // Vercel deployment without a recognized VERCEL_ENV — treat as production.
    return "vercel-production";
  }

  return "remote";
}

/**
 * Whether Shop Reset should apply production-deployment safeguards.
 * Vercel Preview is never treated as production for reset authorization,
 * even when APP_ENV/APP_MODE or NODE_ENV indicate a production build.
 */
export function isResetGuardProductionDeployment(
  env: NodeJS.ProcessEnv = process.env,
  options?: { isLocalHost?: boolean }
): boolean {
  const deployment = resolveDeploymentEnvironment(env, options);

  if (deployment === "local" || deployment === "vercel-preview") {
    return false;
  }

  if (deployment === "vercel-production") {
    return true;
  }

  return isProductionMode();
}

export function getDeploymentEnvironmentLabel(
  deployment: DeploymentEnvironment
): string {
  return DEPLOYMENT_LABELS[deployment];
}
