# Data Integrity Consolidation Repair Plan

Branch: `cursor/data-integrity-consolidated-b6e7`  
Code merge HEAD: `1110e87`

## Blocker A — Fix #4 awaited-mutation return types

**Root cause:** Consolidation kept fire-and-forget `void` wrappers from an intermediate merge while UI callers and Fix #4 require awaited persistence with validation results.

**Certified behavior:** Business mutations await API persistence before returning success (`Promise<ExpenseValidationResult>` for `deleteExpense`; `Promise<AuthValidationResult>` for `enableUser`).

**Files:** `context/expenses-module-context.tsx`, `context/auth-context.tsx`, `app/expenses/history/page.tsx`, `app/settings/users/page.tsx`

**Repair:** Restore Fix #4 async `deleteExpense` and `enableUser` implementations. Keep Fix #15 logout race protection (void + sessionRequestId); UI uses `enableUser`, not logout `.then()`.

---

## Blocker B — getActiveOpenRecord missing

**Root cause:** Fix #10 exposed `getActiveOpenRecord` on `DayClosingContextValue`; consolidation dropped it while `hooks/use-staff-close-day.ts` still consumes it.

**Certified behavior:** Context delegates to `getActiveOpenDayRecord` from `lib/day-closing/business-date.ts`.

**Files:** `context/day-closing-context.tsx`, `hooks/use-staff-close-day.ts`

**Repair:** Add `getActiveOpenRecord` callback and export through context value.

---

## Blocker C — branch-selection verifier merge artifact

**Root cause:** `recordCheck` for check H-static was merged with five arguments instead of four, passing two booleans where one `passed` value is expected.

**Files:** `scripts/verify-branch-selection-authority.ts`

**Repair:** Combine logout-storage conditions into a single `passed` boolean.

---

## Blocker D — Fix #3 vs Fix #10 close-day interaction

**Root cause:** Consolidation retained post-close `upsertEntry(buildClosedDayDailyOperationEntry(...))` and `persistClosings` cache writes after Fix #10 removed redundant daily-operation upsert on closed days.

**Certified behavior:** Resolve open business date → await staff payouts (Fix #3) → `closeDayApi` → refresh closings from API → refresh entries. No post-close upsert.

**Files:** `context/day-closing-context.tsx`

**Repair:** Remove post-close `upsertEntry`; replace `persistClosings` with `refreshClosingsFromApi` after mutations.

---

## Blocker E — branch-authorization fixture

**Root cause:** Test expects cross-branch bulk delete to return `0`; Fix #1 `assertRecordInSessionBranchScope` throws 404 "Record not found" (stronger behavior).

**Files:** `scripts/verify-branch-authorization.ts`

**Repair:** Expect `assert.rejects` with 404 for cross-branch delete; keep authorization logic unchanged.

---

## Blocker F — historical-import-undo branch scope check

**Root cause:** Verifier searches for obsolete `assertSessionCanAccessBranchCode(session, operation.branch.code)` string; Fix #1 uses `assertRecordInSessionBranchScope(session, operation.branchId)`.

**Files:** `scripts/verify-historical-import-undo.ts`

**Repair:** Update static check to match certified branch-record-guard pattern.

---

## Blocker G — day-closing live DB refresh pattern

**Root cause:** Verifier requires `refreshClosingsFromApi` and forbids `persistClosings(`; consolidated context still uses local cache persistence helper.

**Files:** `context/day-closing-context.tsx`, `scripts/verify-day-closing-live-db.ts` (verifier satisfied by implementation fix)

**Repair:** Remove `persistClosings`; refresh from API after open/close/reopen.

---

## Blocker H — close-day-date upsertEntry check

**Root cause:** Same as Blocker D — redundant post-close upsert remains in `closeDay`.

**Files:** `context/day-closing-context.tsx`

**Repair:** Remove `buildClosedDayDailyOperationEntry` / post-close `upsertEntry` from close flow.

---

## Blocker I — DEFAULT_STAFF false positives

**Root cause:** Verifier scans `docs/` and fails on historical documentation mentioning removed `DEFAULT_STAFF` constant.

**Certified behavior:** Production code must not define default staff arrays; historical docs may reference the old constant.

**Files:** `scripts/verify-default-staff.ts`

**Repair:** Restrict symbol scan to production code paths; exclude `docs/`.

---

## Blockers J–L — TypeScript, build, ESLint

**Root cause:** TS errors from A/B; build blocked by TS; ESLint mostly pre-existing.

**Repair:** Resolve A/B first; run gates; fix only consolidation-introduced lint errors.
