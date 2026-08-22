export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvAtStartup } = await import("@/lib/env/validate");
    validateEnvAtStartup({ exitOnError: true });
    console.info(
      `[sonic-os] Environment validated (APP_ENV=${process.env.APP_ENV ?? "development"}).`
    );

    if (process.env.DATABASE_URL?.trim()) {
      const { getAppEnvironment } = await import("@/lib/env");
      const { runApplicationBootstrap } = await import(
        "@/lib/server/bootstrap/pipeline"
      );
      const report = await runApplicationBootstrap();

      if (!report.success) {
        const message = `[sonic-os] Bootstrap failed at stage "${report.failedStage}": ${report.error}`;
        const appEnv = getAppEnvironment();

        if (appEnv === "production" || appEnv === "staging") {
          console.error(message);
          process.exit(1);
        }

        console.warn(`${message} The dev server will continue; run bootstrap before using protected APIs.`);
        return;
      }

      console.info(
        `[sonic-os] Application bootstrap complete (stage=${report.completedStage}).`
      );
    }
  }
}
