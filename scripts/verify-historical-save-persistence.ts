import assert from "node:assert/strict";
import {
  awaitInFlightSave,
  beginExplicitSave,
  clearInFlightSaveIfCurrent,
  createSaveCoordinatorState,
  endExplicitSave,
  isAutosavePermitted,
  shouldApplySaveResult,
  trackInFlightSave,
} from "../lib/entry-form/save-coordination";

type PersistedEntry = {
  id: string;
  status: "draft" | "completed";
  sales: number;
};

type SaveFlowHarness = {
  coordinator: ReturnType<typeof createSaveCoordinatorState>;
  routerPushed: string[];
  upsertCalls: Array<{ status: PersistedEntry["status"]; sales: number }>;
  upsertEntry: (entry: PersistedEntry) => Promise<PersistedEntry>;
  router: { push: (path: string) => void };
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createHarness(options?: {
  upsertImpl?: (entry: PersistedEntry) => Promise<PersistedEntry>;
}): SaveFlowHarness {
  const coordinator = createSaveCoordinatorState();
  const routerPushed: string[] = [];
  const upsertCalls: Array<{ status: PersistedEntry["status"]; sales: number }> =
    [];

  const upsertEntry = async (entry: PersistedEntry): Promise<PersistedEntry> => {
    upsertCalls.push({ status: entry.status, sales: entry.sales });
    if (options?.upsertImpl) {
      return options.upsertImpl(entry);
    }
    return entry;
  };

  return {
    coordinator,
    routerPushed,
    upsertCalls,
    upsertEntry,
    router: {
      push(path: string) {
        routerPushed.push(path);
      },
    },
  };
}

async function runHistoricalSave(
  harness: SaveFlowHarness,
  entry: PersistedEntry
): Promise<boolean> {
  const saveEpoch = beginExplicitSave(harness.coordinator);

  try {
    await awaitInFlightSave(harness.coordinator);

    const persistPromise = harness.upsertEntry(entry);
    trackInFlightSave(harness.coordinator, persistPromise);
    let saved: PersistedEntry;
    try {
      saved = await persistPromise;
    } finally {
      clearInFlightSaveIfCurrent(harness.coordinator, persistPromise);
    }

    if (!shouldApplySaveResult(harness.coordinator, saveEpoch)) {
      return false;
    }

    harness.router.push("/history");
    return saved.status === "completed";
  } catch {
    return false;
  } finally {
    endExplicitSave(harness.coordinator);
  }
}

async function testSuccessfulSaveWaitsBeforeNavigation(): Promise<void> {
  const harness = createHarness({
    upsertImpl: async (entry) => {
      await delay(25);
      return entry;
    },
  });

  const startedAt = Date.now();
  const saved = await runHistoricalSave(harness, {
    id: "entry-1",
    status: "completed",
    sales: 100_000,
  });
  const elapsed = Date.now() - startedAt;

  assert.equal(saved, true, "Save must succeed");
  assert.equal(harness.upsertCalls.length, 1, "Must persist once");
  assert.equal(harness.upsertCalls[0]?.status, "completed");
  assert.ok(elapsed >= 20, "Navigation must wait for persistence delay");
  assert.deepEqual(harness.routerPushed, ["/history"], "Navigate after save");
}

async function testFailurePreventsNavigation(): Promise<void> {
  const harness = createHarness({
    upsertImpl: async () => {
      throw new Error("database unavailable");
    },
  });

  const saved = await runHistoricalSave(harness, {
    id: "entry-2",
    status: "completed",
    sales: 50_000,
  });

  assert.equal(saved, false, "Failed save must return false");
  assert.equal(harness.routerPushed.length, 0, "Must not navigate on failure");
  assert.equal(harness.upsertCalls.length, 1, "Attempted one persistence call");
}

async function testCompletedPersistedBeforeNavigation(): Promise<void> {
  let persistedBeforeNavigate = false;

  const harness = createHarness({
    upsertImpl: async (entry) => {
      persistedBeforeNavigate = harness.routerPushed.length === 0;
      return entry;
    },
  });

  await runHistoricalSave(harness, {
    id: "entry-3",
    status: "completed",
    sales: 75_000,
  });

  assert.equal(
    persistedBeforeNavigate,
    true,
    "PostgreSQL/API persistence must complete before navigation"
  );
  assert.equal(harness.routerPushed.length, 1);
}

async function testStaleAutosaveCannotOverwriteCompleted(): Promise<void> {
  const harness = createHarness({
    upsertImpl: async (entry) => {
      await delay(entry.status === "draft" ? 40 : 5);
      return entry;
    },
  });

  const autosaveEpoch = harness.coordinator.epoch;
  const staleAutosave = harness
    .upsertEntry({ id: "entry-4", status: "draft", sales: 1 })
    .then((saved) => {
      if (shouldApplySaveResult(harness.coordinator, autosaveEpoch)) {
        throw new Error("Stale autosave must not apply after explicit save");
      }
      return saved;
    });
  trackInFlightSave(harness.coordinator, staleAutosave);

  const explicitSaveEpoch = beginExplicitSave(harness.coordinator);
  await awaitInFlightSave(harness.coordinator);

  const completedPromise = harness.upsertEntry({
    id: "entry-4",
    status: "completed",
    sales: 99_000,
  });
  trackInFlightSave(harness.coordinator, completedPromise);
  let completed: PersistedEntry;
  try {
    completed = await completedPromise;
  } finally {
    clearInFlightSaveIfCurrent(harness.coordinator, completedPromise);
  }

  assert.equal(
    shouldApplySaveResult(harness.coordinator, explicitSaveEpoch),
    true,
    "Explicit completed save remains authoritative"
  );
  assert.equal(completed.status, "completed");
  assert.equal(completed.sales, 99_000);

  await staleAutosave;
  assert.equal(
    isAutosavePermitted(harness.coordinator),
    false,
    "Explicit save locks autosave while in flight"
  );

  endExplicitSave(harness.coordinator);
}

function testCoordinatorGuards(): void {
  const state = createSaveCoordinatorState();
  assert.equal(isAutosavePermitted(state), true);

  const epoch = beginExplicitSave(state);
  assert.equal(isAutosavePermitted(state), false);
  assert.equal(shouldApplySaveResult(state, epoch), true);
  assert.equal(shouldApplySaveResult(state, epoch - 1), false);

  endExplicitSave(state);
  assert.equal(isAutosavePermitted(state), true);
}

async function main() {
  console.log("[verify-historical-save-persistence] Coordinator guards...");
  testCoordinatorGuards();

  console.log("[verify-historical-save-persistence] Successful save waits...");
  await testSuccessfulSaveWaitsBeforeNavigation();

  console.log("[verify-historical-save-persistence] Failure prevents navigation...");
  await testFailurePreventsNavigation();

  console.log("[verify-historical-save-persistence] Completed before navigation...");
  await testCompletedPersistedBeforeNavigation();

  console.log(
    "[verify-historical-save-persistence] Stale autosave cannot overwrite..."
  );
  await testStaleAutosaveCannotOverwriteCompleted();

  console.log("[verify-historical-save-persistence] All checks passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "[verify-historical-save-persistence] failed"
  );
  process.exit(1);
});
