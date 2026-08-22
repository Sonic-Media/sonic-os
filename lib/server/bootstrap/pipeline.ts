import { isDatabaseConfigured } from "@/lib/db";
import {
  runBranchesStage,
  runDatabaseConnectionStage,
  runExpenseCategoriesStage,
  runExpenseTemplatesStage,
  runLinkUserStaffIdStage,
  runMigrationsVerifiedStage,
  runOwnerStaffStage,
  runOwnerUserStage,
  runRolesStage,
  runSettingsStage,
  runStartupCompleteStage,
} from "@/lib/server/bootstrap/stages";
import {
  BOOTSTRAP_STAGES,
  BootstrapFailedError,
  createBootstrapReport,
  type BootstrapReport,
  type BootstrapStage,
} from "@/lib/server/bootstrap/types";
import {
  verifyBootstrapStage,
  verifyStartupCompleteStage,
} from "@/lib/server/bootstrap/verify";

type ExecutableStage = Exclude<BootstrapStage, "startup_complete">;

const STAGE_RUNNERS: Record<ExecutableStage, () => Promise<void>> = {
  database_connection: runDatabaseConnectionStage,
  migrations_verified: runMigrationsVerifiedStage,
  branches: runBranchesStage,
  roles: runRolesStage,
  owner_user: runOwnerUserStage,
  owner_staff: runOwnerStaffStage,
  link_user_staff_id: runLinkUserStaffIdStage,
  expense_categories: runExpenseCategoriesStage,
  expense_templates: runExpenseTemplatesStage,
  settings: runSettingsStage,
};

const EXECUTABLE_STAGES = BOOTSTRAP_STAGES.filter(
  (stage): stage is ExecutableStage => stage !== "startup_complete"
);

async function runStage(stage: ExecutableStage): Promise<void> {
  try {
    await STAGE_RUNNERS[stage]();
  } catch (error) {
    if (error instanceof BootstrapFailedError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Stage execution failed.";
    throw new BootstrapFailedError(stage, message, error);
  }

  const verified = await verifyBootstrapStage(stage);

  if (!verified) {
    throw new BootstrapFailedError(
      stage,
      `Bootstrap stage "${stage}" completed but PostgreSQL verification failed.`
    );
  }
}

export async function runApplicationBootstrap(): Promise<BootstrapReport> {
  if (!isDatabaseConfigured()) {
    return createBootstrapReport({
      success: false,
      failedStage: "database_connection",
      error: "DATABASE_URL is not configured.",
    });
  }

  let completedStage: BootstrapStage | null = null;

  try {
    for (const stage of EXECUTABLE_STAGES) {
      await runStage(stage);
      completedStage = stage;
    }

    await runStartupCompleteVerification();
    completedStage = "startup_complete";

    return createBootstrapReport({
      success: true,
      completedStage,
    });
  } catch (error) {
    const failedStage =
      error instanceof BootstrapFailedError
        ? error.stage
        : (completedStage ?? "database_connection");

    const message =
      error instanceof Error
        ? error.message
        : "Application bootstrap failed with an unknown error.";

    return createBootstrapReport({
      success: false,
      completedStage,
      failedStage,
      error: message,
    });
  }
}

async function runStartupCompleteVerification(): Promise<void> {
  await runStartupCompleteStage();

  const verified = await verifyStartupCompleteStage();

  if (!verified) {
    throw new BootstrapFailedError(
      "startup_complete",
      'Bootstrap stage "startup_complete" verification failed.'
    );
  }
}

export async function ensureApplicationBootstrapped(): Promise<void> {
  const startupComplete = await verifyStartupCompleteStage();
  if (startupComplete) {
    return;
  }

  const report = await runApplicationBootstrap();

  if (!report.success) {
    throw new BootstrapFailedError(
      report.failedStage ?? "startup_complete",
      report.error ??
        `Application bootstrap failed at stage "${report.failedStage}".`
    );
  }
}

export async function isApplicationBootstrapped(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false;
  }

  return verifyStartupCompleteStage();
}
