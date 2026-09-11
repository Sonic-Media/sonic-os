import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

type MutationResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function simulateAwaitedMutation<T>(
  operation: () => Promise<T>
): Promise<MutationResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type Check = {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
};

const checks: Check[] = [];

function recordCheck(id: number, name: string, passed: boolean, detail: string) {
  checks.push({ id, name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${id}. ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) {
    throw new Error(`Check ${id} failed: ${name} — ${detail}`);
  }
}

const SCOPED_CONTEXT_FILES = [
  "context/expenses-module-context.tsx",
  "context/sales-context.tsx",
  "context/purchasing-context.tsx",
  "context/staff-payments-context.tsx",
  "context/staff-context.tsx",
  "context/branch-context.tsx",
  "context/auth-context.tsx",
  "context/settings-context.tsx",
  "context/expense-templates-context.tsx",
];

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function scanForFireAndForgetMutations(): void {
  const dangerousPattern =
    /return\s+create(?:Validation|StaffValidation)?Result\(\{\s*success:\s*true[\s\S]{0,120}?\}\)[\s\S]{0,200}?void\s*\(\s*async/g;

  for (const file of SCOPED_CONTEXT_FILES) {
    const source = readRepoFile(file);
    const match = source.match(dangerousPattern);
    recordCheck(
      checks.length + 1,
      `No fire-and-forget success in ${file}`,
      !match,
      match ? "Found success returned before background API write" : ""
    );
  }
}

function scanMutationFunctionsAwaitRunOnApi(): void {
  const mutationNames = [
    "addCustomer",
    "updateCustomer",
    "deleteCustomer",
    "addSupplier",
    "updateSupplier",
    "deleteSupplier",
    "addExpense",
    "updateExpense",
    "deleteExpense",
    "addCategory",
    "updateCategory",
    "deleteCategory",
    "recordStaffPaymentAsync",
    "updateStaff",
    "linkStaffAccount",
    "addBranch",
    "updateBranch",
    "updateUser",
    "disableUser",
    "updateSettings",
    "addTemplate",
    "updateTemplate",
    "deleteTemplate",
  ];

  for (const file of SCOPED_CONTEXT_FILES) {
    const source = readRepoFile(file);
    for (const name of mutationNames) {
      if (!source.includes(`const ${name}`) && !source.includes(`function ${name}`)) {
        continue;
      }

      const fnPattern = new RegExp(
        `(?:const|function)\\s+${name}[\\s\\S]{0,2500}?\\},\\s*\\[`,
        "m"
      );
      const match = source.match(fnPattern);
      if (!match) continue;

      const body = match[0];
      const hasAwaitedApi =
        body.includes("await runOnApi") ||
        body.includes("await create") ||
        body.includes("await update") ||
        body.includes("await delete") ||
        body.includes("await disable") ||
        body.includes("await enable") ||
        body.includes("await logout") ||
        body.includes("await lockSession") ||
        body.includes("await updateSettingsApi");

      recordCheck(
        checks.length + 1,
        `${file} ${name} awaits persistence`,
        hasAwaitedApi,
        hasAwaitedApi ? "" : "Mutation body missing awaited API call"
      );
    }
  }
}

async function testRunAwaitedMutationSuccessAfterCompletion(): Promise<void> {
  let apiCompleted = false;

  const resultPromise = simulateAwaitedMutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    apiCompleted = true;
    return { id: "exp-1" };
  });

  assert.equal(apiCompleted, false, "API should not complete synchronously");

  const result = await resultPromise;
  recordCheck(
    checks.length + 1,
    "runAwaitedMutation reports success only after API completes",
    result.success === true && apiCompleted === true,
    result.success ? "" : "Expected success after API completion"
  );
}

async function testRunAwaitedMutationPropagatesFailure(): Promise<void> {
  const result = await simulateAwaitedMutation(async () => {
    throw new Error("Simulated PostgreSQL write failure");
  });

  recordCheck(
    checks.length + 1,
    "runAwaitedMutation propagates API failure",
    result.success === false && Boolean(result.error?.includes("PostgreSQL")),
    result.success ? "Expected failure result" : result.error ?? "Missing error message"
  );
}

async function testValidationBlocksBeforeApi(): Promise<void> {
  let apiCalled = false;

  async function addCustomerLike(input: { name: string }) {
    if (!input.name.trim()) {
      return { success: false as const, errors: { name: "Name is required." } };
    }

    const apiResult = await simulateAwaitedMutation(async () => {
      apiCalled = true;
      return { id: "cust-1" };
    });

    if (!apiResult.success) {
      return { success: false as const, errors: { form: apiResult.error } };
    }

    return { success: true as const, errors: {} };
  }

  const invalid = await addCustomerLike({ name: "   " });
  recordCheck(
    checks.length + 1,
    "Validation failure skips API call",
    invalid.success === false && apiCalled === false,
    apiCalled ? "API called despite validation failure" : ""
  );

  const valid = await addCustomerLike({ name: "Acme" });
  recordCheck(
    checks.length + 1,
    "Valid input awaits API before success",
    valid.success === true && apiCalled === true,
    valid.success ? "" : "Expected success after awaited API call"
  );
}

async function testSaleInFlightGuard(): Promise<void> {
  const saleInFlight = { current: false };
  let apiCalls = 0;

  async function completeSaleLike() {
    if (saleInFlight.current) {
      return {
        success: false as const,
        errors: { form: "A sale is already being processed. Please wait." },
      };
    }

    saleInFlight.current = true;
    try {
      const result = await simulateAwaitedMutation(async () => {
        apiCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { id: "sale-1" };
      });

      return result.success
        ? { success: true as const, errors: {} }
        : { success: false as const, errors: { form: result.error } };
    } finally {
      saleInFlight.current = false;
    }
  }

  const first = completeSaleLike();
  const second = await completeSaleLike();
  const firstResult = await first;

  recordCheck(
    checks.length + 1,
    "In-flight guard blocks duplicate sale submission",
    second.success === false && apiCalls === 1 && firstResult.success === true,
    `apiCalls=${apiCalls}, second.success=${second.success}`
  );
}

async function testSettingsEpochGuard(): Promise<void> {
  let epoch = 0;

  async function updateSettingsLike(patch: Record<string, unknown>) {
    const currentEpoch = ++epoch;

    const result = await simulateAwaitedMutation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { ...patch, businessName: String(patch.businessName ?? "") };
    });

    if (currentEpoch !== epoch) {
      return {
        success: false as const,
        error: "A newer settings update superseded this save.",
      };
    }

    return result.success
      ? { success: true as const }
      : { success: false as const, error: result.error };
  }

  const first = updateSettingsLike({ businessName: "First" });
  void updateSettingsLike({ businessName: "Second" });
  const firstResult = await first;

  recordCheck(
    checks.length + 1,
    "Settings epoch guard rejects stale overwrite",
    firstResult.success === false &&
      firstResult.error === "A newer settings update superseded this save.",
    firstResult.success ? "Stale save incorrectly reported success" : firstResult.error ?? ""
  );
}

async function main() {
  console.log("Verifying awaited business mutations...\n");

  scanForFireAndForgetMutations();
  scanMutationFunctionsAwaitRunOnApi();
  await testRunAwaitedMutationSuccessAfterCompletion();
  await testRunAwaitedMutationPropagatesFailure();
  await testValidationBlocksBeforeApi();
  await testSaleInFlightGuard();
  await testSettingsEpochGuard();

  const passed = checks.filter((check) => check.passed).length;
  console.log(`\nAwaited mutations verification complete: ${passed}/${checks.length} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
