import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { computeBranchNetQuantity } from "@/lib/stock/calculations";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TEST_PREFIX = `verify-stock-${Date.now()}`;

type JsonRecord = Record<string, unknown>;

class StockVerifier {
  private cookieHeader = "";

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

    return response;
  }

  private async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(path, options);
    const payload = (await response.json()) as { data?: T; error?: JsonRecord };

    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error &&
        typeof payload.error.message === "string"
          ? payload.error.message
          : `Request failed: ${response.status} ${path}`;
      throw new Error(message);
    }

    return payload.data as T;
  }

  async login() {
    await this.json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username: "owner",
        password: "owner",
      }),
    });
  }

  async createProduct(name: string) {
    return this.json<JsonRecord>("/api/stock/products", {
      method: "POST",
      body: JSON.stringify({
        name,
        category: "flash-disks",
        buyingPrice: 10000,
        sellingPrice: 15000,
        minimumStockLevel: 2,
      }),
    });
  }

  async updateProduct(id: string, name: string, minimumStockLevel: number) {
    return this.json<JsonRecord>(`/api/stock/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        category: "flash-disks",
        buyingPrice: 10000,
        sellingPrice: 15000,
        minimumStockLevel,
      }),
    });
  }

  async deleteProduct(id: string) {
    await this.request(`/api/stock/products/${id}`, { method: "DELETE" });
  }

  async addStock(productId: string, quantity: number, branch = "main") {
    return this.json<JsonRecord>("/api/stock/movements", {
      method: "POST",
      body: JSON.stringify({
        productId,
        movement: "in",
        quantity,
        reason: "Purchase",
        branch,
        notes: `${TEST_PREFIX} stock in`,
      }),
    });
  }

  async removeStock(productId: string, quantity: number, branch = "main") {
    return this.json<JsonRecord>("/api/stock/movements", {
      method: "POST",
      body: JSON.stringify({
        productId,
        movement: "out",
        quantity,
        reason: "Sale",
        branch,
        notes: `${TEST_PREFIX} stock out`,
      }),
    });
  }

  async listProducts() {
    return this.json<JsonRecord[]>("/api/stock/products");
  }

  async listMovements() {
    return this.json<JsonRecord[]>("/api/stock/movements");
  }

  async createSale(
    productId: string,
    productName: string,
    quantity: number,
    invoiceSuffix = "INV"
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const invoiceNumber = `${TEST_PREFIX}-${invoiceSuffix}`;

    return this.json<JsonRecord>("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        invoiceNumber,
        date: today,
        time: "12:00",
        items: [
          {
            productId,
            productName,
            quantity,
            unitPrice: 15000,
            buyingPrice: 10000,
            lineTotal: 15000 * quantity,
          },
        ],
        subtotal: 15000 * quantity,
        discount: 0,
        total: 15000 * quantity,
        profit: 5000 * quantity,
        paymentMethod: "cash",
        branch: "main",
        status: "completed",
        createdAt: new Date().toISOString(),
      }),
    });
  }

  async expectFailure(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      throw new Error(`${label}: expected failure but succeeded`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("expected failure")) {
        throw error;
      }
      console.log(`PASS ${label}`);
    }
  }
}

async function assertDbProduct(
  productId: string,
  expected: { name?: string; currentStock?: number; status?: string }
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  assert.ok(product, "product exists in PostgreSQL");

  if (expected.name !== undefined) {
    assert.equal(product.name, expected.name);
  }

  if (expected.currentStock !== undefined) {
    assert.equal(product.currentStock, expected.currentStock);
  }

  if (expected.status !== undefined) {
    assert.equal(product.status, expected.status);
  }

  return product;
}

async function assertMovementBranch(productId: string, branchCode: string) {
  const branch = await prisma.branch.findUnique({ where: { code: branchCode } });
  assert.ok(branch, `branch ${branchCode} exists`);

  const movement = await prisma.stockMovement.findFirst({
    where: { productId, branchId: branch.id },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(movement, `movement recorded for branch ${branchCode}`);
  return movement;
}

async function cleanup(productId: string | null) {
  if (!productId) return;

  await prisma.stockMovement.deleteMany({ where: { productId } });
  await prisma.stockPriceChange.deleteMany({ where: { productId } });
  await prisma.saleLineItem.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
}

async function main() {
  const verifier = new StockVerifier();
  let productId: string | null = null;

  try {
    console.log("Stock module verification starting...");
    await verifier.login();
    console.log("PASS login");

    const created = await verifier.createProduct(`${TEST_PREFIX} Flash Disk`);
    productId = String(created.id);
    assert.ok(productId, "created product id");
    assert.equal(created.currentStock, 0);
    console.log("PASS create product");

    await assertDbProduct(productId, {
      name: `${TEST_PREFIX} Flash Disk`,
      currentStock: 0,
      status: "out-of-stock",
    });
    console.log("PASS create product persisted in PostgreSQL");

    const updated = await verifier.updateProduct(
      productId,
      `${TEST_PREFIX} Flash Disk 64GB`,
      5
    );
    assert.equal(updated.name, `${TEST_PREFIX} Flash Disk 64GB`);
    console.log("PASS edit product");

    await assertDbProduct(productId, {
      name: `${TEST_PREFIX} Flash Disk 64GB`,
      currentStock: 0,
      status: "out-of-stock",
    });
    console.log("PASS edit product status recomputed from minimum stock level");

    const stockIn = await verifier.addStock(productId, 10, "main");
    assert.equal(stockIn.branch, "main");
    assert.equal(stockIn.quantity, 10);
    console.log("PASS add stock");

    await assertDbProduct(productId, {
      currentStock: 10,
      status: "in-stock",
    });
    await assertMovementBranch(productId, "main");
    console.log("PASS branch assignment on stock in");

    const productsAfterIn = await verifier.listProducts();
    const listed = productsAfterIn.find((item) => item.id === productId);
    assert.equal(listed?.currentStock, 10);
    console.log("PASS product list reflects stock after refresh");

    const movements = await verifier.listMovements();
    const productMovements = movements.filter(
      (movement) => movement.productId === productId
    );
    assert.ok(productMovements.length >= 1, "movement history exists");
    console.log("PASS movement history");

    const branchNet = computeBranchNetQuantity(
      "main",
      productId,
      productMovements.map((movement) => ({
        id: String(movement.id),
        date: String(movement.date),
        productId: String(movement.productId),
        productName: String(movement.productName),
        movement: movement.movement as "in" | "out",
        quantity: Number(movement.quantity),
        reason: String(movement.reason),
        branch: movement.branch as "main",
        createdAt: String(movement.createdAt ?? new Date().toISOString()),
      }))
    );
    assert.equal(branchNet, 10);
    console.log("PASS branch net quantity matches movements");

    await verifier.createSale(
      productId,
      `${TEST_PREFIX} Flash Disk 64GB`,
      3,
      "INV-1"
    );
    await assertDbProduct(productId, { currentStock: 7 });
    console.log("PASS sale reduces stock");

    await verifier.expectFailure("negative stock blocked", () =>
      verifier.removeStock(productId!, 999, "main")
    );

    await verifier.expectFailure("oversized sale blocked", () =>
      verifier.createSale(
        productId!,
        `${TEST_PREFIX} Flash Disk 64GB`,
        999,
        "INV-2"
      )
    );

    await prisma.sale.deleteMany({
      where: { invoiceNumber: { startsWith: `${TEST_PREFIX}-INV` } },
    });
    await prisma.stockMovement.deleteMany({
      where: { productId, notes: { contains: TEST_PREFIX } },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { currentStock: 0, status: "out-of-stock" },
    });

    await verifier.deleteProduct(productId);
    const deleted = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(deleted, null);
    productId = null;
    console.log("PASS delete product");

    console.log("\nAll stock module checks passed.");
  } finally {
    await cleanup(productId);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nStock module verification failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
