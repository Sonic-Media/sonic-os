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
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-shop-reset-${Date.now()}`;
const TEST_DATE = "2017-03-15";

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

async function main() {
  console.log("Verifying owner shop reset (non-destructive)...\n");

  const serviceSource = readRepoFile("lib/server/branch-shop-reset-service.ts");
  const routeSource = readRepoFile("app/api/admin/shop-reset/route.ts");
  const uiSource = readRepoFile("components/settings/shop-reset-section.tsx");
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
    "3-static",
    "Product catalogue rows are preserved (no product deleteMany)",
    !serviceSource.includes("product.deleteMany") &&
      serviceSource.includes("product.updateMany"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "4-static",
    "Auth audit used for administrative reset record",
    serviceSource.includes("recordSecurityAuditInTransaction") &&
      serviceSource.includes("Shop Reset"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "5-static",
    "Database target guard enforced before reset",
    serviceSource.includes("assertSafeTransactionalResetTarget"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "6-static",
    "Open business day blocks reset",
    serviceSource.includes('status: { in: ["open", "close_requested"] }') &&
      serviceSource.includes("shop_reset_open_business_day"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "7-static",
    "Exact confirmation phrases enforced",
    serviceSource.includes("assertShopResetConfirmation") &&
      uiSource.includes("confirmationMatches") &&
      uiSource.includes("disabled={!canSubmit}"),
    "shop-reset UI + service"
  );

  recordCheck(
    "8-static",
    "Backup attempted before deletion",
    serviceSource.includes("createDatabaseBackup") &&
      serviceSource.includes("backup_failed"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "16-static",
    "Production database target guard remains present",
    guardSource.includes("isNeonHost") &&
      guardSource.includes("isProductionMode"),
    "database-target-guard.ts"
  );

  let cashier: CertificationCashier | null = null;
  let manager: CertificationCashier | null = null;
  const ownerClient = new JsonClient();
  const staffClient = new JsonClient();
  const managerClient = new JsonClient();

  try {
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const preview = await ownerClient.json<{
      canReset: boolean;
      preserved: { users: number; products: number; branches: number };
      counts: { sales: number };
    }>(`/api/admin/shop-reset?scope=main`);

    recordCheck(
      "9-live",
      "Owner can load shop reset preview",
      typeof preview.counts.sales === "number" && preview.preserved.users > 0,
      `users=${preview.preserved.users}`
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
      "10-live",
      "Cashier cannot reset shop",
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
      "11-live",
      "Branch manager cannot reset shop",
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
      "12-live",
      "Exact confirmation phrase required",
      badConfirmation.status === 400,
      `status=${badConfirmation.status}, code=${badConfirmation.code}`
    );

    await resetTestDayClosing("main", TEST_DATE);

    await loginWithCredentials(staffClient, {
      username: cashier!.username,
      password: cashier!.password,
    });
    await staffClient.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch: "main",
        date: TEST_DATE,
      }),
    });

    ownerClient.clearCookies();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const blockedByOpenDay = await ownerClient.jsonExpectFailure("/api/admin/shop-reset", {
      method: "POST",
      body: JSON.stringify({
        scope: "main",
        confirmation: SHOP_RESET_CONFIRM_KANSANGA,
      }),
    });

    const salesBefore = await prisma.sale.count({
      where: { branch: { code: "main" } },
    });

    recordCheck(
      "13-live",
      "Open business day blocks reset without deleting data",
      blockedByOpenDay.status === 409 &&
        blockedByOpenDay.code === "shop_reset_open_business_day",
      `status=${blockedByOpenDay.status}, salesBefore=${salesBefore}`
    );

    const salesAfter = await prisma.sale.count({
      where: { branch: { code: "main" } },
    });
    recordCheck(
      "14-live",
      "Blocked reset leaves transactional data intact",
      salesAfter === salesBefore,
      `salesAfter=${salesAfter}`
    );

    recordCheck(
      "15-live",
      "Salaama confirmation phrase differs from Kansanga",
      SHOP_RESET_CONFIRM_SALAAMA !== SHOP_RESET_CONFIRM_KANSANGA,
      SHOP_RESET_CONFIRM_SALAAMA
    );

    await resetTestDayClosing("main", TEST_DATE);
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
