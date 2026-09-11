# SONIC OS — REGRESSION TRACE REPORT

**Date:** 11 September 2026  
**Type:** Diagnostic only (no code, env, DB, or migration changes)  
**Prepared for:** Management review

---

## Executive Summary

Two production issues were observed after the 11 Sep deploy:

1. **Daily wage UI** — Staff see "Daily wage already recorded for this date" when they appear unpaid (Cash Summary shows UGX 0).
2. **Database health** — `/api/health` reports `databaseConfigured: true`, `databaseConnected: false`, `databaseError: "Invalid URL"`.

**Verdict: These are INDEPENDENT issues.**

- Daily wage = pre-existing UI bug (fixed in deployed code) plus a client cache sync issue.
- Database = malformed `DATABASE_URL` on Vercel. Not caused by today's merge.

---

## Issue 1 — Daily Wage UI

### What users saw

- Message: "Daily wage already recorded for this date."
- Cash Summary Daily Wage: UGX 0
- Staff member believes they have not been paid

### Root cause A — Branch-wide wage check (pre-existing)

**Introduced:** Commit `747c2c7` (23 Aug 2026)  
**Author:** Kevin Agaba  
**Change:** `const wageRecorded = staffPayouts > 0` in staff operations workspace

**Effect:** If Staff A was paid on a branch/date, Staff B was treated as already paid too — even though the server only blocks duplicates per staff member.

**Was live on:** Sep 3 production (`33201bc`) and pre-merge main.

**Server was always correct:** Duplicate check uses `staffId + branchId + date` since Aug 2026 (`988d0d8`).

### Root cause B — Client cache desync (409 + UGX 0)

The exact error text comes from the **server API** (409 response), not the old branch-wide UI.

**Pattern:** Payment row exists in PostgreSQL for this staff member, but the browser's payments cache is stale → UI shows 0 in Cash Summary while server rejects a new payment.

**Fixed in deploy:** Commit `6a5d4ad` (11 Sep 2026) — refresh payments on duplicate response and on daily wage card mount.

### Fix #24 — Did it correct the branch-wide bug?

**Yes.** Commit `df175c8` (11 Sep 2026):

- Before: `wageRecorded = staffPayouts > 0` (any staff on branch)
- After: `wageRecorded = Boolean(ownDailyWagePayment)` (logged-in staff only)

Both Fix #24 (`df175c8`) and the sync fix (`6a5d4ad`) are included in the current production deploy.

### Key commits (daily wage)

| Commit | Date | What it did |
|--------|------|-------------|
| 747c2c7 | 23 Aug 2026 | Introduced branch-wide wage check (bug) |
| 988d0d8 | 24 Aug 2026 | Server per-staff duplicate guard (unchanged) |
| 759e67f | 11 Sep 2026 | Fix #17 — branch auth only |
| df175c8 | 11 Sep 2026 | Fix #24 — per-staff UI isolation |
| 6a5d4ad | 11 Sep 2026 | Sync fix — 409 + stale cache |

### Files involved

- components/operations/staff/staff-operations-workspace.tsx
- components/operations/staff/staff-daily-wage-card.tsx
- components/operations/staff/staff-end-of-day-card.tsx
- components/operations/staff/staff-day-closed-view.tsx
- hooks/use-entry-form.ts
- lib/staff-payments/calculations.ts
- context/staff-payments-context.tsx
- lib/server/services/staff-payments-service.ts (auth only, not Fix #24)

---

## Issue 2 — Database Invalid URL

### What production reports (live check, 11 Sep 2026)

```
GET https://sonic-os-lemon.vercel.app/api/health

status: ok
databaseConfigured: true
databaseConnected: false
databaseError: Invalid URL
```

Note: `status: ok` means the health endpoint responded. `databaseConnected: false` is the real failure.

### Root cause

`DATABASE_URL` is **set** on Vercel but **cannot be parsed as a valid URL** (typo, bad quotes, truncated value, invalid scheme, etc.).

This is a **Vercel environment configuration problem**, not application code from the merge.

### Code evidence — zero DB/config changes in deploy

Between last known-good prod (`33201bc`, 3 Sep) and today's deploy (`dcff0bf`, 11 Sep):

**No changes to:**
- lib/db.ts
- lib/db/connection.ts
- prisma.config.ts
- lib/env/load-env.ts
- app/api/health/route.ts
- app/api/auth/session/route.ts

The "Invalid URL" diagnostic path existed since Aug 2026 (`cc6a24f`) and was already on Sep 3 production.

**No Cursor Fix #24 commits touched database or config files.**

---

## Are the two issues related?

**No.**

| | Daily wage | Database Invalid URL |
|---|------------|---------------------|
| Same Cursor commit chain? | Yes (Fix #24) | No |
| Introduced by today's merge? | Merge fixes pre-existing bug | No |
| Fix in deployed code? | Yes (df175c8 + 6a5d4ad) | Requires Vercel env fix |
| Can verify on prod now? | No — DB down blocks login | N/A |

Pre-deploy screenshots showed revenue data loaded → database **was working before redeploy**. Failure appeared after redeploy, pointing to env misconfiguration at deploy time — not new code.

---

## Deployment reference

| Item | Value |
|------|-------|
| Last known-good prod | 33201bc (3 Sep 2026) |
| Feature branch HEAD | 6a5d4ad |
| Production deploy commit | dcff0bf (11 Sep 2026, 18:14 UTC) |
| PR merged | #31 — https://github.com/Sonic-Media/sonic-os/pull/31 |
| Production URL | https://sonic-os-lemon.vercel.app |

---

## Was production touched?

| Action | Done by agent? |
|--------|----------------|
| Code merged and deployed (PR #31) | Yes |
| Vercel DATABASE_URL changed | No |
| Production database modified | No |
| Migrations run on production | No |

---

## Recommended next steps

1. **Fix Vercel production `DATABASE_URL`** — validate as a proper `postgresql://...` URL with no stray quotes or line breaks.
2. **Confirm health** — `/api/health` should show `databaseConnected: true`.
3. **Re-test daily wage** — with DB restored, verify Fix #24 and sync fix on production.

---

## Conclusions

1. **Daily wage:** Caused by branch-wide UI logic from Aug 2026. Server was always per-staff. Fix #24 and sync fix are in the deployed code but cannot be verified until DB is restored.

2. **Database:** Caused by malformed `DATABASE_URL` on Vercel. Not caused by merge commits between 33201bc and dcff0bf.

3. **Relationship:** Independent issues coinciding around the 11 Sep redeploy.

---

*Diagnostic investigation only. No credentials exposed. No production database access.*
