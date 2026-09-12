# Targeted Go-Live UX Fixes

**Date:** 2026-09-12  
**Branch:** `cursor/targeted-go-live-ux-fixes-b6e7`  
**Scope:** Task 1 (Fazil clock-in investigation) + Owner Reports (All Branches + exact business date)

---

## What Was Observed (Production)

Mission Control for Salaama showed:

- Status: Open
- Opened by: Fazil
- Opened at: 9:25 AM

Fazil's Today's Operations screen showed the clock-in gate:

- Message indicating the branch is already open
- **Clock In** button

---

## Task 1 — Fazil Clock-In State

### Root Cause Analysis

Sonic OS intentionally models **two separate states**:

| Concept | Source | Meaning |
|---------|--------|---------|
| Branch open | `DayClosing` (`openedBy`, `openedAt`) | The business day is open for operations at that branch |
| Staff on shift | Audit log (`Start Shift`, `Clock In`, `Clock Out`) | An individual staff member is actively working |

**Staff UI flow (`app/operations/today/page.tsx`):**

- `showStartShiftGate` — branch not open → **Open Shop** (`openWithShift`)
- `showClockInGate` — branch open but current staff not on shift → **Clock In**

**Opening the shop via staff UI uses `openWithShift`**, which atomically:

1. Opens the day closing record
2. Creates a `Start Shift` audit entry for the opener (counts as clocked-in)

**Separate open-without-shift path exists** (`action: "open"` / `openDay`) for branch-manager scenarios in verification scripts — it opens the branch **without** clocking anyone in. The production staff UI does **not** use this path.

**Mission Control** shows `openedByName` from the day closing record and **Staff Working** from attendance audit (`getActiveStaffAttendance`). These can diverge by design.

### Bug or Intentional?

**Intentional distinction.** Branch open ≠ staff on shift.

Fazil seeing the clock-in gate while Mission Control shows him as opener is **expected** when:

1. He opened the branch via a path that did not create a `Start Shift` audit (rare in production UI), **or**
2. He opened with `openWithShift`, later **clocked out**, and returned, **or**
3. Legacy branch code mismatch (`salaama` vs `branch2`) prevented the client from matching his `Start Shift` audit to the active branch

### Changes Made (Task 1)

1. **UI wording** (`components/operations/open-shop-page.tsx`) — clarifies that opening the shop and clocking in are separate steps, including after returning or clocking out.
2. **Branch alias** (`lib/branch/codes.ts`) — maps legacy `salaama` → canonical `branch2` so attendance branch matching works across code variants.

No change to attendance API behavior, day-closing model, or Mission Control calculation.

---

## Task 2 — Owner Reports: All Branches

### Implementation

- **Owner branch selector** on Reports: All Branches | Kansanga | Salaama (from `BranchProvider` / DB codes)
- **Default for owner:** All Branches (`hooks/use-reports.ts`)
- **Staff:** locked to assigned branch; no selector shown
- **Server:** `resolveReportsBranchFilter()` in `lib/server/branch-scope.ts`
  - Owner + `branch=all` → no branch filter (combined totals)
  - Owner + specific branch → filter to that branch
  - Staff → always own branch (client `branch` param ignored for authorization)

Combined totals appear in `ReportsSummary`; per-branch breakdown in `ReportsBranchTotals` (filtered when a single branch is selected).

---

## Task 3 — Reports Exact Calendar Date

### Implementation

- Native `<input type="date">` when **Daily** period is selected
- Subtitle shows full calendar label (e.g. "Friday, September 12, 2026")
- API accepts `date=YYYY-MM-DD` query param as report anchor
- Weekly / monthly / yearly behavior unchanged (anchor defaults to today when no date sent)

### Business-Date Rule

Reports continue to filter via `DailyOperation.date` (business date), **not** `createdAt`:

- `listDailyOperationsInPeriod()` → `where: { date: { gte, lte } }`
- After-midnight transactions assigned to the prior business day remain included when that business date is selected

---

## Zero-Data Behavior

- Summary cards always render (Sales / Expenses / Savings at UGX 0)
- Chart area shows empty-state copy distinguishing zero activity from errors
- No error thrown for dates with no completed operations

---

## Tests and Evidence

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Targeted UX verifier | `npm run verify:targeted-go-live-ux` | **PASS** (11/11) |
| Reports branch codes | `npm run verify:reports-branch-code-alignment` | **PASS** (10/10) |
| Reports aggregation | `npm run verify:reports` | **PASS** (6/6) |
| Close-day business date | `npm run verify:close-day-date` | **PARTIAL** — static checks PASS; live DB checks failed (`Branch not found: salaama` — local DB missing production branch seed; not introduced by this change) |
| Branch selection | `npm run verify:branch-selection` | **PARTIAL** — static checks PASS; live cashier creation failed (`Branch not found: salaama` — same local DB gap) |

---

## Production Impact

- **No schema changes**
- **No production data mutations**
- **No env var changes**
- **No prisma db push**
- Reports API adds optional `branch` and `date` query params (backward compatible)
- Staff branch authorization unchanged server-side

---

## Intentionally Left Unchanged

- Full attendance / open-shop state machine
- Mission Control staff-working calculation
- Weekly / monthly / yearly report range logic
- Global active branch preference (Reports uses page-local scope for owners)
- Broad data-integrity / historical verification suites
