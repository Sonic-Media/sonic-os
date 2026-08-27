/**
 * Production mode is enabled when APP_MODE=production or APP_ENV=production.
 * In production mode, destructive operations require explicit confirmation and
 * seed/reset endpoints are disabled.
 */
export function isProductionMode(): boolean {
  const appMode = process.env.APP_MODE?.trim().toLowerCase();
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();

  return appMode === "production" || appEnv === "production";
}

export function isDestructiveOpsAllowed(): boolean {
  if (!isProductionMode()) {
    return true;
  }

  return process.env.ALLOW_DESTRUCTIVE_OPS?.trim().toLowerCase() === "true";
}

export function requireDestructiveOpsAllowed(action: string): void {
  if (isDestructiveOpsAllowed()) {
    return;
  }

  throw new Error(
    `${action} is disabled in production mode. Set ALLOW_DESTRUCTIVE_OPS=true only for controlled maintenance windows.`
  );
}

export function requireProductionConfirmationToken(
  provided: string | undefined,
  expectedPhrase: string
): void {
  if (!isProductionMode()) {
    return;
  }

  if (provided?.trim() !== expectedPhrase) {
    throw new Error(
      `Production mode requires confirmation phrase: "${expectedPhrase}".`
    );
  }
}
