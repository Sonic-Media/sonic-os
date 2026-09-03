import "dotenv/config";
import assert from "node:assert/strict";
import { loadEnvFiles } from "../lib/env/load-env";
import { prisma } from "../lib/db";
import { computeDashboardMetrics } from "../lib/stock/calculations";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

loadEnvFiles();

if (/neon/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run branch isolation verification against Neon.");
}

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-branch-${Date.now()}`;

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

type StockProductRow = {
  id: string;
  name: string;
  currentStock: number;
  buyingPrice: number;
  branch?: string;
};

class BranchIsolationVerifier implements JsonClient {
  private cookieHeader = "";

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (this.cookieHeader) {
      headers.set("Cookie", this.cookieHeader);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

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
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }
}

async function setActiveBranch(client: BranchIsolationVerifier, branch: string) {
  await client.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "set-active-branch",
      branchCode: branch,
    }),
  });
}

async function countBranchProducts(branchCode: string) {
  return prisma.product.count({
    where: {
      deletedAt: null,
      branch: { code: branchCode },
    },
  });
}

async function branchInventoryValue(branchCode: string) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, branch: { code: branchCode } },
    select: { currentStock: true, buyingPrice: true },
  });

  return products.reduce(
    (sum, product) => sum + product.currentStock * product.buyingPrice,
    0
  );
}

function inventoryFromProducts(products: StockProductRow[]) {
  return products.reduce(
    (sum, product) => sum + product.currentStock * product.buyingPrice,
    0
  );
}

async function main() {
  const client = new BranchIsolationVerifier();
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);

  const salaamaDbCount = await countBranchProducts("salaama");
  const kansangaDbCount = await countBranchProducts("main");
  const salaamaDbValue = await branchInventoryValue("salaama");
  const kansangaDbValue = await branchInventoryValue("main");

  console.log("DB salaama products:", salaamaDbCount, "value:", salaamaDbValue);
  console.log("DB kansanga products:", kansangaDbCount, "value:", kansangaDbValue);

  // Acceptance A: Salaama retains its catalog and inventory value.
  await setActiveBranch(client, "salaama");
  const salaamaProducts = await client.json<StockProductRow[]>("/api/stock/products");
  const salaamaMovements = await client.json<Array<{ branch: string }>>(
    "/api/stock/movements"
  );

  assert.equal(salaamaProducts.length, salaamaDbCount);
  assert.ok(
    salaamaMovements.every((movement) => movement.branch === "salaama"),
    "Salaama movements must belong to Salaama"
  );

  const salaamaMetrics = computeDashboardMetrics(
    salaamaProducts as never,
    salaamaMovements as never,
    new Date().toISOString().slice(0, 10)
  );
  assert.equal(salaamaMetrics.totalProducts, salaamaDbCount);
  assert.equal(salaamaMetrics.inventoryValue, salaamaDbValue);

  if (salaamaDbCount === 15) {
    assert.equal(salaamaMetrics.inventoryValue, 752_000);
  }

  // Acceptance B: Kansanga is empty and does not leak Salaama data.
  await setActiveBranch(client, "main");
  const kansangaProductsBefore = await client.json<StockProductRow[]>(
    "/api/stock/products"
  );
  const kansangaMovements = await client.json<Array<{ branch: string }>>(
    "/api/stock/movements"
  );

  assert.equal(kansangaProductsBefore.length, kansangaDbCount);
  assert.ok(
    kansangaMovements.every((movement) => movement.branch === "main"),
    "Kansanga movements must belong to Kansanga"
  );
  assert.equal(inventoryFromProducts(kansangaProductsBefore), kansangaDbValue);

  const salaamaIds = new Set(salaamaProducts.map((product) => product.id));
  assert.ok(
    kansangaProductsBefore.every((product) => !salaamaIds.has(product.id)),
    "Kansanga must not expose Salaama products"
  );

  // Acceptance C/D: create product + stock in Kansanga, verify isolation.
  const created = await client.json<StockProductRow>("/api/stock/products", {
    method: "POST",
    body: JSON.stringify({
      name: `${TEST_PREFIX} Kansanga-only`,
      category: "flash-disks",
      buyingPrice: 5000,
      sellingPrice: 8000,
      minimumStockLevel: 1,
    }),
  });

  await client.json("/api/stock/movements", {
    method: "POST",
    body: JSON.stringify({
      productId: created.id,
      movement: "in",
      quantity: 3,
      reason: "Purchase",
      branch: "main",
      notes: `${TEST_PREFIX} stock in`,
    }),
  });

  const kansangaProductsAfterCreate = await client.json<StockProductRow[]>(
    "/api/stock/products"
  );
  assert.equal(kansangaProductsAfterCreate.length, kansangaDbCount + 1);
  assert.ok(
    kansangaProductsAfterCreate.some((product) => product.id === created.id),
    "Kansanga product must appear in Kansanga"
  );

  await setActiveBranch(client, "salaama");
  const salaamaAfterCreate = await client.json<StockProductRow[]>(
    "/api/stock/products"
  );
  assert.equal(salaamaAfterCreate.length, salaamaDbCount);
  assert.equal(inventoryFromProducts(salaamaAfterCreate), salaamaDbValue);
  assert.ok(
    !salaamaAfterCreate.some((product) => product.id === created.id),
    "Salaama must not expose the Kansanga product"
  );

  await setActiveBranch(client, "main");
  const kansangaAfterReturn = await client.json<StockProductRow[]>(
    "/api/stock/products"
  );
  const persisted = kansangaAfterReturn.find((product) => product.id === created.id);
  assert.ok(persisted, "Kansanga product must remain after switching back");
  assert.equal(persisted?.currentStock, 3);

  await client.json(`/api/stock/products/${created.id}`, { method: "DELETE" });

  console.log("PASS branch isolation verification");
}

main()
  .catch((error) => {
    console.error("FAIL branch isolation verification:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
