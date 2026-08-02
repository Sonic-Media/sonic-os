export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvAtStartup } = await import("@/lib/env/validate");
    validateEnvAtStartup({ exitOnError: true });
    console.info(
      `[sonic-os] Environment validated (APP_ENV=${process.env.APP_ENV ?? "development"}).`
    );
  }
}
