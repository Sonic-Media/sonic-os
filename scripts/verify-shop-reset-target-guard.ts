import "dotenv/config";
import { ApiError } from "@/lib/api/errors";
import {
  evaluateTransactionalResetTarget,
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
    appEnv: "preview",
    appMode: "(unset)",
    isProductionMode: false,
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
    "1-production-blocked",
    "Production mode remains blocked without ALLOW_DESTRUCTIVE_OPS",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({ isProductionMode: true }),
        baseEnv()
      );
      return (
        !result.ok &&
        result.status === 403 &&
        result.code === "reset_target_forbidden" &&
        result.message.includes("production mode")
      );
    })()
  );

  recordCheck(
    "2-neon-blocked-without-overrides",
    "Arbitrary Neon target remains blocked without authorization env vars",
    (() => {
      const result = evaluateTransactionalResetTarget(baseIdentity(), baseEnv());
      return !result.ok && result.code === "reset_target_forbidden";
    })()
  );

  recordCheck(
    "3-neon-blocked-without-fingerprint",
    "Neon target remains blocked when overrides omit fingerprint",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity(),
        baseEnv({
          allowNeonTransactionalReset: true,
          allowNonLocalTransactionalReset: true,
        })
      );
      return (
        !result.ok &&
        result.code === "reset_target_forbidden" &&
        result.message.includes("SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT")
      );
    })()
  );

  recordCheck(
    "4-neon-blocked-wrong-fingerprint",
    "Neon target remains blocked when fingerprint does not match",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({ fingerprint: "abc123def456" }),
        baseEnv({
          allowNeonTransactionalReset: true,
          allowNonLocalTransactionalReset: true,
          allowedDatabaseFingerprint: "wrongfingerprint",
        })
      );
      return (
        !result.ok &&
        result.code === "reset_target_forbidden" &&
        result.message.includes("fingerprint")
      );
    })()
  );

  recordCheck(
    "5-preview-authorized-passes",
    "Explicitly authorized non-production Preview target passes guard",
    (() => {
      const identity = baseIdentity({ fingerprint: "previewfp123" });
      const result = evaluateTransactionalResetTarget(
        identity,
        baseEnv({
          allowNeonTransactionalReset: true,
          allowNonLocalTransactionalReset: true,
          allowedDatabaseFingerprint: "previewfp123",
        })
      );
      return result.ok;
    })()
  );

  recordCheck(
    "6-local-passes-without-remote-env",
    "Local development target passes without remote authorization env vars",
    (() => {
      const result = evaluateTransactionalResetTarget(
        baseIdentity({
          host: "localhost",
          isLocalHost: true,
          isNeonHost: false,
          fingerprint: "c400f10d4dbe",
        }),
        baseEnv()
      );
      return result.ok;
    })()
  );

  recordCheck(
    "7-guard-uses-actionable-code",
    "Remote guard refusal uses reset_target_forbidden (403), not internal_error",
    (() => {
      const evaluation = evaluateTransactionalResetTarget(
        baseIdentity(),
        baseEnv()
      );

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
      resetTarget: { authorized: boolean; fingerprint: string };
    }>("/api/admin/shop-reset?scope=both");

    recordCheck(
      "8-live-preview-target-metadata",
      "Owner preview exposes reset target authorization metadata",
      typeof preview.resetTarget.fingerprint === "string" &&
        preview.resetTarget.fingerprint.length === 12,
      `authorized=${preview.resetTarget.authorized}, fingerprint=${preview.resetTarget.fingerprint}`
    );

    recordCheck(
      "9-live-canreset-matches-target",
      "canReset follows reset target authorization",
      preview.canReset === preview.resetTarget.authorized,
      `canReset=${preview.canReset}`
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

    if (badConfirmation.code === "reset_target_forbidden") {
      recordCheck(
        "11c-live-guard-actionable",
        "Guard refusal returns actionable reset_target_forbidden message",
        badConfirmation.message.length > 0 &&
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
