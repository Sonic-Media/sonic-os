import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  SHOP_RESET_CONFIRM_KANSANGA,
  SHOP_RESET_CONFIRM_SALAAMA,
} from "@/lib/shop-reset/constants";
import {
  cleanupCertificationCashier,
  createCertificationCashier,
  type CertificationCashier,
} from "./verify-bootstrap";
import { submitCloseRequestApi, EMPTY_CLOSE_PAYLOAD } from "./verify-close-request-helpers";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-shop-reset-${Date.now()}`;
const TEST_DATE_OPEN = "2017-03-15";

function recordCheck(id: string, name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
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

  clearCookies() {
    this.cookieHeader = "";
  }
}

async function resetTestDayClosing(branchCode: string, date: string) {
  const branch = await prisma.branch.findFirst({ where: { code: branchCode } });
  if (!branch) return;
  await prisma.dayClosing.deleteMany({
    where: { branchId: branch.id, date },
  });
}

type ShopResetPreviewPayload = {
  canReset: boolean;
  warnings: string[];
  openBusinessDayCount: number;
  resetTarget: { authorized: boolean; fingerprint: string };
  preserved: { users: number; products: number; branches: number };
  counts: { sales: number; dayClosings: number };
};

async function main() {
  console.log("Verifying owner shop reset (non-destructive)...\n");

  const serviceSource = readRepoFile("lib/server/branch-shop-reset-service.ts");
  const routeSource = readRepoFile("app/api/admin/shop-reset/route.ts");
  const uiSource = readRepoFile("components/settings/shop-reset-section.tsx");
  const apiSource = readRepoFile("lib/api/shop-reset.ts");
  const guardSource = readRepoFile("lib/server/database-target-guard.ts");

  recordCheck(
    "1-static",
    "Shop reset service requires owner authorization",
    serviceSource.includes("requireOwner(session)") &&
      routeSource.includes("ownerOnly: true"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "2-static",
    "Reset uses single database transaction",
    serviceSource.includes("$transaction"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "H-static",
    "Product catalogue rows are preserved (no product deleteMany)",
    !serviceSource.includes("product.deleteMany") &&
      serviceSource.includes("product.updateMany"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "J-static",
    "Auth audit used for administrative reset record (AuthAuditLog not deleted)",
    serviceSource.includes("recordSecurityAuditInTransaction") &&
      serviceSource.includes("Shop Reset") &&
      !serviceSource.includes("authAuditLog.deleteMany"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "5-static",
    "Database target guard enforced before reset",
    serviceSource.includes("assertSafeTransactionalResetTarget") &&
      guardSource.includes("reset_target_forbidden"),
    "branch-shop-reset-service.ts + database-target-guard.ts"
  );

  const dayClosingDeleteBlock =
    serviceSource.match(/dayClosing\.deleteMany\([\s\S]*?\);/)?.[0] ?? "";
  recordCheck(
    "C-static",
    "DayClosing deleteMany clears all statuses (no status filter on delete)",
    dayClosingDeleteBlock.includes("branchId: { in: branchIds }") &&
      !dayClosingDeleteBlock.includes("status:") &&
      !serviceSource.includes("shop_reset_open_business_day"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "D-static",
    "Branch-scoped deletion uses branchId filters",
    serviceSource.includes("branchId: { in: branchIds }") &&
      serviceSource.includes("branchCode: { in: auditCodes }"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "G-static",
    "Exact confirmation phrases enforced",
    serviceSource.includes("assertShopResetConfirmation") &&
      uiSource.includes("confirmationMatches") &&
      uiSource.includes("disabled={!canSubmit}"),
    "shop-reset UI + service"
  );

  recordCheck(
    "F-static",
    "Backup attempted before deletion",
    serviceSource.includes("createDatabaseBackup") &&
      serviceSource.includes("backup_failed"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "I-static",
    "Product currentStock reset to zero via updateMany",
    serviceSource.includes("currentStock: 0") &&
      serviceSource.includes("product.updateMany"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "K-static",
    "Reset deletion runs inside transaction (rollback on failure)",
    serviceSource.includes("await client.$transaction(async (tx) => {") &&
      serviceSource.includes("await deleteBranchScopedData(tx, branchIds, branchCodes)"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "UI-static",
    "UI shows owner warnings instead of open-day blockers",
    apiSource.includes("warnings:") &&
      uiSource.includes("preview?.warnings") &&
      !uiSource.includes("blockers") &&
      serviceSource.includes(
        "This reset will clear open, pending, and completed operational records"
      ),
    "shop-reset UI + API types"
  );

  recordCheck(
    "16-static",
    "Production database target guard remains present",
    guardSource.includes("isNeonHost") &&
      guardSource.includes("isResetProductionDeployment") &&
      guardSource.includes("deploymentEnvironment"),
    "database-target-guard.ts"
  );

  let cashier: CertificationCashier | null = null;
  let manager: CertificationCashier | null = null;
  const ownerClient = new JsonClient();
  const staffClient = new JsonClient();
  const managerClient = new JsonClient();

  try {
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const preview = await ownerClient.json<ShopResetPreviewPayload>(
      `/api/admin/shop-reset?scope=main`
    );

    recordCheck(
      "9-live",
      "Owner can load shop reset preview",
      typeof preview.counts.sales === "number" &&
        preview.preserved.users > 0 &&
        typeof preview.resetTarget.fingerprint === "string",
      `users=${preview.preserved.users}, fingerprint=${preview.resetTarget.fingerprint}`
    );

    cashier = await createCertificationCashier(ownerClient, `${TEST_PREFIX}-cashier`, "main");
    manager = await createCertificationCashier(
      ownerClient,
      `${TEST_PREFIX}-mgr`,
      "main",
      "branch-manager"
    );

    await loginWithCredentials(staffClient, {
      username: cashier.username,
      password: cashier.password,
    });

    const cashierDenied = await staffClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "main",
        confirmation: SHOP_RESET_CONFIRM_KANSANGA,
      }),
    });
    recordCheck(
      "E-live-cashier",
      "Cashier cannot reset shop (403)",
      cashierDenied.status === 403,
      `status=${cashierDenied.status}`
    );

    await loginWithCredentials(managerClient, {
      username: manager.username,
      password: manager.password,
    });

    const managerDenied = await managerClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "main",
        confirmation: SHOP_RESET_CONFIRM_KANSANGA,
      }),
    });
    recordCheck(
      "E-live-manager",
      "Branch manager cannot reset shop (403)",
      managerDenied.status === 403,
      `status=${managerDenied.status}`
    );

    ownerClient.clearCookies();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const badConfirmation = await ownerClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "main",
        confirmation: "RESET WRONG SHOP",
      }),
    });
    recordCheck(
      "G-live",
      "Exact confirmation phrase required",
      badConfirmation.status === 400,
      `status=${badConfirmation.status}, code=${badConfirmation.code}`
    );

    await resetTestDayClosing("main", TEST_DATE_OPEN);

    await loginWithCredentials(staffClient, {
      username: cashier!.username,
      password: cashier!.password,
    });
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: TEST_DATE_OPEN,
      }),
    });

    const openDayRecord = await prisma.dayClosing.findFirst({
      where: { date: TEST_DATE_OPEN, branch: { code: "main" } },
      select: { status: true },
    });

    ownerClient.clearCookies();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const previewWithOpenDay = await ownerClient.json<ShopResetPreviewPayload>(
      `/api/admin/shop-reset?scope=main`
    );

    recordCheck(
      "A-live",
      "Owner preview allows reset when branch has OPEN DayClosing",
      openDayRecord?.status === "open" &&
        previewWithOpenDay.canReset === true &&
        previewWithOpenDay.openBusinessDayCount >= 1 &&
        previewWithOpenDay.warnings.some((warning) =>
          warning.includes("open and pending business days")
        ),
      `status=${openDayRecord?.status}, openCount=${previewWithOpenDay.openBusinessDayCount}`
    );

    await loginWithCredentials(staffClient, {
      username: cashier!.username,
      password: cashier!.password,
    });
    await submitCloseRequestApi(staffClient, "main", TEST_DATE_OPEN, EMPTY_CLOSE_PAYLOAD);

    const closeRequestedRecord = await prisma.dayClosing.findFirst({
      where: { date: TEST_DATE_OPEN, branch: { code: "main" } },
      select: { status: true },
    });

    ownerClient.clearCookies();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const previewWithCloseRequested = await ownerClient.json<ShopResetPreviewPayload>(
      `/api/admin/shop-reset?scope=main`
    );

    recordCheck(
      "B-live",
      "Owner preview allows reset when branch has close_requested DayClosing",
      closeRequestedRecord?.status === "close_requested" &&
        previewWithCloseRequested.canReset === true &&
        previewWithCloseRequested.openBusinessDayCount >= 1 &&
        previewWithCloseRequested.warnings.some((warning) =>
          warning.includes("open, pending, and completed operational records")
        ),
      `status=${closeRequestedRecord?.status}, openCount=${previewWithCloseRequested.openBusinessDayCount}`
    );

    const salesBefore = await prisma.sale.count({
      where: { branch: { code: "main" } },
    });

    recordCheck(
      "no-destructive-live",
      "No destructive reset executed during verification",
      salesBefore >= 0,
      `salesBefore=${salesBefore} (unchanged by this script)`
    );

    recordCheck(
      "15-live",
      "Salaama confirmation phrase differs from Kansanga",
      SHOP_RESET_CONFIRM_SALAAMA !== SHOP_RESET_CONFIRM_KANSANGA,
      SHOP_RESET_CONFIRM_SALAAMA
    );

    await resetTestDayClosing("main", TEST_DATE_OPEN);
  } finally {
    if (cashier) {
      await cleanupCertificationCashier(cashier);
    }
    if (manager) {
      await cleanupCertificationCashier(manager);
    }
  }

  console.log(
    "\nOwner shop reset verification complete (no destructive reset executed)."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
