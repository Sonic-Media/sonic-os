# PHASE 1 FIX #11 REPORT

**Medium Finding #14 — Reports Data Integrity / Server Authoritative Reporting**

| Field | Value |
|-------|-------|
| **STATUS** | **PASS** |
| **Branch** | `cursor/reports-server-authority-b6e7` |
| **PR** | https://github.com/Sonic-Media/sonic-os/pull/19 |
| **Production data touched** | **NO** |

---

## ROOT CAUSE

`hooks/use-reports.ts` rebuilt financial totals from `useEntriesContext()` operational arrays. It applied client-side `filterByBranchField`, `filterEntriesByPeriod`, and `aggregateEntries()` instead of consuming the PostgreSQL-backed `/api/reports/summary` endpoint.

This created a second, independent calculation path. The Reports page could show totals that differed from server-authoritative numbers computed elsewhere from the same underlying `DailyOperation` records.

---

## REPORTING FLOW BEFORE

```
PostgreSQL
   ↓
entries-context (client fetch of daily operations)
   ↓
use-reports.ts
   • filterByBranchField(entries, activeBranch)
   • filterEntriesByPeriod(branchEntries, period)
   • aggregateEntries(filtered, { branchIds })
   ↓
Reports UI (app/reports/page.tsx)
```

**Problem:** Client reconstructed totals from operational context arrays rather than the authoritative server report query.

---

## REPORTING FLOW AFTER

```
PostgreSQL (DailyOperation + DailyOperationExpense)
   ↓
listDailyOperationsInPeriod(period, ref, branchFilter)   [server]
   ↓
aggregateEntries(entries, { branchIds })                 [server — lib/aggregations.ts]
   ↓
GET /api/reports/summary?period=…                        [app/api/reports/summary/route.ts]
   ↓
fetchReportSummary(period)                               [lib/api/reports.ts]
   ↓
use-reports.ts (fetch + refetch + stale-response guard)
   ↓
Reports UI (unchanged — app/reports/page.tsx)
```

**Result:** One authoritative reporting calculation path from PostgreSQL to UI.

---

## AUTHORITATIVE SOURCE

| Layer | Source |
|-------|--------|
| Database | PostgreSQL `DailyOperation` rows with nested `DailyOperationExpense` |
| Branch scope | Session branch preference (owner) or assigned branch (staff) via `resolveBranchListFilter` |
| Period scope | `getPeriodDateBounds(period, ref)` — inclusive `gte` / `lte` on `date` column |
| Status filter | `filterCompletedEntries` inside `aggregateEntries` — draft rows excluded |

No `localStorage` or client-side operational arrays are used as the financial data source for Reports.

---

## SERVER CALCULATIONS

Verified in `app/api/reports/summary/route.ts` (no changes required):

1. **Auth & module gate** — `withSessionDatabase`, `module: "reports"`
2. **Branch filter** — `resolveBranchListFilter(session)` scopes `listDailyOperationsInPeriod`
3. **Period filter** — SQL `date: { gte: start, lte: end }` (inclusive both ends)
4. **Branch IDs for byBranch structure** — owner: all active branch codes; staff: equivalent codes for assigned branch
5. **Aggregation** — `aggregateEntries()` in `lib/aggregations.ts`:
   - Revenue: sum of `entry.sales` for completed entries
   - Expenses: `calculateExpenses(entry)` (operating expenses; payroll entry expenses excluded per `isPayrollEntryExpense`)
   - Savings/net: `calculateSavingsFromTotals(totalSales, totalExpenses)`
   - Chart data, insights, and per-branch breakdown built server-side

---

## CLIENT RESPONSIBILITIES

After fix, `hooks/use-reports.ts` is responsible only for:

| Responsibility | Implementation |
|----------------|----------------|
| Auth gate | Wait for `authLoaded`, `branchLoaded`, `isAuthenticated` |
| Fetch | `fetchReportSummary(period)` → `/api/reports/summary` |
| Refetch triggers | `period` change, `activeBranch` change (server uses session preference) |
| Stale response protection | `requestId` ref — superseded responses discarded |
| Logout | Clear to empty summary |
| UI data | Pass `summary`, `periodLabel` to existing Reports components |

**Removed from client:** `useEntriesContext`, `useSettings` (for branchIds), `aggregateEntries`, `filterEntriesByPeriod`, `filterByBranchField`.

---

## BRANCH ISOLATION

| Context | Behavior |
|---------|----------|
| **Kansanga (`main`)** | Only Kansanga daily operations included in totals |
| **Salaama** | Only Salaama daily operations included |
| **Owner — active branch** | Summary cards reflect active branch totals only |
| **Owner — byBranch cards** | All authorized branches initialized; only active branch has non-zero data for the scoped query |
| **Staff (branch-manager)** | Scoped to assigned branch; cannot see another branch's totals |
| **Cashier** | No reports module access (403 on `/api/reports/summary`) — unchanged |

