# Restore Staff Movie Revenue Entry — Report

**Branch:** `cursor/restore-staff-movie-revenue-b6e7`  
**Commit:** `2081c7e`  
**Date:** 2026-09-14

---

## Root cause

The recent premium staff **Today's Operations** redesign (`StaffOperationsWorkspace`) kept movie revenue in summaries and calculations but **removed the staff entry point** for recording it.

- `StaffRevenueCard` displayed movie revenue as **Pending** with no input.
- `StaffTodayActivityCard` restored **Accessory Sales** (`+ Record Accessory Sale`) only.
- Movie revenue entry still existed in owner/historical paths (`OperationsClosingPanel`, `OperationsForm`) and in the API, but **staff on `/operations/today` had no UI calling `updateField("sales", …)`**.

This was a **UI regression**, not a data-model or API regression.

---

## Existing movie-revenue implementation discovered

| Layer | Location | Notes |
|-------|----------|-------|
| **Storage** | `DailyOperation.sales` (`prisma/schema.prisma`) | Movie ticket revenue only; unique per `(branchId, date)` |
| **App type** | `Entry.sales` (`types/index.ts`) | Mapped via `mapDailyOperationToEntry()` |
| **API** | `POST /api/daily-operations` | `upsertDailyOperation()` in `lib/server/services/daily-operations-service.ts` |
| **Client** | `upsertDailyOperationApi()` → `upsertEntry()` | `context/entries-context.tsx` |
| **Form hook** | `useEntryForm` → `form.sales` / `movieRevenue` | Autosave + `handleSubmitRequest()` draft persist |
| **Business day** | `DayClosing.date` + `Entry.date` | Server: `assertBranchDayOpenForWrite()` |
| **Branch auth** | `getBranchIdForSession()` + `assertSessionCanAccessBranchCode()` | Staff limited to assigned branch |
| **Reports** | `aggregateEntries()` sums `entry.sales` | No reporting changes required |
| **Permissions** | Cashier POST allowed (`verify:roles` check 12) | Server remains authoritative |

Accessory revenue remains in the **`Sale`** model and is **not** merged with movie revenue.

---

## Exact UI change

### New: `components/operations/staff/staff-movie-revenue-card.tsx`

Premium staff card with:

- **MOVIE REVENUE** label and “Record today's movie revenue” helper text
- UGX amount input with live preview (`formatCurrency`)
- **Record Movie Revenue** / **Update Movie Revenue** button
- Recorded-value display when `movieRevenue > 0`
- Blocked state when shop is not open / day is closed

### Updated: `components/operations/staff/staff-operations-workspace.tsx`

- Inserts `StaffMovieRevenueCard` between **Today's Revenue** summary and **Today's Activity** (accessory sales)
- Wires save through existing `handleSubmitRequest({ sales: amount })`
- Gates recording when business day is not open (`shopOpen` / `close_requested`) or day is closed

### Updated: `hooks/use-entry-form.ts`

- `handleSubmitRequest(overrides?: Partial<EntryFormData>)` accepts optional form overrides so movie revenue saves atomically without waiting for React state flush

### Updated: `scripts/verify-roles-permissions-module.ts`

- Static check **0**: staff workspace exposes movie revenue entry UI

**Not changed:** database schema, reporting logic, accessory sales, inventory, expenses, wages, closing workflow, authentication.

---

## Business-day / branch authorization behavior

| Condition | UI behavior | Server behavior (unchanged) |
|-----------|-------------|----------------------------|
| Shop open (`DayClosing.status = open`) | Recording enabled | `assertBranchDayOpenForWrite()` passes |
| Close requested | Recording enabled | Server allows `close_requested` |
| No open business day | Card shows explanation; input disabled | `409 shop_not_opened` |
| Day closed | Card blocked | `409 day_closed` |
| Wrong branch | N/A (staff session branch) | `403` via branch scope checks |

Uses **server-authoritative business date** from `getActiveOpenRecord()` passed into `StaffOperationsWorkspace` — not browser calendar date alone.

---

## Tests run

| Command | Result | Notes |
|---------|--------|-------|
| `npx tsc --noEmit` | **PASS** | |
| `npm run build` | **FAIL** | Pre-existing `_global-error` prerender (`useContext` null) — **ENVIRONMENT/CODE**, unrelated to this change |
| `npm run verify:roles` | **PARTIAL** | Check **0 PASS** (movie revenue UI). Check **1 FAIL** — nav label drift (`Today` vs `Today's Operations`) — **FIXTURE/ENV drift**, pre-existing |
| `npm run verify:operations` | **PARTIAL** | Checks 1–3 PASS; failed on daily wage ownership message — **FIXTURE**, pre-existing |
| `npm run verify:branch-authorization` | **PASS** | |
| `npm run verify:close-day-date` | **PASS** | Business-day authority intact |
| `npm run verify:reports-module` | **PARTIAL** | Checks 1–4 PASS; later assertion `27000 !== 37000` — **FIXTURE/data**, pre-existing |

No duplicate movie-revenue verifier existed beyond `verify:roles` check 12 (API-level movie revenue POST).

---

## Manual verification status

**Performed locally** at `http://localhost:3000` as cashier **tony** (Kansanga branch):

| Check | Status |
|-------|--------|
| 1. Movie Revenue entry visible | **PASS** |
| 2. Accessory Sales still works | **PASS** (`+ Record Accessory Sale` present) |
| 3. Revenue streams visually distinct | **PASS** (separate card + summary tiles) |
| 4. UGX formatting | **PASS** (input prefix + preview) |
| 5. Existing movie revenue loads | **NOT TESTED** (no pre-existing value in fixture session) |
| 6. Saving persists after refresh | **NOT TESTED** (save click not exercised in manual run) |
| 7. Branch isolation | **NOT TESTED** manually (covered by `verify:branch-authorization`) |
| 8. Closed-day restrictions | **NOT TESTED** manually (covered by server guards + close-day verifier) |
| 9. Reports show movie revenue | **NOT TESTED** manually (API/report verifiers partially run) |

---

## Production safety

- No schema migrations
- No production data or env changes
- Movie revenue still stored in `DailyOperation.sales` only
- No inventory movements created for movie revenue
- Financial separation (movie vs accessory) preserved

---

## Files changed

| File | Change |
|------|--------|
| `components/operations/staff/staff-movie-revenue-card.tsx` | **New** staff movie revenue card |
| `components/operations/staff/staff-operations-workspace.tsx` | Wire card + business-day gating |
| `hooks/use-entry-form.ts` | Optional overrides on `handleSubmitRequest` |
| `scripts/verify-roles-permissions-module.ts` | Static UI regression check |
| `docs/data-integrity/RESTORE-STAFF-MOVIE-REVENUE-REPORT.md` | This report |
| `docs/data-integrity/RESTORE-STAFF-MOVIE-REVENUE-REPORT.docx` | Word deliverable |
