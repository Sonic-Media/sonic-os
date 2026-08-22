import { isDatabaseConfigured } from "@/lib/db";
import {
  ensureApplicationBootstrapped,
  isApplicationBootstrapped,
  runApplicationBootstrap,
} from "@/lib/server/bootstrap/pipeline";
import {
  BootstrapFailedError,
  createBootstrapReport,
  type BootstrapReport,
} from "@/lib/server/bootstrap/types";

export {
  BOOTSTRAP_STAGES,
  BootstrapFailedError,
  createBootstrapReport,
  type BootstrapReport,
  type BootstrapStage,
} from "@/lib/server/bootstrap/types";

export {
  DEFAULT_OWNER_DISPLAY_NAME,
  DEFAULT_OWNER_USERNAME,
  PRODUCTION_ROLES,
} from "@/lib/server/bootstrap/constants";

export {
  findIncompleteBootstrapStage,
  verifyBootstrapStage,
  verifyStartupCompleteStage,
} from "@/lib/server/bootstrap/verify";

export { runApplicationBootstrap, isApplicationBootstrapped };

let bootstrapPromise: Promise<void> | null = null;

export async function ensureApplicationInitialized(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = ensureApplicationBootstrapped().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}

export async function getApplicationBootstrapReport(): Promise<BootstrapReport> {
  if (!isDatabaseConfigured()) {
    return createBootstrapReport({
      success: false,
      failedStage: "database_connection",
      error: "DATABASE_URL is not configured.",
    });
  }

  const alreadyBootstrapped = await isApplicationBootstrapped();
  if (alreadyBootstrapped) {
    return createBootstrapReport({
      success: true,
      completedStage: "startup_complete",
    });
  }

  return runApplicationBootstrap();
}
