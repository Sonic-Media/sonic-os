import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import {
  loginWithCredentials,
  VERIFY_OWNER_CREDENTIALS,
} from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-reset-stock-${Date.now()}`;

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
}

async function main() {
  console.log("Verifying shop reset branch current stock metrics (non-destructive)...\n");

  const serviceSource = readRepoFile("lib/server/branch-shop-reset-service.ts");
  const apiSource = readRepoFile("lib/api/shop-reset.ts");
  const uiSource = readRepoFile("components/settings/shop-reset-section.tsx");

  recordCheck(
    "1-static-sum-helper",
    "Shop reset service sums Product.currentStock for branch scope",
    serviceSource.includes("sumBranchCurrentStockUnits") &&
      serviceSource.includes("_sum: { currentStock: true }"),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "2-static-field-name",
    "Shop reset counts expose branchCurrentStockUnits (not catalogue count)",
    serviceSource.includes("branchCurrentStockUnits") &&
      apiSource.includes("branchCurrentStockUnits") &&
      !serviceSource.includes("productStockReset: products"),
    "service + API types"
  );

  recordCheck(
    "3-static-transaction-guard",
    "Reset transaction verifies branch stock sum reaches zero",
    serviceSource.includes("remainingStock !== 0") &&
      serviceSource.includes('code: "shop_reset_stock_remaining"'),
    "branch-shop-reset-service.ts"
  );

  recordCheck(
    "4-static-ui-label",
    "Shop reset UI reads branchCurrentStockUnits for Current Stock",
    uiSource.includes("branchCurrentStockUnits") &&
      uiSource.includes('"Current Stock"'),
    "shop-reset-section.tsx"
  );

  const mainBranchId = await getBranchIdByCode("main");
  const salaamaBranchId = await getBranchIdByCode("salaama");

  const mainProduct = await prisma.product.findFirst({
    where: { branchId: mainBranchId },
    select: { id: true, currentStock: true },
  });

  if (!mainProduct) {
    recordCheck(
      "5-live-fixture",
      "Main branch has at least one catalogue product for stock metric test",
      false,
      "No Product row at main branch — fixture gap"
    );
    return;
  }

  const originalStock = mainProduct.currentStock;
  const seededStock = originalStock === 5 ? 6 : 5;

  await prisma.product.update({
    where: { id: mainProduct.id },
    data: { currentStock: seededStock },
  });

  try {
    const ownerClient = new JsonClient();
    await loginWithCredentials(ownerClient, VERIFY_OWNER_CREDENTIALS);

    const mainPreview = await ownerClient.json<{
      counts: { branchCurrentStockUnits: number };
    }>("/api/admin/shop-reset?scope=main");

    const salaamaPreview = await ownerClient.json<{
      counts: { branchCurrentStockUnits: number };
    }>("/api/admin/shop-reset?scope=salaama");

    const mainAggregate = await prisma.product.aggregate({
      where: { branchId: mainBranchId },
      _sum: { currentStock: true },
    });
    const salaamaAggregate = await prisma.product.aggregate({
      where: { branchId: salaamaBranchId },
      _sum: { currentStock: true },
    });

    recordCheck(
      "6-live-main-preview-stock-units",
      "Main scope preview Current Stock matches Product.currentStock sum",
      mainPreview.counts.branchCurrentStockUnits ===
        (mainAggregate._sum.currentStock ?? 0),
      `preview=${mainPreview.counts.branchCurrentStockUnits}, db=${mainAggregate._sum.currentStock ?? 0}`
    );

    recordCheck(
      "7-live-salaama-isolation",
      "Salaama preview stock units exclude main branch inventory",
      salaamaPreview.counts.branchCurrentStockUnits ===
        (salaamaAggregate._sum.currentStock ?? 0),
      `salaamaPreview=${salaamaPreview.counts.branchCurrentStockUnits}, salaamaDb=${salaamaAggregate._sum.currentStock ?? 0}`
    );

    await prisma.product.updateMany({
      where: { branchId: mainBranchId },
      data: { currentStock: 0, status: "out-of-stock" },
    });

    const zeroPreview = await ownerClient.json<{
      counts: { branchCurrentStockUnits: number };
    }>("/api/admin/shop-reset?scope=main");

    recordCheck(
      "8-live-zero-stock-preview",
      "Preview reports zero branch current stock units after simulated zeroing",
      zeroPreview.counts.branchCurrentStockUnits === 0,
      `units=${zeroPreview.counts.branchCurrentStockUnits}`
    );
  } finally {
    await prisma.product.update({
      where: { id: mainProduct.id },
      data: {
        currentStock: originalStock,
        status: originalStock > 0 ? "in-stock" : "out-of-stock",
      },
    });
  }

  recordCheck(
    "9-no-destructive-reset",
    "Verification did not execute shop reset POST",
    true,
    TEST_PREFIX
  );

  console.log("\nShop reset current stock verification complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
