import "dotenv/config";
import { ApiError } from "@/lib/api/errors";
import {
  isResetGuardProductionDeployment,
  resolveDeploymentEnvironment,
} from "@/lib/env/deployment-environment";
import {
  evaluateTransactionalResetTarget,
  getAuthorizedPreviewResetMessage,
  type ResetTargetGuardEnv,
  type SafeDatabaseIdentity,
} from "@/lib/server/database-target-guard";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-reset-guard-${Date.now()}`;

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function baseIdentity(
  overrides: Partial<SafeDatabaseIdentity> = {}
): SafeDatabaseIdentity {
  return {
    host: "ep-preview-example.neon.tech",
    port: "5432",
    database: "sonic_preview",
    user: "preview_user",
    schema: "public",
    fingerprint: "abc123def456",
    isLocalHost: false,
    isNeonHost: true,
    appEnv: "production",
    appMode: "(unset)",
    vercelEnv: "preview",
    nodeEnv: "production",
    deploymentEnvironment: "vercel-preview",
    isProductionMode: true,
    isResetProductionDeployment: false,
    ...overrides,
  };
}

function baseEnv(overrides: Partial<ResetTargetGuardEnv> = {}): ResetTargetGuardEnv {
  return {
    allowDestructiveOps: false,
    allowNeonTransactionalReset: false,
    allowNonLocalTransactionalReset: false,
    allowedDatabaseFingerprint: undefined,
    blockedDatabaseNames: ["sonic_os_prod", "production"],
    ...overrides,
  };
}

class JsonClient {
  private cookieHeader = "";

  async request(apiPath: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }
    return fetch(`${BASE_URL}${apiPath}`, { ...options, headers });
  }

  async json<T>(apiPath: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(apiPath, options);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    const payload = (await response.json()) as { data?: T; error?: unknown };
    if (!response.ok) {
      throw new Error(
        `${apiPath} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }

  async jsonExpectFailure(apiPath: string, options: RequestInit = {}) {
    const response = await this.request(apiPath, options);
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return {
      status: response.status,
      code: payload.error?.code ?? "",
      message: payload.error?.message ?? "",
    };
  }
}

function main() {
  console.log("Verifying shop reset target guard (non-destructive)...\n");

  recordCheck(
    "A-local-development",
    "Local development target passes without remote authorization env vars",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({
          host: "localhost",
          isLocalHost: true,
          isNeonHost: false,
          fingerprint: "c400f10d4dbe",
          deploymentEnvironment: "local",
          isProductionMode: false,
          isResetProductionDeployment: false,
          vercelEnv: "(unset)",
          nodeEnv: "development",
        }),
        baseEnv()
      );
      return result.ok;
    })()
  );

  recordCheck(
    "B-vercel-preview-neon-blocked-without-auth",
    "Vercel Preview + Neon remains blocked without authorization env vars",
    (() => {
      const result = evaluateTransactionalResetTarget(baseIdentity(), baseEnv());
      return (
        !result.ok &&
        result.code === "reset_target_forbidden" &&
        !result.message.includes("production mode") &&
        !result.message.includes("Vercel Production")
      );
    })()
  );

  recordCheck(
    "C-vercel-production-neon-blocked",
    "Vercel Production + Neon remains blocked without ALLOW_DESTRUCTIVE_OPS",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({
          vercelEnv: "production",
          deploymentEnvironment: "vercel-production",
          isResetProductionDeployment: true,
        }),
        baseEnv()
      );
      return (
        !result.ok &&
        result.message.includes(
          "Business data reset is disabled in production mode."
        ) &&
        result.details?.reason === "production_deployment"
      );
    })()
  );

  recordCheck(
    "D-preview-missing-authorization-vars",
    "Preview with missing authorization variables is blocked",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity(),
        baseEnv({
          allowNeonTransactionalReset: false,
          allowNonLocalTransactionalReset: false,
        })
      );
      return !result.ok && result.code === "reset_target_forbidden";
    })()
  );

  recordCheck(
    "E-preview-wrong-fingerprint",
    "Preview with wrong fingerprint remains blocked",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({ fingerprint: "3c974614fe7b" }),
        baseEnv({
          allowNeonTransactionalReset: true,
          allowNonLocalTransactionalReset: true,
          allowedDatabaseFingerprint: "wrongfingerprint",
        })
      );
      return (
        !result.ok &&
        result.code === "reset_target_forbidden" &&
        result.details?.reason === "fingerprint_mismatch" &&
        result.message.includes("Reset target not authorized for this deployment.")
      );
    })()
  );

  recordCheck(
    "F-preview-correct-fingerprint-and-flags",
    "Preview with correct fingerprint and required flags passes",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({ fingerprint: "3c974614fe7b" }),
        baseEnv({
          allowNeonTransactionalReset: true,
          allowNonLocalTransactionalReset: true,
          allowedDatabaseFingerprint: "3c974614fe7b",
        })
      );
      return result.ok;
    })()
  );

  recordCheck(
    "F2-exact-user-facing-messages",
    "Production/unauthorized/authorized copy matches required Preview UX strings",
    (() => {
      const production = evaluateTransactionalResetTarget(
        baseIdentity({
          vercelEnv: "production",
          deploymentEnvironment: "vercel-production",
          isResetProductionDeployment: true,
        }),
        baseEnv()
      );
      const unauthorized = evaluateTransactionalResetTarget(
        baseIdentity(),
        baseEnv()
      );
      const authorizedPreviewMessage = getAuthorizedPreviewResetMessage();

      return (
        !production.ok &&
        production.message ===
          "Business data reset is disabled in production mode." &&
        !unauthorized.ok &&
        unauthorized.message ===
          "Reset target not authorized for this deployment." &&
        authorizedPreviewMessage ===
          "Preview reset enabled for authorized test database."
      );
    })()
  );

  recordCheck(
    "G-production-remains-blocked",
    "Production deployment remains blocked without ALLOW_DESTRUCTIVE_OPS",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({
          vercelEnv: "production",
          deploymentEnvironment: "vercel-production",
          isResetProductionDeployment: true,
        }),
        baseEnv()
      );
      return (
        !result.ok &&
        result.status === 403 &&
        result.code === "reset_target_forbidden"
      );
    })()
  );

  recordCheck(
    "H-node-production-vercel-preview-not-production-deployment",
    "NODE_ENV=production + VERCEL_ENV=preview is not treated as production deployment",
    (() => {
      const env = {
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        APP_ENV: "production",
        APP_MODE: "production",
        VERCEL: "1",
      } as NodeJS.ProcessEnv;

      const deployment = resolveDeploymentEnvironment(env, { isLocalHost: false });
      const resetProduction = isResetGuardProductionDeployment(env, {
        isLocalHost: false,
      });

      const result = evaluateTransactionalResetTarget(
        baseIdentity({
          appEnv: "production",
          appMode: "production",
          vercelEnv: "preview",
          nodeEnv: "production",
          deploymentEnvironment: deployment,
          isProductionMode: true,
          isResetProductionDeployment: resetProduction,
        }),
        baseEnv()
      );

      return (
        deployment === "vercel-preview" &&
        resetProduction === false &&
        !result.ok &&
        result.details?.reason !== "production_deployment"
      );
    })()
  );

  recordCheck(
    "7-guard-uses-actionable-code",
    "Remote guard refusal uses reset_target_forbidden (403), not internal_error",
    (() => {
      const evaluation = evaluateTransactionalResetTarget(baseIdentity(), baseEnv());

      return (
        !evaluation.ok &&
        evaluation.code === "reset_target_forbidden" &&
        evaluation.status === 403 &&
        !evaluation.message.includes("Unexpected server error")
      );
    })()
  );
}

