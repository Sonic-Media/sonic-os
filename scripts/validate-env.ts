import { validateEnvAtStartup } from "../lib/env/validate";

try {
  const result = validateEnvAtStartup();
  console.log(
    `[env] Validation passed (APP_ENV=${result.appEnv}, NODE_ENV=${result.nodeEnv}).`
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "[env] Validation failed."
  );
  process.exit(1);
}
