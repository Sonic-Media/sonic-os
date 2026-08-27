import { isDatabaseConfigured } from "@/lib/db";
import {
  ensureApplicationBootstrapped,
  isApplicationBootstrapped,
  runApplicationBootstrap,
} from "@/lib/server/bootstrap/pipeline";
import { runRbacRepairStage } from "@/lib/server/bootstrap/stages";
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
let backupSchedulerStarted = false;

async function initializeApplicationData(): Promise<void> {
  await ensureApplicationBootstrapped();
  await runRbacRepairStage();

  if (!backupSchedulerStarted) {
    backupSchedulerStarted = true;
    const { startDailyBackupScheduler } = await import(
      "@/lib/server/backup/scheduler"
    );
    startDailyBackupScheduler();
  }
}

export async function ensureApplicationInitialized(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = initializeApplicationData().catch((error) => {
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
