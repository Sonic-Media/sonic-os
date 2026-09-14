# Sonic OS — Owner Shop Reset Preview Failure Report

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Preview deployment commit:** `e58aae5`  
**Preview URL:** https://sonic-os-git-cursor-close-shop-ux-fix-b6e7-sonic9.vercel.app  
**Vercel deployment:** https://vercel.com/sonic9/sonic-os/2xkuRnQBWe6SZ2pNQitBvcGMDFUh  
**Production touched:** **NO**  
**Destructive reset executed:** **NO**

---

## Summary

Manual Preview testing confirms the **new Owner Shop Reset UI loads correctly** (open-day blocker replaced with warnings). Clicking **Reset Both Sonic Shops** with confirmation phrase `RESET BOTH SONIC SHOPS` returns the generic client message **"Unexpected server error."**

Diagnosis identifies the most probable failing step as **`assertSafeTransactionalResetTarget()`** (database target guard), which runs on **POST only** and throws a plain `Error` that is masked as `"Unexpected server error."` in Preview/production runtime. **No destructive transaction should have started** if the guard fails at step 2.

Direct Vercel Preview runtime logs could **not** be retrieved from this agent environment (deployment SSO protected; no `VERCEL_TOKEN`). The report includes the exact log event signature to inspect in the Vercel dashboard.

---

## Observed Failure (Manual Preview Test)

| Field | Value |
|-------|-------|
| UI location | Settings → Data & Backup → Shop Reset |
| Scope selected | Both Shops |
| Confirmation entered | `RESET BOTH SONIC SHOPS` |
| Client message | `Unexpected server error.` |
| Open-day blocker | Correctly replaced with owner warnings (confirmed working) |

---

## HTTP Response (Expected from Code Path)

Based on server error-handling (`lib/server/security/logging.ts` → `toPublicErrorMessage`):

| Field | Expected value |
|-------|----------------|
| HTTP status | **500** |
| Response body `error.code` | **`internal_error`** |
| Response body `error.message` | **`Unexpected server error.`** |
| Real exception message | **Not exposed** to client in Preview (`NODE_ENV=production`) |

The UI is **not hiding** a richer API message in this case — the API itself returns the generic 500 message for non-`ApiError` exceptions.

---

## Exact Safe Server Error (Runtime — Vercel Logs)

**Not directly retrieved from Vercel in this run.** Inspect Vercel function logs for deployment `e58aae5`:

```
event: shop_reset.route.error
pathname: /api/admin/shop-reset
method: POST
```

The route logger writes `errorMessage` and `stack` server-side (`app/api/admin/shop-reset/route.ts`).

### Most Probable `errorMessage` (code-proven guard path)

When Preview `DATABASE_URL` points at **Neon** and override env vars are unset:

```
Refusing reset: DATABASE_URL points at Neon. This may be production. Set ALLOW_NEON_TRANSACTIONAL_RESET=true only after confirming the target is a non-production database.
```

If Neon override is set but non-local override is not:

```
Refusing reset: target host "<host>" is not local. Set ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true only after confirming this is not production.
```

These messages are **safe to surface** (no credentials) but are currently **not returned** to the browser.

---

## Root Cause

**Primary (high confidence):** `assertSafeTransactionalResetTarget()` in `lib/server/branch-shop-reset-service.ts` blocks POST reset on Vercel Preview because Preview uses a **remote Neon PostgreSQL** target without the explicit override environment variables required by `lib/server/database-target-guard.ts`.

**Why this fits the evidence:**

1. **GET preview works** — `previewBranchShopReset()` does **not** call the database target guard.
2. **POST reset fails generically** — guard throws plain `Error`, masked as `"Unexpected server error."` outside development.
3. **Manual JSON backup on Preview works** — `triggerDatabaseBackup()` calls `createDatabaseBackup()` but **does not** call `assertSafeTransactionalResetTarget()`.
4. Guard runs **before** backup and **before** any Prisma `$transaction`.

**Secondary possibilities (lower confidence, only if guard overrides are already set on Preview):**

