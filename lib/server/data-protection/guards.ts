import { ApiError } from "@/lib/api/errors";
import {
  PRODUCTION_CONFIRM_DELETE,
  PRODUCTION_CONFIRM_RESET,
} from "@/lib/data-protection/constants";
import {
  isProductionMode,
  requireDestructiveOpsAllowed,
  requireProductionConfirmationToken,
} from "@/lib/env/production-mode";

export { PRODUCTION_CONFIRM_DELETE, PRODUCTION_CONFIRM_RESET };

export function assertDestructiveApiAllowed(action: string): void {
  try {
    requireDestructiveOpsAllowed(action);
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : `${action} is disabled in production.`,
      { status: 403, code: "production_protected" }
    );
  }
}

export function assertProductionDeleteConfirmation(
  confirmation: string | undefined
): void {
  assertDestructiveApiAllowed("Delete operations");

  try {
    requireProductionConfirmationToken(
      confirmation,
      PRODUCTION_CONFIRM_DELETE
    );
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Confirmation required.",
      { status: 400, code: "confirmation_required" }
    );
  }
}

export function assertProductionBulkDeleteConfirmation(
  confirmation: string | undefined
): void {
  assertDestructiveApiAllowed("Bulk delete operations");

  if (!isProductionMode()) {
    return;
  }

  try {
    requireProductionConfirmationToken(
      confirmation,
      PRODUCTION_CONFIRM_DELETE
    );
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Confirmation required.",
      { status: 400, code: "confirmation_required" }
    );
  }
}

export function assertProductionResetConfirmation(
  confirmation: string | undefined
): void {
  try {
    requireProductionConfirmationToken(
      confirmation,
      PRODUCTION_CONFIRM_RESET
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Confirmation required."
    );
  }
}

export function assertSeedAllowed(): void {
  if (!isProductionMode()) {
    return;
  }

  if (process.env.ALLOW_PRODUCTION_SEED?.trim().toLowerCase() === "true") {
    return;
  }

  throw new Error(
    "Database seeding is disabled in production mode. Set ALLOW_PRODUCTION_SEED=true only during initial setup."
  );
}

export function assertDebugEndpointAllowed(): void {
  if (isProductionMode()) {
    throw new ApiError("Debug endpoints are disabled in production.", {
      status: 404,
      code: "not_found",
    });
  }
}
