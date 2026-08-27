export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvAtStartup } = await import("@/lib/env/validate");
    validateEnvAtStartup({ exitOnError: true });
    const { isProductionMode } = await import("@/lib/env/production-mode");
    console.info(
      `[sonic-os] Environment validated (APP_ENV=${process.env.APP_ENV ?? "development"}, APP_MODE=${process.env.APP_MODE ?? "unset"}, productionMode=${isProductionMode()}).`
    );
  }
}
