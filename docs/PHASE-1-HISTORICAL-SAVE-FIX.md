# Sonic OS — Phase 1 Fix #2: Historical Save Persistence

**Date:** 10 September 2026  
**Milestone:** Data Integrity (Phase 1)  
**Scope:** Critical Finding #4 only — historical save must await PostgreSQL persistence  
**Branch:** `cursor/historical-save-persistence-b6e7`

---

## Executive Summary

Phase 1 audit **Critical Finding #4** identified that `handleSave` and `promoteToCompletedSync` in `hooks/use-entry-form.ts` could call `upsertEntry()` without `await`, then immediately invoke `router.push()`. The UI could navigate away before PostgreSQL confirmed the write — presenting a successful save when persistence might still be in flight or may have failed.

This fix ensures **no historical (or explicit final) save is treated as successful until the API/PostgreSQL write completes**. Navigation occurs only after a successful persist. Failures surface an error and keep the user on the form.

---

## Phase 1 Fix #2 Result: **PASS**

Automated verification, TypeScript, and production build all pass. **No production data was modified.**

---

## Audit Finding Addressed

| Audit # | Finding | Status |
|---------|---------|--------|
| 4 | Historical save does not await PostgreSQL persistence | **FIXED** |
| 1–3, 5–23 | All other Phase 1 findings | Not in scope |

---

## Files Changed

| File | Change |
|------|--------|
| `hooks/use-entry-form.ts` | Awaited explicit save; removed fire-and-forget `promoteToCompletedSync`; race coordination |
| `lib/entry-form/save-coordination.ts` | **NEW** — epoch/lock/in-flight save coordination helpers |
| `components/entry/entry-form.tsx` | Display `saveError`; accept async `onSubmit` |
| `components/entry/new-entry-form.tsx` | Pass `saveError` to form |
| `app/entry/[id]/edit/page.tsx` | Pass `saveError` to form |
| `scripts/verify-historical-save-persistence.ts` | **NEW** — focused persistence/race tests |
| `package.json` | Added `verify:historical-save` script |

---

## What Was Fixed

### Before

```text
handleSave()
  → upsertEntry(draft)        // not awaited
  → promoteToCompletedSync()  // upsertEntry(completed) not awaited
  → router.push()             // immediate navigation
```

`handleSubmitRequest()` in historical mode called `handleSave()` without `await` and always returned `true`.

### After

```text
handleSave() [async]
  → cancelPendingAutosave()
  → beginExplicitSave()       // lock autosave, bump epoch
  → awaitInFlightSave()       // wait for any in-flight autosave
  → await upsertEntry(completed)
  → sync local refs
  → router.push()             // only after successful persist
```

On failure: `setSaveError(...)`, **no navigation**, user remains on form.

---

## How the Save Flow Now Works

### Historical mode (`/operations/historical`, `/entry/*`)

1. User submits the form → `handleSubmitRequest()` (operations) or `handleSave()` (entry pages).
2. Pending autosave timer is cancelled; explicit save acquires the coordinator lock.
3. Any in-flight autosave promise is awaited first (prevents draft-after-completed races).
4. A single **completed** entry is built and sent via `await upsertEntry(completed)`.
5. `upsertEntry` calls `upsertDailyOperationApi` → PostgreSQL write (source of truth).
6. **Only on success:** local refs update, `router.push(redirect)`.
7. **On failure:** error message shown; user stays on form.

### Today mode (draft autosave — unchanged intent)

- Autosave still debounces draft writes in the background.
- Explicit draft save via `handleSubmitRequest()` (e.g. before close-day) already awaited persistence; now also uses the same coordinator for race safety.

---

## Race Condition Protection

Implemented via `lib/entry-form/save-coordination.ts`:

| Mechanism | Purpose |
|-----------|---------|
| **`beginExplicitSave` / `endExplicitSave`** | Locks autosave while a final save is in progress |
| **`awaitInFlightSave`** | Waits for any in-flight autosave before completing |
| **`epoch` counter** | Autosave results from a prior epoch are discarded (`shouldApplySaveResult`) |
| **`trackInFlightSave` / `clearInFlightSaveIfCurrent`** | Tracks the active persist promise without unhandled rejections |

**Scenario prevented:** User clicks Save while an autosave is in flight → explicit save waits for autosave, then writes **completed** with the latest form data. A stale autosave completing afterward cannot overwrite the completed record in local state.

---

## Test Coverage

Run: `npm run verify:historical-save`

| Test | Requirement |
|------|-------------|
| A. Successful save waits before navigation | Persist delay ≥ 20ms before `router.push` |
| B. API failure prevents navigation | Rejected upsert → no navigation, returns false |
| C. Completed persisted before navigation | DB/API write completes while `routerPushed` is still empty |
| D. Stale autosave cannot overwrite completed | Epoch lock + explicit completed save wins over late draft |

---

## Tests Run

| Command | Result |
|---------|--------|
| `npm run verify:historical-save` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint (changed files) | **PASS** |

---

## Production Data Impact

| Item | Value |
|------|-------|
| **Production data touched** | **NO** |
| Schema / migrations | None |
| localStorage fallback | Not introduced |
| Branch rules / permissions | Unchanged |

---

## Intentionally Not Fixed

All other Phase 1 audit items remain open (branch auth on other branches if not merged, close-day payout sequencing, fire-and-forget mutations, branch refetch, reports, backup/restore, etc.).

---

## Shareable Summary

**Verdict:** Phase 1 Fix #2 — **PASS**.

Historical and explicit final saves now **await PostgreSQL persistence** before navigation. Failed saves show an error and keep the user on the form. Autosave/final-save races are guarded by epoch locking and in-flight coordination.

**Production data:** Not touched.

**Next step:** Authorize remaining Phase 1 findings per `docs/PHASE-1-DATA-INTEGRITY-AUDIT.md` recommended fix order.