- Unhandled exception from `createDatabaseBackup()` (would also mask as generic 500; less likely because manual backup succeeded on same Preview).
- Prisma error inside `$transaction` (would imply guard passed and backup completed; no evidence of partial deletion reported).

---

## Failing Code Path

```
POST /api/admin/shop-reset
  → withDatabase(..., { ownerOnly: true })          ✓ likely pass (owner session)
  → runBranchShopReset()
      → requireOwner(session)                       ✓ likely pass
      → assertSafeTransactionalResetTarget()        ✗ MOST LIKELY FAIL HERE
      → assertShopResetConfirmation()               (not reached if guard fails)
      → resolveBranchTargets("both")                (not reached)
      → createDatabaseBackup()                      (not reached)
      → client.$transaction(deleteBranchScopedData) (not reached)
      → validateShopResetVerification()             (not reached)
  → handleRouteError → jsonError → 500 internal_error
```

File: `lib/server/branch-shop-reset-service.ts` lines 370–421.

---

## Step-by-Step Failure Analysis

| Step | Reached on Preview? | Evidence |
|------|---------------------|----------|
| requireOwner | Yes (implicit) | Owner can load GET preview counts |
| Branch resolution (`both`) | Yes on GET | UI shows Both Shops counts |
| Database target guard | **Fails on POST** | POST-only guard; matches generic 500 |
| Confirmation validation | Unlikely reached | Would return 400 `confirmation_required`, not generic 500 |
| Open/pending DayClosing handling | N/A on POST | Blocker removed; not a POST failure mode |
| Backup creation | **Unlikely reached** | Guard precedes backup; manual backup works separately |
| Prisma transaction | **Not started** | Guard/backup precede `$transaction` |
| Sale/Expense/Purchase/... deletion | **No** | Inside transaction |
| AuthAuditLog recording | **No** | Inside transaction |
| Post-reset verification | **No** | After transaction |
| Response serialization | Returns error envelope | Generic 500 message |

---

## Preview DATABASE_URL Configuration (Safe Metadata)

Could not read Preview platform env vars from this agent. Expected Preview profile:

| Attribute | Expected on Vercel Preview |
|-----------|----------------------------|
| Provider/host category | **Neon** (`*.neon.tech`) |
| Runtime | **Vercel serverless** (`VERCEL=1`, `VERCEL_ENV=preview`) |
| Production mode | **Non-production** (typical Preview `APP_ENV`) |
| Target guard classification | **Remote Neon — blocked by default** unless `ALLOW_NEON_TRANSACTIONAL_RESET=true` and `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true` |
| Fingerprint | Exposed by guard as `SHA256(host/database)[0:12]` when env diagnostics run |

Local agent environment (for comparison only): `hostCategory=local`, `database=sonic_os`, guard **PASS**.

---

## Backup Step Analysis

| Question | Finding |
|----------|---------|
| Does manual Preview backup work? | **Yes** (user confirmed JSON gzip backup stored in database) |
| Does Shop Reset use same backup function? | **Yes** — `createDatabaseBackup()` |
| Does Shop Reset use backup-service wrapper? | **No** — calls `createDatabaseBackup()` directly |
| Does backup run before guard? | **No** — guard is step 2; backup is step 5 |
| Is backup the cause? | **Unlikely** — guard runs first; manual backup proves backup path works on Preview when guard is not invoked |

Shop Reset backup failure would throw `ApiError("Backup failed — shop reset was not started.")` (`backup_failed`) — **not** `"Unexpected server error."`

---

## Transaction / Data Integrity

| Question | Answer |
|----------|--------|
| Did transaction begin? | **No** (if guard fails — most likely case) |
| Any destructive operation executed? | **No evidence** |
| Rollback occurred? | **N/A** — transaction not entered |
| Data modified despite UI error? | **No** — guard throws before `$transaction` |

If Vercel logs show failure **after** `createDatabaseBackup`, re-evaluate — that would indicate backup succeeded and transaction may have started (would require log inspection).

---

## UI Error Display

