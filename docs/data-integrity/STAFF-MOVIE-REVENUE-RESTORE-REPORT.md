# Staff Today Movie Revenue Restore — Report

**Date:** 2026-09-17  
**Branch:** `cursor/restore-staff-movie-revenue-top-b6e7`  
**Scope:** Restore prominent Movie Revenue entry on Staff Today (top of page).

## Root cause

Movie revenue continued to flow through the existing daily-operations model (`Entry.sales` / `form.sales` via `useEntryForm` → `upsertEntry` → `/api/daily-operations`). Staff Today only rendered **`StaffRevenueCard`**, which is **display-only** (shows “Pending” when `movieRevenue <= 0`) with no input or save action. The editable pattern still exists in **`operations-closing-panel.tsx`** (owner/historical closing UI) but was **not wired** into `staff-operations-workspace.tsx`. Repeated UX refactors moved summary display up the page while disconnecting staff from the save path.

## Existing backend / persistence reused

| Layer | Reuse |
| --- | --- |
| Data model | `DailyOperation.sales` (client `Entry.sales`) |
| Hook | `useEntryForm` — `movieRevenue`, `updateField("sales")`, `handleSubmitRequest` |
| API | `POST /api/daily-operations` (unchanged) |
| Service | `daily-operations-service.ts` — `sales: entry.sales` |
| Calculations | `movieRevenue` in Today's Revenue, Cash Summary, EOD totals (unchanged formulas) |

**Change to hook (minimal):** `handleSubmitRequest(overrides?: Partial<EntryFormData>)` so saves can persist the typed amount without a stale React state race (same pattern as prior go-live fix branch).

## Staff Today UX change

**File:** `components/operations/staff/staff-operations-workspace.tsx`

Order after change:

1. Staff header (`StaffWelcomeCard`)
2. **`StaffMovieRevenueCard`** (new)
3. Today's Revenue (`StaffRevenueCard`)
4. Rest unchanged (activity, transactions, expenses, wage, cash, EOD)

**New component:** `components/operations/staff/staff-movie-revenue-card.tsx`

- Labels: “Movie Revenue”, “Today's movie revenue”, current UGX amount
- Primary actions: “Enter Movie Revenue” / “Update Movie Revenue”
- Inline editor with `aria-label="Movie revenue amount"`, UGX 0 allowed
- Save via `onSaveMovieRevenue` → `handleSubmitRequest({ sales: amount })`
- Disabled when day closed, close request pending, or shop not open
- Regression markers: `data-regression-guard="staff-today-movie-revenue-*"`

## Files changed

- `components/operations/staff/staff-movie-revenue-card.tsx` (new)
- `components/operations/staff/staff-operations-workspace.tsx` (wire card)
- `hooks/use-entry-form.ts` (optional overrides on submit)
- `scripts/verify-staff-today-movie-revenue.ts` (new regression guard)
- `package.json` (`verify:staff-today-movie-revenue`)
- `docs/data-integrity/STAFF-MOVIE-REVENUE-RESTORE-REPORT.md` (this file)
- `docs/data-integrity/STAFF-MOVIE-REVENUE-RESTORE-REPORT.docx`

## Tests added / updated

**New:** `npm run verify:staff-today-movie-revenue`

Static checks (1–12): Staff Today input/action, layout order, UGX 0, single persistence path, Today's Revenue + Cash Summary wiring, no open/close gates on movie revenue, anti–display-only guard.

Live checks (13–20): API persistence (0 and positive), reload, branch isolation, foreign-branch 403, closing with zero movie revenue allowed.

## Actual test results

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npm run verify:staff-today-movie-revenue` | **PASS** checks 1–20; exit 0. Cleanup logged prisma errors in `verify-bootstrap.ts` (undefined user/staff id on delete) — **fixture/cleanup**, not assertion failure. |
| `npm run verify:close-time-flexibility` | **PASS** (checks 1–24) |
| `npm run verify:final-open-day-guard` | **PARTIAL** — static checks 1–3 PASS; live flow failed: “Previous business day still open…” — **environment/fixture** (stale open business day in local DB), not caused by this change. |
| `npm run build` | **FAIL** — prerender `/_global-error`: `TypeError: Cannot read properties of null (reading 'useContext')` — **pre-existing** build issue on main, unrelated to Staff Today movie revenue. |

## Production build result

`npm run build` **failed** for the reason above (global-error prerender). Typecheck and targeted verification scripts for this change **passed**.

## Intentionally not changed

Business-day rules, opening/closing guards, branch isolation, permissions, expense/wage/closing workflows, database schema, production data.
