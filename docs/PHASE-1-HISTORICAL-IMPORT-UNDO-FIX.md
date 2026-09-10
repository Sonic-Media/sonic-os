# Phase 1 Fix #7 — Historical Import Undo Persistence

**Audit finding:** High #10 — Historical import undo removes records from the UI before PostgreSQL confirms deletion.

**Status:** PASS

**Branch:** `cursor/historical-import-undo-b6e7`

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

## Undo Flow

### Before

```
undoLastImport()
  → removeEntriesByIds() filters local state immediately
  → returns removedCount > 0 (success)
  → void async bulkDelete (may fail silently)
```

### After

```
undoLastImport() [async]
  → await removeEntriesByIds()
      → await bulkDeleteDailyOperationsApi()
      → on success: update local state
      → on failure: keep local state, return error
  → clear undo snapshot only if success
```

---

## Files Changed

- `context/entries-context.tsx`
- `hooks/use-historical-import.ts`
- `components/historical-import/historical-import-workspace.tsx`
- `lib/historical-import/undo-storage.ts` (documentation)
- `lib/server/services/daily-operations-service.ts`
- `lib/api/daily-operations.ts`
- `scripts/verify-historical-import-undo.ts`
- `package.json`
- `docs/PHASE-1-HISTORICAL-IMPORT-UNDO-FIX.md`

---

## Verification

```bash
npm run verify:historical-import-undo
npx tsc --noEmit
npm run build
```

**Production data touched: NO**