| Item | Finding |
|------|---------|
| UI component | `components/settings/shop-reset-section.tsx` |
| Error source | `resolveErrorMessage()` → `isApiError(error) ? error.message : fallback` |
| API message received | `"Unexpected server error."` |
| UI hiding richer message? | **No** — API already returns generic message for guard failures |
| Client change needed? | **Not until server maps guard failures to safe `ApiError` messages** |

---

## Two Reset Systems (Both Exist — Do Not Delete)

| Feature | UI Location | API | Service |
|---------|---------------|-----|---------|
| **A. NEW Owner Shop Reset** | Settings → Data & Backup → Shop Reset | `GET/POST /api/admin/shop-reset` | `lib/server/branch-shop-reset-service.ts` |
| **B. LEGACY Maintenance Reset** | Settings → Maintenance → Reset Business Data | `GET/POST /api/admin/business-reset` | `lib/server/business-data-reset-service.ts` |

| Comparison | NEW Shop Reset | LEGACY Maintenance Reset |
|------------|----------------|--------------------------|
| Database target guard | **Yes** | **No** |
| Automatic backup before delete | **Yes** | **No** |
| Branch-scoped | **Yes** (Kansanga / Salaama / Both) | **No** (category selection, global) |
| Confirmation phrases | Branch-specific | `BUSINESS_DATA_RESET_CONFIRMATION` |
| Overlap | Both can delete operational data | Different APIs/services — **NEW does not call legacy path** |

**Conclusion:** NEW Shop Reset is canonical and **does not** accidentally invoke legacy reset.

---

## Branch Scope for `both` (Static Verification)

`resolveBranchTargets("both")` resolves:

- Kansanga → `getBranchIdByCode("main")`
- Salaama → `getBranchIdByCode("salaama")`

Deletion uses `branchId: { in: branchIds }` — branch isolation preserved. **No issue found** with Both Shops scope selection.

---

## Database Target Guard (Preview vs Production)

| Target | Guard behavior |
|--------|----------------|
| Vercel Preview (Neon, non-prod) | **Blocked by default** without explicit override env vars |
| Production | **Still protected** — requires `ALLOW_DESTRUCTIVE_OPS=true` in production mode + Neon/non-local overrides |

**No guard weakening recommended** as part of diagnosis. Fix should expose safe guard refusal messages and/or configure Preview-only override env vars after confirming non-production fingerprint.

---

## Tests Actually Run (Diagnosis Turn)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:owner-shop-reset` | **PASS** (local; non-destructive) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS** |
| `npx tsx scripts/diagnose-shop-reset-preview-failure.ts` | **PASS** (new safe helper) |

No verification tests updated — failure is Preview-environment guard configuration / error surfacing, not a regression in open-day logic.

---

## Files Changed (Diagnosis Only)

| File | Purpose |
|------|---------|
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-FAILURE-REPORT.md` | This report |
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-FAILURE-REPORT.docx` | Word deliverable |
| `scripts/diagnose-shop-reset-preview-failure.ts` | Safe non-destructive diagnosis helper |

**No application/runtime fix applied in this turn.**

---

## Recommended Next Steps (For Follow-Up — Not Done Here)

1. Open Vercel → Project → Deployment `e58aae5` → Functions → filter logs for `shop_reset.route.error` on POST `/api/admin/shop-reset` to **confirm exact `errorMessage`**.
2. If guard refusal confirmed, either:
   - Set Preview-only env vars (`ALLOW_NEON_TRANSACTIONAL_RESET`, `ALLOW_NONLOCAL_TRANSACTIONAL_RESET`, optional `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT`) after verifying non-production database, **or**
   - Map guard failures to safe `ApiError` responses (400/403 with refusal message) so UI shows actionable text.
3. Re-test Preview POST with wrong confirmation first (non-destructive) — should return **400** once guard passes.

---

## Production / Destructive Reset Status

| Item | Status |
|------|--------|
| Production touched | **NO** |
| Destructive reset executed | **NO** |
| Preview reset confirmed working | **NO** — failure under diagnosis |
