import assert from "node:assert/strict";
import { persistCloseDayStaffPayouts } from "../lib/day-closing/persist-close-day-payouts";
import type { DayClosingStaffPayout } from "../types/day-closing";
import type {
  StaffPaymentInput,
  StaffPaymentValidationResult,
} from "../types/staff-payment";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function payout(
  staffId: string,
  staffName: string,
  amount: number,
  selected = true
): DayClosingStaffPayout {
  return {
    staffId,
    staffName,
    role: "cashier",
    dailyWage: amount,
    amount,
    selected,
    paidToday: false,
    notes: "",
  };
}

type CloseHarnessState = {
  paymentPersistedAt: number[];
  closePersistedAt: number | null;
  closeCalled: boolean;
};

type CloseHarness = CloseHarnessState & {
  recordPayment: (
    input: StaffPaymentInput
  ) => Promise<StaffPaymentValidationResult>;
  closeDayApi: () => Promise<void>;
  runCloseDay: (
    payouts: DayClosingStaffPayout[]
  ) => Promise<{ success: boolean; uiSuccessAt?: number }>;
};

function createHarness(options?: {
  failPaymentForStaffId?: string;
  duplicateStaffIds?: Set<string>;
  paymentDelayMs?: number;
  closeDelayMs?: number;
}): CloseHarness {
  const state: CloseHarnessState = {
    paymentPersistedAt: [],
    closePersistedAt: null,
    closeCalled: false,
  };
  const paidStaff = new Set<string>();

  const recordPayment = async (
    input: StaffPaymentInput
  ): Promise<StaffPaymentValidationResult> => {
    await delay(options?.paymentDelayMs ?? 15);

    if (options?.failPaymentForStaffId === input.staffId) {
      return {
        success: false,
        errors: { form: `Unable to pay ${input.staffId}.` },
      };
    }

    if (
      options?.duplicateStaffIds?.has(input.staffId) ||
      paidStaff.has(input.staffId)
    ) {
      return {
        success: false,
        errors: { form: "Daily wage already recorded for this date." },
      };
    }

    paidStaff.add(input.staffId);
    state.paymentPersistedAt.push(Date.now());
    return {
      success: true,
      errors: {},
      payment: {
        id: `payment-${input.staffId}`,
        staffId: input.staffId,
        staffName: input.staffId,
        staffRole: "cashier",
        amount: input.amount,
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        branch: "main",
        date: input.date,
        expenseId: `expense-${input.staffId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  };

  const closeDayApi = async (): Promise<void> => {
    state.closeCalled = true;
    await delay(options?.closeDelayMs ?? 5);
    state.closePersistedAt = Date.now();
  };

  const runCloseDay = async (
    payouts: DayClosingStaffPayout[]
  ): Promise<{ success: boolean; uiSuccessAt?: number }> => {
    const payoutResult = await persistCloseDayStaffPayouts(
      payouts,
      "2026-09-10",
      recordPayment
    );

    if (!payoutResult.success) {
      return { success: false };
    }

    try {
      await closeDayApi();
    } catch {
      return { success: false };
    }

    return { success: true, uiSuccessAt: Date.now() };
  };

  return Object.assign(state, {
    recordPayment,
    closeDayApi,
    runCloseDay,
  });
}

async function testPaymentsPersistBeforeCloseSuccess(): Promise<void> {
  const harness = createHarness({ paymentDelayMs: 25, closeDelayMs: 5 });

  const result = await harness.runCloseDay([
    payout("staff-a", "Staff A", 10_000),
    payout("staff-b", "Staff B", 12_000),
  ]);

  assert.equal(result.success, true);
  assert.equal(harness.paymentPersistedAt.length, 2);
  assert.ok(harness.closePersistedAt, "Day close must persist");
  assert.ok(
    harness.paymentPersistedAt.every(
      (timestamp) => timestamp <= harness.closePersistedAt!
    ),
    "Every staff payment must finish before day close persists"
  );
  assert.ok(
    result.uiSuccessAt! >= harness.closePersistedAt!,
    "UI success must not be reported before close persistence completes"
  );
}

async function testFailedPaymentPreventsClose(): Promise<void> {
  const harness = createHarness({
    failPaymentForStaffId: "staff-b",
  });

  const result = await harness.runCloseDay([
    payout("staff-a", "Staff A", 10_000),
    payout("staff-b", "Staff B", 12_000),
  ]);

  assert.equal(result.success, false);
  assert.equal(harness.paymentPersistedAt.length, 1, "Only first payment may persist");
  assert.equal(harness.closeCalled, false, "Day close must not run after payment failure");
  assert.equal(harness.closePersistedAt, null);
}

async function testUiDoesNotReportSuccessBeforePersistence(): Promise<void> {
  const harness = createHarness({ paymentDelayMs: 30, closeDelayMs: 20 });
  const startedAt = Date.now();

  const result = await harness.runCloseDay([
    payout("staff-a", "Staff A", 10_000),
  ]);

  assert.equal(result.success, true);
  assert.ok(
    (result.uiSuccessAt ?? 0) - startedAt >= 45,
    "Success must wait for payment and close API completion"
  );
}

async function testRetryDoesNotDuplicatePayments(): Promise<void> {
  const harness = createHarness();

  const firstAttempt = await harness.runCloseDay([
    payout("staff-a", "Staff A", 10_000),
  ]);
  assert.equal(firstAttempt.success, true);

  const retryAttempt = await persistCloseDayStaffPayouts(
    [payout("staff-a", "Staff A", 10_000)],
    "2026-09-10",
    harness.recordPayment
  );

  assert.equal(retryAttempt.success, false);
  assert.match(
    retryAttempt.message,
    /already recorded/i,
    "Retry must be blocked by duplicate payment protection"
  );
  assert.equal(harness.paymentPersistedAt.length, 1);
}

async function testUnselectedPayoutsAreSkipped(): Promise<void> {
  const harness = createHarness();

  const result = await harness.runCloseDay([
    payout("staff-a", "Staff A", 10_000, false),
    payout("staff-b", "Staff B", 0, true),
  ]);

  assert.equal(result.success, true);
  assert.equal(harness.paymentPersistedAt.length, 0);
}

async function main() {
  console.log("[verify-close-day-payout-sequencing] Payments before close...");
  await testPaymentsPersistBeforeCloseSuccess();

  console.log("[verify-close-day-payout-sequencing] Failed payment blocks close...");
  await testFailedPaymentPreventsClose();

  console.log("[verify-close-day-payout-sequencing] UI waits for persistence...");
  await testUiDoesNotReportSuccessBeforePersistence();

  console.log("[verify-close-day-payout-sequencing] Retry duplicate protection...");
  await testRetryDoesNotDuplicatePayments();

  console.log("[verify-close-day-payout-sequencing] Unselected payouts skipped...");
  await testUnselectedPayoutsAreSkipped();

  console.log("[verify-close-day-payout-sequencing] All checks passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "[verify-close-day-payout-sequencing] failed"
  );
  process.exit(1);
});
