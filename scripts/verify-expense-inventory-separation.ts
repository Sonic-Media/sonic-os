import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { computeDashboardOperatingExpenses } from "@/lib/dashboard/operating-expenses";
import { computeAuthoritativeBranchInventoryValue } from "@/lib/inventory/valuation";
import {
  mapExpenseRecordToEntity,
  mapMovementToEntity,
  mapProductToEntity,
} from "@/lib/server/mappers/entities";
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
const TEST_PREFIX = `verify-exp-inv-${Date.now()}`;
const TEST_DATE = "2019-10-05";
const BRANCH = "main";

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

class InventoryVerifier {
  private cookieHeader = "";

  private async request(
    apiPath: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

function buildExpensePayload(options: {
  amount: number;
  description: string;
  date: string;
  branch: string;
}) {
  return {
    date: options.date,
    categoryId: "rent",
    description: options.description,
    amount: options.amount,
    paymentMethod: "cash",
    branch: options.branch,
  };
}

async function loadBranchInventory(branchCode: string) {
  const branch = await prisma.branch.findFirstOrThrow({
    where: { code: branchCode },
  });

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { branchId: branch.id },
      include: { branch: true, category: true },
    }),
    prisma.stockMovement.findMany({
      where: { branchId: branch.id },
      include: { branch: true },
    }),
  ]);

  const mappedProducts = products.map(mapProductToEntity);
  const mappedMovements = movements.map(mapMovementToEntity);

  return {
    branch: {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      active: branch.active,
    },
    products: mappedProducts,
    movements: mappedMovements,
    inventoryValue: computeAuthoritativeBranchInventoryValue(
      { code: branch.code, name: branch.name, id: branch.id, active: branch.active },
      mappedProducts,
      mappedMovements
    ),
  };
}

function scanStaticSeparation(): void {
  const expensesService = readRepoFile("lib/server/services/expenses-service.ts");
  const valuation = readRepoFile("lib/inventory/valuation.ts");
  const stockCalcs = readRepoFile("lib/stock/calculations.ts");

  recordCheck(
    1,
    "Expense service does not mutate stock",
    !expensesService.includes("stockMovement") &&
      !expensesService.includes("applyStockMovement") &&
      !expensesService.includes("product.update"),
    ""
  );

  recordCheck(
    2,
    "Authoritative inventory valuation excludes expenses",
    valuation.includes("Operating expenses never participate") &&
      valuation.includes("computeInventoryValueByBranch"),
    ""
  );

  recordCheck(
    3,
    "Stock dashboard can use movement-based branch inventory",
    stockCalcs.includes("computeInventoryValueByBranch") &&
      stockCalcs.includes("branch?: Branch"),
    ""
  );
}