async function runLiveChecks() {
  const ownerClient = new JsonClient();
  let cashier: CertificationCashier | null = null;

  try {
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const preview = await ownerClient.json<{
      canReset: boolean;
      resetTarget: {
        authorized: boolean;
        fingerprint: string;
        deploymentEnvironment: string;
        deploymentLabel: string;
        isResetProductionDeployment: boolean;
      };
    }>("/api/admin/shop-reset?scope=both");

    recordCheck(
      "8-live-preview-target-metadata",
      "Owner preview exposes reset target authorization metadata",
      typeof preview.resetTarget.fingerprint === "string" &&
        preview.resetTarget.fingerprint.length === 12 &&
        typeof preview.resetTarget.deploymentLabel === "string",
      `authorized=${preview.resetTarget.authorized}, deployment=${preview.resetTarget.deploymentLabel}, fingerprint=${preview.resetTarget.fingerprint}`
    );

    recordCheck(
      "9-live-canreset-matches-target",
      "canReset follows reset target authorization",
      preview.canReset === preview.resetTarget.authorized,
      `canReset=${preview.canReset}`
    );

    recordCheck(
      "9b-live-local-not-production-deployment",
      "Local runtime is not classified as reset production deployment",
      preview.resetTarget.deploymentEnvironment === "local" &&
        preview.resetTarget.isResetProductionDeployment === false,
      `deployment=${preview.resetTarget.deploymentEnvironment}`
    );

    cashier = await createCertificationCashier(ownerClient, `${TEST_PREFIX}-cashier`, "main");
    const staffClient = new JsonClient();
    await loginWithCredentials(staffClient, {
      username: cashier.username,
      password: cashier.password,
    });

    const cashierDenied = await staffClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "both",
        confirmation: "RESET BOTH SONIC SHOPS",
      }),
    });
    recordCheck(
      "10-live-owner-only",
      "Non-owner reset remains forbidden",
      cashierDenied.status === 403,
      `status=${cashierDenied.status}`
    );

    const badConfirmation = await ownerClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "both",
        confirmation: "RESET WRONG SHOP",
      }),
    });

    const guardBlocksBeforeConfirmation =
      badConfirmation.code === "reset_target_forbidden" ||
      badConfirmation.code === "confirmation_required";

    recordCheck(
      "11-live-wrong-confirmation-or-guard",
      "Wrong confirmation rejected or guard blocks before reset",
      badConfirmation.status === 400 || badConfirmation.status === 403,
      `status=${badConfirmation.status}, code=${badConfirmation.code}`
    );

    if (badConfirmation.code === "confirmation_required") {
      recordCheck(
        "11b-live-wrong-confirmation-message",
        "Wrong confirmation returns actionable message (not generic 500)",
        !badConfirmation.message.includes("Unexpected server error"),
        badConfirmation.message
      );
    }

    recordCheck(
      "12-live-no-destructive-post",
      "Verification did not execute destructive reset",
      guardBlocksBeforeConfirmation,
      "POST rejected before deletion"
    );
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
  }
}

main();

runLiveChecks()
  .then(() => {
    console.log("\nShop reset target guard verification complete.");
  })
  .catch((error) => {
    if (error instanceof ApiError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
