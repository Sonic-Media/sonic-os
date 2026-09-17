# SONIC OS — DEPLOYED APP DATA INTEGRITY REVIEW

**Date:** 11 September 2026, 21:38 UTC  
**Type:** Live application verification (read-only)  
**Live URL:** https://sonic-os-lemon.vercel.app  
**Investigator constraint:** No code changes, no env changes, no DB writes, no deploys, no git pushes.

---

## Executive Summary

The consolidated data-integrity work **IS deployed to production**. Vercel Production deployment `6399105149` runs commit **`dcff0bf`**, which merges consolidated branch HEAD **`6a5d4ad`** (Fixes #1–#25). This is provable by commit hash — not inferred from branch names.

**Database:** Previously reported `Invalid URL` is **resolved**. Live `/api/health` now returns `databaseConnected: true`. Login works (owner session HTTP 200).

**Reports:** `/reports` **FAILS in the live UI** after login. Root cause is a **client-side React runtime error**, not database connectivity. API `/api/reports/summary?period=daily` returns HTTP 200, but `byBranch` keys (`main`, `branch2`) do not match UI branch IDs (`main`, `salaama`). Error: `Branch 'salaama' is missing from report aggregation output.`

**Branch switching:** Works. Kansanga and Salaama show distinct data; no stale cross-branch bleed observed in live UI.

**Staff daily wage / expense-inventory:** Live payment or expense mutations **NOT performed** (production data safety).

**Certification status:** This review does **NOT** certify the Data Integrity milestone. Reports crash and several fixes cannot be live-verified without controlled test transactions.

---

## Part 1 — What Is Actually Deployed

| Item | Value |
|------|-------|
| Local HEAD | `136ca45` — docs: regression trace report |
| Local branch | `cursor/regression-trace-report-b6e7` |
| Git working tree | 8 modified certification `.txt` files (uncommitted) |
| Git remote | `origin` → github.com/Sonic-Media/sonic-os |
| Latest main HEAD | `dcff0bf` — Merge data integrity consolidated branch (Fix #24, #25, sync) |
| Consolidated branch HEAD | `6a5d4ad` — fix(integrity): sync staff daily wage UI with persisted payments |
| PR #31 merge commit | `dcff0bf` (merged 2026-09-11 18:14 UTC) |
| Vercel Production deployment ID | `6399105149` |
| Vercel Production commit | `dcff0bf152784cccb3f35dc24936de2917e4d88f` |
| Vercel Production ref | `dcff0bf152784cccb3f35dc24936de2917e4d88f` |
| Deployment timestamp | Created 2026-09-11T18:15:02Z; completed 2026-09-11T21:14:09Z |
| Deployment status | **success** |
| Production domain | https://sonic-os-lemon.vercel.app |
| Vercel deployment URL | https://sonic-8e4itwxy9-sonic9.vercel.app |

### Is consolidated work deployed to sonic-os-lemon.vercel.app?

**YES.**

Proof:
- GitHub deployment record `6399105149` → sha `dcff0bf`
- `git merge-base --is-ancestor 6a5d4ad dcff0bf` → true
- Merge parents: `33201bc` (old main) + `6a5d4ad` (consolidated branch tip)
- All Fix #1–#25 commits verified as ancestors of `dcff0bf` (see Part 2)

---

## Part 2 — Fixes #1–#25 Deployment Matrix

| Fix | Commit | In prod ancestry (`dcff0bf`)? | Code present | Live UI verified | Result |
|-----|--------|-------------------------------|--------------|------------------|--------|
| #1 Branch authorization | `c4cbbab` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #2 Historical save | `1472dd6` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #3 Close-day payouts | `3a5390d` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #4 Awaited mutations | `c059e98` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #5 Expense ownership | `92d6eec` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #6 Branch-switch refresh | `9527cdb` | YES | YES | **YES** | **LIVE** |
| #7 Historical undo | `93e9228` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #8 Auth-gated loading | `c6330d5` | YES | YES | PARTIAL | PARTIAL |
| #9 Live DB day closing | `9109b14` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #10 Close-day date + dashboard dedupe | `25e1385`, `902182d` | YES | YES | PARTIAL | PARTIAL |
| #11 Reports server authority | `ca7ef39` | YES | YES | **NO — Reports crashes** | **NOT LIVE** |
| #12 Branch selection authority | `86fe9ea` | YES | YES | PARTIAL | PARTIAL |
| #15 Auth storage isolation | `dc4fb3e` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #17 Staff payment branch auth | `759e67f` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #19 Audit cache integrity | `11304c1` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #20 Default staff removal | `556def2` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #21 Financial defaults | `c6ce32a` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #22 Financial assertions | `d0ad65f` | YES | YES | CANNOT VERIFY | NOT LIVE (UI) |
| #23 Documentation drift | `57138f7` | YES | YES | N/A (docs) | CODE ONLY |
| #24 Staff daily wage isolation | `df175c8`, `6a5d4ad` | YES | YES | NOT PERFORMED | CODE ONLY |
| #25 Expense/inventory separation | `b2fff12` | YES | YES | NOT PERFORMED | CODE ONLY |

**Legend:** CODE PRESENT = commit is ancestor of production deploy. LIVE UI VERIFIED = observed working behavior on https://sonic-os-lemon.vercel.app during this audit.

---

## Part 3 — Live Page Test Results

**Login:** owner / owner → HTTP 200, session established.

| Route | Result | Notes |
|-------|--------|-------|
| `/` (home) | LOADS | Mission Control, branch status, Today Overview |
| `/login` | LOADS | Default landing when unauthenticated |
| `/operations/today` | LOADS | Daily operations, revenue, expenses visible |
| `/` dashboard / home | LOADS | Metrics populated for active branch |
| `/reports` | **FAILS** | "This page couldn't load" — React crash (see Part 4) |
| `/sales` | LOADS | Accessory sales dashboard |
| `/expenses` | LOADS | Expense management |
| `/inventory` | 404 | Route does not exist (use `/stock`) |
| `/stock` | LOADS | Inventory/stock module (correct route) |
| `/purchasing` | LOADS | Mostly empty data |
| `/staff` | LOADS | Team members visible |
| Staff daily wage (ops) | NOT TESTED | No payment mutations on production |
| Day opening | NOT TESTED | Read-only navigation only |
| Day closing | NOT TESTED | Read-only navigation only |
| Historical operations | NOT TESTED | Not visited in this audit |
| `/settings` | LOADS | Business settings; one failed backup visible |
| Branch switching | **WORKS** | Kansanga ↔ Salaama; distinct data per branch |

---

## Part 4 — Reports Failure Investigation

### User-visible error

Browser shows: **"This page couldn't load — Reload to try again, or go back."**

Console error (authenticated session):

```
Uncaught Error: Branch 'salaama' is missing from report aggregation output.
```

Source: `lib/aggregations.ts` → `getBranchTotals()` (line 106).

### Classification

**Primary: B — React runtime error**  
**Secondary: J — Production branch code drift (other)**

NOT caused by:
- A. Server/database connection failure (DB connected; API returns 200)
- C. API 500 (summary returns 200)
- D. API 401/403 on summary (authenticated call succeeds)
- F. Missing env var for DATABASE_URL (health OK)
- I. Stale deployment (production is `dcff0bf` with latest consolidated code)

### Network evidence

| Request | HTTP | Result |
|---------|------|--------|
| `GET /reports` | 200 | HTML shell loads |
| `GET /api/reports/summary?period=daily` | **200** | JSON returned |
| RSC payloads for `/reports` | 200 | Server components fetch |

Sanitized API response (authenticated, 2026-09-11):

```json
{
  "data": {
    "totalSales": 0,
    "totalExpenses": 0,
    "totalSavings": 0,
    "byBranch": {
      "main": { "sales": 0, "expenses": 0, "savings": 0 },
      "branch2": { "sales": 0, "expenses": 0, "savings": 0 }
    }
  }
}
```

### Root cause chain

1. Fix #11 server reports use PostgreSQL branch **codes** (`main`, `branch2`) in `byBranch`.
2. Live production branches API confirms Salaama code is **`branch2`**, not `salaama`:
   - Kansanga → code `main`
   - Salaama → code `branch2`
3. Reports UI (`ReportsBranchTotals`) iterates settings branches built from `BRANCH_IDS` = [`main`, `salaama`].
4. Client calls `getBranchTotals(byBranch, 'salaama')` → key missing → uncaught throw → page crash.

**Conclusion:** Reports failure is a **branch code mismatch between production DB data and client branch ID constants**, surfacing as a React runtime error after successful API response. Fix #11 code IS deployed; live Reports UI is broken on this production dataset.

---

## Part 5 — Database Health

**Live check (2026-09-11T21:38:46Z):**

```json
{
  "data": {
    "status": "ok",
    "databaseConfigured": true,
    "databaseConnected": true,
    "databaseError": null,
    "timestamp": "2026-09-11T21:38:46.461Z"
  }
}
```

**Status:** Database environment **WORKING** at time of audit.

**Note:** Earlier same-day checks reported `databaseError: "Invalid URL"`. That blocker appears **resolved** (likely Vercel `DATABASE_URL` corrected externally). Not modified during this audit.

**Login proof:** `POST /api/auth/session` with owner credentials → HTTP 200, valid session returned.

---

## Part 6 — Live Branch Test

**Owner login → branch switch test:**

| Branch | Movie Revenue | Accessory Revenue | Operating Expenses | Net Cash | Staff |
|--------|---------------|-------------------|--------------------|---------:|-------|
| Kansanga | UGX 70,000 | UGX 75,000 | UGX 28,000 | UGX 107,000 | Tony |
| Salaama | UGX 56 | UGX 80,000 | UGX 28,000 | UGX 42,056 | Fazil |

**Stale data after switch?** NO — each branch shows distinct values. Fix #6 branch-switch refresh appears **LIVE** for dashboard/operations views tested.

Minor label inconsistency: Salaama sometimes displays internal code `branch2` in UI labels.

---

## Part 7 — Staff Daily Wage Live Test

**LIVE TRANSACTION TEST NOT PERFORMED — PRODUCTION DATA SAFETY**

Fix #24 + sync fix (`df175c8`, `6a5d4ad`) **code IS present** in deployment `dcff0bf`. Cannot confirm Staff A / Staff B payment isolation on live production without creating real payment rows.

**Deployed code path verified in repo at `dcff0bf`:**
- `wageRecorded = Boolean(ownDailyWagePayment)` (per-staff)
- `hasStaffDailyWagePayment` helpers present
- Server duplicate guard: `staffId + branchId + date`

---

## Part 8 — Expense / Inventory Live Test

**LIVE TRANSACTION TEST NOT PERFORMED — PRODUCTION DATA SAFETY**

Fix #25 (`b2fff12`) **code IS present** in deployment. `/stock` page loads on production. Cannot confirm operating expenses do not reduce inventory valuation without controlled test fixtures or read-only DB inspection (not performed — no production DB queries beyond public APIs).

**Expected invariant (from deployed code):** Expenses affect cash/P&L; inventory valuation from stock movements/buying prices only.

---

## Part 9 — Git / Vercel Sync

| Stage | Commit | Status |
|-------|--------|--------|
| LOCAL/CURRENT DEV HEAD | `136ca45` | Regression trace docs only; **not in production** |
| CONSOLIDATED BRANCH HEAD | `6a5d4ad` | Merged into main |
| MAIN HEAD | `dcff0bf` | Current production base |
| PR #31 MERGE | `dcff0bf` | Merged 2026-09-11 |
| VERCEL PRODUCTION | `dcff0bf` | Deployment `6399105149`, status success |

### Is consolidated data-integrity work deployed to production?

**YES.**

Ancestry proof: `dcff0bf` merge commit second parent = `6a5d4ad`. All fix commits (`c4cbbab` through `b2fff12`, `6a5d4ad`, `57138f7`) are ancestors of `dcff0bf`.

**Not deployed:** Local branch `cursor/regression-trace-report-b6e7` commit `136ca45` (docs-only, PR #32 not merged).

---

## Part 10 — Deployment Chain

```
LOCAL HEAD
  136ca45  (cursor/regression-trace-report-b6e7 — docs only, unmerged)
       ↓ pushed
GITHUB BRANCH
  136ca45  (origin/cursor/regression-trace-report-b6e7)
       ↓ PR #32 — OPEN, NOT MERGED
MAIN
  dcff0bf  ← PRODUCTION
       ↑ merged PR #31 (2026-09-11)
CONSOLIDATED (merged via PR #31)
  6a5d4ad  (origin/cursor/data-integrity-consolidated-b6e7)
       ↓
VERCEL PRODUCTION  deployment 6399105149
  dcff0bf
       ↓
LIVE DOMAIN
  https://sonic-os-lemon.vercel.app
```

| Gap | Detail |
|-----|--------|
| Uncommitted local changes | 8 certification `.txt` report files modified |
| Pushed but not merged | `136ca45` on PR #32 (regression trace doc) |
| Merged but was question | Consolidated work **IS** on main and **IS** deployed |
| Deployed to Vercel | `dcff0bf` confirmed by GitHub deployment API |

---

## Part 11 — Data Integrity Live Scorecard

| Area | Code in Production | Live UI Verified | Result | Evidence |
|------|-------------------|------------------|--------|----------|
| Branch authorization | YES | NO | CANNOT VERIFY | No auth mutation tests |
| Historical save | YES | NO | CANNOT VERIFY | No historical save test |
| Close-day payouts | YES | NO | CANNOT VERIFY | No close-day test |
| Awaited mutations | YES | NO | CANNOT VERIFY | No mutation test |
| Expense ownership | YES | NO | CANNOT VERIFY | Expenses page loads only |
| Branch refresh | YES | **YES** | **LIVE** | Kansanga/Salaama switch OK |
| Historical undo | YES | NO | CANNOT VERIFY | Not tested |
| Auth-gated loading | YES | PARTIAL | PARTIAL | Unauth routes redirect to login |
| Live DB day closing | YES | NO | CANNOT VERIFY | Not tested |
| Dashboard expense dedupe | YES | PARTIAL | PARTIAL | Dashboard loads with data |
| Reports server authority | YES | **NO** | **NOT LIVE** | Reports page crashes |
| Branch selection | YES | PARTIAL | PARTIAL | Switch works; code label drift |
| Staff payment branch auth | YES | NO | CANNOT VERIFY | No payment test |
| Auth storage isolation | YES | NO | CANNOT VERIFY | No multi-user test |
| Audit cache | YES | NO | CANNOT VERIFY | Not tested |
| Financial defaults | YES | NO | CANNOT VERIFY | Script-only fix |
| Financial assertions | YES | NO | CANNOT VERIFY | Script-only fix |
| Default staff | YES | NO | CANNOT VERIFY | Staff page loads |
| Documentation | YES | N/A | CODE ONLY | Docs fix, not runtime |
| Staff daily wage isolation | YES | NO | CODE ONLY | No prod payment test |
| Expense/inventory separation | YES | NO | CODE ONLY | No prod mutation test |

---

## Part 12 — Final Classification

This audit establishes:

1. **Deployed code:** Consolidated Fixes #1–#25 **ARE** on production (`dcff0bf`).
2. **Fixes live in UI:** Only a subset verified (branch switch, general page loads, login, DB connectivity). **Reports is broken.**
3. **Reports failure cause:** React runtime error from `salaama` vs `branch2` branch key mismatch — not missing deployment, not current DB outage.
4. **Database environment:** **Working** at audit time (previously `Invalid URL` — resolved externally).
5. **Git/Vercel sync:** Main and Vercel production aligned at `dcff0bf`. Local docs branch `136ca45` not deployed.
6. **Before final certification:** Fix Reports branch-key alignment for production data; re-test Reports live; run controlled live tests for wage/inventory fixes; resolve build/lint/verify script blockers from prior certification.

---

## Remaining Blockers

| Blocker | Severity | Notes |
|---------|----------|-------|
| `/reports` page crash | **CRITICAL** | Branch code mismatch: API `branch2` vs UI `salaama` |
| Live wage/inventory tests not run | HIGH | Production data safety |
| `/inventory` route 404 | LOW | Use `/stock` instead |
| Build/lint/verify suite (prior audit) | HIGH | 10/37 scripts failed in VM certification |
| PR #32 docs branch unmerged | INFO | Does not affect production app |

---

## Production Safety Statement

During this audit:
- **NO** production data modified
- **NO** migrations run
- **NO** prisma db push
- **NO** DATABASE_URL or Vercel env changes
- **NO** deploys or redeploys triggered
- **NO** git pushes
- **NO** code fixes applied
- Login used read-only navigation only; **no** payments, expenses, sales, or day-close mutations created

---

*End of report.*
