export const BOOTSTRAP_STAGES = [
  "database_connection",
  "migrations_verified",
  "branches",
  "roles",
  "owner_user",
  "owner_staff",
  "link_user_staff_id",
  "expense_categories",
  "expense_templates",
  "settings",
  "startup_complete",
] as const;

export type BootstrapStage = (typeof BOOTSTRAP_STAGES)[number];

export interface BootstrapReport {
  success: boolean;
  completedStage: BootstrapStage | null;
  failedStage: BootstrapStage | null;
  error: string | null;
}

export class BootstrapFailedError extends Error {
  readonly stage: BootstrapStage;
  readonly cause: unknown;

  constructor(stage: BootstrapStage, message: string, cause?: unknown) {
    super(message);
    this.name = "BootstrapFailedError";
    this.stage = stage;
    this.cause = cause ?? null;
  }
}

export function createBootstrapReport(
  input: Partial<BootstrapReport> & Pick<BootstrapReport, "success">
): BootstrapReport {
  return {
    success: input.success,
    completedStage: input.completedStage ?? null,
    failedStage: input.failedStage ?? null,
    error: input.error ?? null,
  };
}
