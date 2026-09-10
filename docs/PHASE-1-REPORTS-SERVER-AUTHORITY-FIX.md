# Phase 1 Fix #11 — Reports Server Authority

## Root cause

`hooks/use-reports.ts` rebuilt financial totals from `useEntriesContext()` operational arrays using client-side `aggregateEntries()`, bypassing the PostgreSQL-backed `/api/reports/summary` endpoint. Different UI surfaces could therefore compute different numbers from the same underlying records.

## Reporting flow before

```
PostgreSQL
   ↓
entries-context (client fetch)
   ↓
use-reports.ts client filter + aggregateEntries()
   ↓
Reports UI
```

## Reporting flow after

```
PostgreSQL
   ↓
listDailyOperationsInPeriod + aggregateEntries (server)
   ↓
GET /api/reports/summary
   ↓
use-reports.ts fetchReportSummary()
   ↓
Reports UI
```

## Authoritative source

PostgreSQL `DailyOperation` rows (with nested `DailyOperationExpense`) scoped by session branch preference and report period date bounds.

## Server calculations

- `resolveBranchListFilter(session)` — branch isolation
- `getPeriodDateBounds(period)` — inclusive start/end date filtering
- `filterCompletedEntries` inside `aggregateEntries` — draft rows excluded
- Revenue, expense, and savings totals computed once in `lib/aggregations.ts`

## Client responsibilities

- Fetch summary from `/api/reports/summary`
- Refetch on period or active-branch change
- Ignore stale responses via request-id guard
- Render existing Reports UI unchanged

## Verification

Run `npm run verify:reports-server-authority`.