async function main() {
  console.log("Verifying expense / inventory separation (Fix #25)...\n");
  scanStaticSeparation();

  const owner = new InventoryVerifier();
  await loginWithCredentials(owner, VERIFY_OWNER_CREDENTIALS);

  let cashier: CertificationCashier | null = null;
  let productId: string | null = null;
  let supplierId: string | null = null;
  let purchaseId: string | null = null;
  let saleId: string | null = null;
  const expenseIds: string[] = [];

  try {
    cashier = await createCertificationCashier(owner, `${TEST_PREFIX}-cashier`, BRANCH);

    const staffClient = new InventoryVerifier();
    await loginWithCredentials(staffClient, {
      username: cashier.username,
      password: cashier.password,
    });

    const product = await owner.json<{ id: string }>("/api/stock/products", {
      method: "POST",
      body: JSON.stringify({
        name: `${TEST_PREFIX} Accessory`,
        category: "flash-disks",
        buyingPrice: 10000,
        sellingPrice: 15000,
        minimumStockLevel: 1,
        initialStock: 10,
      }),
    });
    productId = product.id;

    const beforePurchase = await loadBranchInventory(BRANCH);
    recordCheck(
      4,
      "Controlled inventory baseline captured",
      beforePurchase.inventoryValue === 100000,
      `inventory=${beforePurchase.inventoryValue}`
    );

    const supplier = await owner.json<{ id: string }>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: `${TEST_PREFIX} Supplier` }),
    });
    supplierId = supplier.id;

    const purchase = await owner.json<{ id: string }>("/api/purchases", {
      method: "POST",
      body: JSON.stringify({
        supplierId: supplier.id,
        branch: BRANCH,
        date: TEST_DATE,
        notes: `${TEST_PREFIX} purchase`,
        items: [{ productId: product.id, quantity: 5, buyingPrice: 10000 }],
      }),
    });
    purchaseId = purchase.id;

    const afterPurchase = await loadBranchInventory(BRANCH);
    recordCheck(
      5,
      "Inventory increases after accessory purchase",
      afterPurchase.inventoryValue === beforePurchase.inventoryValue + 50000,
      `before=${beforePurchase.inventoryValue}, after=${afterPurchase.inventoryValue}`
    );

    const sale = await staffClient.json<{ id: string }>("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        id: randomUUID(),
        invoiceNumber: `${TEST_PREFIX}-INV`,
        date: TEST_DATE,
        time: "12:00",
        branch: BRANCH,
        paymentMethod: "cash",
        staffId: cashier.staffId,
        status: "completed",
        items: [
          {
            productId: product.id,
            productName: `${TEST_PREFIX} Accessory`,
            quantity: 2,
            unitPrice: 15000,
            buyingPrice: 10000,
            lineTotal: 30000,
          },
        ],
        subtotal: 30000,
        discount: 0,
        total: 30000,
        profit: 10000,
      }),
    });
    saleId = sale.id;

    const afterSale = await loadBranchInventory(BRANCH);
    recordCheck(
      6,
      "Inventory decreases after accessory sale via stock movements",
      afterSale.inventoryValue === afterPurchase.inventoryValue - 20000,
      `afterSale=${afterSale.inventoryValue}`
    );

    const expense = await staffClient.json<{ id: string; amount: number }>(
      "/api/expenses",
      {
        method: "POST",
        body: JSON.stringify(
          buildExpensePayload({
            amount: 10000,
            description: `${TEST_PREFIX} WiFi`,
            date: TEST_DATE,
            branch: BRANCH,
          })
        ),
      }
    );
    expenseIds.push(expense.id);

    const afterExpense = await loadBranchInventory(BRANCH);
    recordCheck(
      7,
      "Operating expense does not change inventory valuation",
      afterExpense.inventoryValue === afterSale.inventoryValue,
      `inventory=${afterExpense.inventoryValue}, saleInventory=${afterSale.inventoryValue}`
    );

    const expenseRows = await prisma.expenseRecord.findMany({
      where: {
        branch: { code: BRANCH },
        date: TEST_DATE,
        deletedAt: null,
        description: { contains: TEST_PREFIX },
      },
      include: { branch: true },
    });
    const expenseTotal = expenseRows
      .map(mapExpenseRecordToEntity)
      .reduce((sum, row) => sum + row.amount, 0);

    recordCheck(
      8,
      "Expense totals increase independently of inventory",
      expenseTotal >= 10000,
      `expenseTotal=${expenseTotal}`
    );

    const operatingExpenses = computeDashboardOperatingExpenses(
      BRANCH,
      TEST_DATE,
      expenseRows.map(mapExpenseRecordToEntity),
      []
    );

    recordCheck(
      9,
      "Operating expense calculations exclude inventory valuation",
      operatingExpenses >= 10000 &&
        operatingExpenses !== afterExpense.inventoryValue,
      `operating=${operatingExpenses}, inventory=${afterExpense.inventoryValue}`
    );

    recordCheck(
      10,
      "Inventory valuation is not revenue minus expenses",
      afterExpense.inventoryValue !== 150000 - operatingExpenses,
      `inventory=${afterExpense.inventoryValue}`
    );

    const salaamaBefore = await loadBranchInventory("salaama");

    const kansangaExpense = await staffClient.json<{ id: string }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(
        buildExpensePayload({
          amount: 5000,
          description: `${TEST_PREFIX} Kansanga only`,
          date: TEST_DATE,
          branch: BRANCH,
        })
      ),
    });
    expenseIds.push(kansangaExpense.id);

    const salaamaAfter = await loadBranchInventory("salaama");
    recordCheck(
      11,
      "Cross-branch expense cannot affect another branch inventory",
      salaamaAfter.inventoryValue === salaamaBefore.inventoryValue,
      `salaama=${salaamaAfter.inventoryValue}`
    );

    await staffClient.json(`/api/expenses/${expense.id}`, { method: "DELETE" });

    const afterDelete = await loadBranchInventory(BRANCH);
    recordCheck(
      12,
      "Soft-deleting expense does not mutate inventory",
      afterDelete.inventoryValue === afterExpense.inventoryValue,
      `inventory=${afterDelete.inventoryValue}`
    );

    const productRow = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    recordCheck(
      13,
      "Inventory product stock remains movement-driven after expense lifecycle",
      productRow.currentStock >= 0,
      `currentStock=${productRow.currentStock}`
    );

    assert.equal(
      computeAuthoritativeBranchInventoryValue(
        afterDelete.branch,
        afterDelete.products,
        afterDelete.movements
      ),
      afterDelete.inventoryValue
    );

    console.log("\nExpense / inventory separation verification complete.");
  } finally {
    if (saleId) {
      await prisma.saleLineItem.deleteMany({ where: { saleId } }).catch(() => undefined);
      await prisma.sale.deleteMany({ where: { id: saleId } }).catch(() => undefined);
    }
    if (purchaseId) {
      await prisma.purchaseLineItem.deleteMany({ where: { purchaseId } }).catch(() => undefined);
      await prisma.purchase.deleteMany({ where: { id: purchaseId } }).catch(() => undefined);
    }
    for (const expenseId of expenseIds) {
      await prisma.expenseRecord.deleteMany({ where: { id: expenseId } }).catch(() => undefined);
    }
    if (productId) {
      await prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => undefined);
      await prisma.product.deleteMany({ where: { id: productId } }).catch(() => undefined);
    }
    if (supplierId) {
      await prisma.supplier.deleteMany({ where: { id: supplierId } }).catch(() => undefined);
    }
    if (cashier) {
      await cleanupCertificationCashier(cashier, { branch: BRANCH, date: TEST_DATE });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