Branch switch calls `setActiveBranchApi` (updates server preference) before local state updates; hook refetches on `activeBranch` change.

---

## DATE RANGE HANDLING

| Period | Bounds (inclusive) |
|--------|-------------------|
| daily | Today only (`start === end === today ISO`) |
| weekly | Monday–Sunday of current week |
| monthly | First–last day of current month |
| yearly | Jan 1–Dec 31 of current year |

Server reference date: `new Date()` at request time. Entries outside the selected period are excluded at the SQL layer, not filtered client-side.

---

## SOFT DELETE HANDLING

- `DailyOperation` model has **no** `deletedAt` column — hard persistence only.
- Draft entries (`status: "draft"`) are excluded by `filterCompletedEntries` during aggregation.
- Expense module soft deletes do not affect Reports totals (Reports uses daily operation embedded expenses, not the standalone expenses module).

---

## STALE RESPONSE / RACE PROTECTION

```typescript
const currentRequest = ++requestId.current;
const remote = await loadFromApi(() => fetchReportSummary(period));
if (currentRequest !== requestId.current) return; // discard stale
setSummary(remote);
```

Scenario protected: Request A (old branch/period) completes after Request B (current branch/period) — Response A cannot overwrite Response B.

Effect uses `queueMicrotask` to satisfy React `set-state-in-effect` lint rules.

---

## FILES CHANGED

| File | Change |
|------|--------|
| `hooks/use-reports.ts` | Replaced client aggregation with server fetch + race guard |
| `scripts/verify-reports-server-authority.ts` | **New** — focused verification (checks A–P) |
| `package.json` | Added `verify:reports-server-authority` script |
| `docs/PHASE-1-REPORTS-SERVER-AUTHORITY-FIX.md` | This report |

**Not changed:** `app/reports/page.tsx`, Reports UI components, `app/api/reports/summary/route.ts`, Prisma schema, migrations, dashboard, or unrelated modules.

---

## TESTS RUN

| Command | Purpose |
|---------|---------|
| `npm run verify:reports-server-authority` | End-to-end + static checks A–P |
| `npx tsc --noEmit` | TypeScript |
| `npm run build` | Production build |
| `npx eslint hooks/use-reports.ts scripts/verify-reports-server-authority.ts` | Lint changed files |

---

## TEST RESULTS

### Verification checks (A–P)

| ID | Requirement | Result |
|----|-------------|--------|
| A | Reports use server-authoritative report endpoint | **PASS** — hook imports `fetchReportSummary` |
| B | No independent aggregation of context arrays | **PASS** — no `useEntriesContext` / `aggregateEntries` in hook |
| C | Kansanga totals correct | **PASS** |
| D | Salaama totals correct | **PASS** |
| E | All Branches breakdown — no duplication | **PASS** — active-branch total matches main card; salaama card zero when on main |
| F | Revenue totals correct | **PASS** — API matches direct DB aggregation |
| G | Expense totals correct | **PASS** |
| H | Net/profit mathematically correct | **PASS** — `totalSavings === totalSales - totalExpenses` |
| I | Soft-deleted records handled | **PASS** — N/A for DailyOperation; drafts excluded server-side |
| J | Date-range filtering correct | **PASS** — out-of-month entry excluded from monthly total |
| K | Date range changes don't combine stale results | **PASS** |
| L | Branch switch doesn't show stale totals | **PASS** — Kansanga ↔ Salaama |
| M | Out-of-order API responses can't overwrite state | **PASS** — requestId guard (static + simulated) |
| N | Staff can't access another branch's data | **PASS** — branch-manager on main sees main only |
| O | Owner retains All Branches reporting breakdown | **PASS** — `byBranch` includes authorized keys |
| P | Existing Reports UI behavior intact | **PASS** — page/components unchanged |

### Build toolchain

| Check | Result |
|-------|--------|
| **TYPESCRIPT** | **PASS** |
| **BUILD** | **PASS** |
| **ESLINT** | **PASS** (changed files only) |

Pre-existing unrelated ESLint/build warnings (e.g. Turbopack NFT tracing in `next.config.ts`) were not introduced by this fix.

---

## PRODUCTION DATA TOUCHED

**NO**

Verification uses deterministic test fixtures (unique dates in current month, baseline-delta assertions). Test daily operations are imported via owner-only historical import API and bulk-deleted in cleanup.

---

## PHASE 1 FIX #11 RESULT

### **PASS**

Fix #11 complete. Reports financial totals now flow through a single PostgreSQL → server calculation → `/api/reports/summary` → Reports UI path.
