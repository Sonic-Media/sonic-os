# Phase 1 Fix #7 — Historical Import Undo Persistence

**Audit finding:** High #10 — Historical import undo removes records from the UI before PostgreSQL confirms deletion.

**Status:** PASS

**Branch:** `cursor/historical-import-undo-b6e7`

**Pull request:** https://github.com/Sonic-Media/sonic-os/pull/15

---

## Problem

`removeEntriesByIds()` optimistically filtered local React state and returned `removedCount` immediately while `bulkDeleteDailyOperationsApi` ran in a detached async block. Undo could report success while PostgreSQL deletion failed.

Server-side bulk delete also lacked branch authorization — client-supplied IDs from localStorage undo metadata could target foreign-branch records.

---

## Solution

### Client

- `removeEntriesByIds` is now **async** and **awaits** bulk delete before updating React state
- Returns `{ success, removedCount, error? }` — no success until API confirms
- In-flight guard prevents duplicate undo submissions
- `undoLastImport` awaits removal; clears undo snapshot **only on success**
- Undo metadata in localStorage remains UI-only (documented); never used as authorization

### Server

- `removeDailyOperationsByIds` requires session, loads records, validates each branch with `assertSessionCanAccessBranchCode`, then deletes all-or-nothing
- `deleteDailyOperation` also validates branch ownership (single-delete path)

---

## FILES CHANGED

| File | Change |
|------|--------|
| `context/entries-context.tsx` | `removeEntriesByIds` async; awaits API before state update; in-flight guard |
| `hooks/use-historical-import.ts` | `undoLastImport` async; clears snapshot only on success; `isUndoing` state |
| `components/historical-import/historical-import-workspace.tsx` | Async undo handler; button disabled while undoing |
| `lib/historical-import/undo-storage.ts` | JSDoc: undo IDs are UI metadata only, not authorization |
| `lib/server/services/daily-operations-service.ts` | Branch validation on bulk + single delete |
| `lib/api/daily-operations.ts` | Correct `{ deleted: number }` return type |
| `scripts/verify-historical-import-undo.ts` | New verification script (9 checks) |
| `package.json` | Added `verify:historical-import-undo` script |
| `docs/PHASE-1-HISTORICAL-IMPORT-UNDO-FIX.md` | This review report |

---

## UNDO FLOW BEFORE

```
undoLastImport()
  → removeEntriesByIds() filters local React state immediately
  → returns removedCount > 0 (reports success)
  → void async bulkDelete (PostgreSQL may fail silently)
```

---

## UNDO FLOW AFTER

```
undoLastImport() [async]
  → await removeEntriesByIds()
      → await bulkDeleteDailyOperationsApi()  ← server/PostgreSQL first
      → on success: update local React state
      → on failure: keep local state, return { success: false, error }
  → clearImportUndoSnapshot() only if success
```

---

## POSTGRESQL CONFIRMATION

Deletion is awaited end-to-end. `removeEntriesByIds` calls `bulkDeleteDailyOperationsApi`, which hits `/api/daily-operations/bulk-delete` → `removeDailyOperationsByIds` → `prisma.dailyOperation.deleteMany`. Local React state updates only after the API returns `{ deleted: N }` matching the requested count.

---

## BRANCH AUTHORIZATION

- Server loads each operation with its branch and calls `assertSessionCanAccessBranchCode(session, operation.branch.code)` before any delete.
- All-or-nothing: every ID must exist and be authorized, or the entire request fails.
- localStorage undo snapshot IDs are never treated as authorization — they only drive which IDs the client *requests* to delete; the server re-validates against the authenticated session.
- Owner behavior across authorized branches is preserved via existing session branch scope.
- Staff restrictions are preserved: staff cannot delete records belonging to branches outside their session scope.

---

## FAILURE BEHAVIOR

- API failure → `{ success: false, error: "..." }` returned to UI
- React state unchanged (records stay visible)
- Undo snapshot preserved (user can retry)
- Alert shows failure message, not success

---

## DUPLICATE/REPEATED UNDO PROTECTION

- `removeEntriesInFlight` ref blocks concurrent undo calls
- Undo button disabled via `isUndoing` while in progress
- Snapshot cleared only on success — repeat undo after success finds no snapshot
- Server returns 404 if IDs no longer exist (verified in check #8)

---

## TESTS RUN

| Command | Result |
|---------|--------|
| `npm run verify:historical-import-undo` | **9/9 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint on changed files | 1 pre-existing error in `entries-context.tsx:81` (`set-state-in-effect`, unrelated to this fix) |

---

## TEST RESULTS

| # | Requirement | Result |
|---|-------------|--------|
| A | Successful undo waits for server/database deletion confirmation | PASS |
| B | Failed deletion does not remove records from local UI state | PASS |
| C | Failed deletion reports an error | PASS |
| D | Undo IDs from another branch cannot delete that branch's records | PASS |
| E | Authorized Owner undo works | PASS |
| F | Staff cannot use foreign-branch IDs to undo/delete records | PASS |
| G | Repeated undo cannot accidentally delete additional records | PASS |
| H | Existing historical import behavior remains intact | PASS |

### Verify script output

```
PASS 1. removeEntriesByIds awaits bulk delete before updating state
PASS 2. undoLastImport awaits removeEntriesByIds
PASS 3. Server bulk delete validates branch scope
PASS 4. Authorized owner import persists to PostgreSQL
PASS 5. Successful undo waits for server/database deletion confirmation
PASS 6. Staff cannot undo/delete foreign-branch records by ID
PASS 7. Failed foreign-branch deletion leaves records in PostgreSQL
PASS 8. Repeated undo cannot delete additional records
PASS 9. Existing historical import behavior remains intact
```

---

## PRODUCTION DATA TOUCHED

**NO**

Verification uses ephemeral certification cashiers and random historical dates (`2018-06-xx`, `2018-07-xx`, `2018-08-xx`). Test records are cleaned up in the script `finally` block.

---

## PHASE 1 FIX #7 RESULT

**PASS**
