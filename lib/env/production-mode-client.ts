export type ClientDeploymentEnvironment =
  | "preview"
  | "production"
  | "development"
  | "unknown";

/**
 * Trusted Vercel deployment tier exposed to the browser via next.config env mapping.
 * Falls back to unknown when unavailable (local non-Vercel builds).
 */
export function getClientVercelEnv(): ClientDeploymentEnvironment {
  const value = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim().toLowerCase();

  if (value === "preview" || value === "production" || value === "development") {
    return value;
  }

  return "unknown";
}

/**
 * Application profile flag (APP_MODE / NEXT_PUBLIC_APP_MODE).
 * This is NOT the Vercel deployment tier — Preview builds often set this to production.
 */
export function isProductionModeClient(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase() === "production";
}

/**
 * True only for the Vercel Production deployment tier.
 * Preview must never inherit this solely from APP_MODE/APP_ENV.
 */
export function isVercelProductionClient(): boolean {
  return getClientVercelEnv() === "production";
}

export function isVercelPreviewClient(): boolean {
  return getClientVercelEnv() === "preview";
}
