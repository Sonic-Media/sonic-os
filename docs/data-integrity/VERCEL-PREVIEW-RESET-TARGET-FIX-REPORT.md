# Sonic OS — Vercel Preview Reset Target Classification Fix

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Production touched:** **NO**  
**Destructive reset executed:** **NO**

---

## Root Cause

The Shop Reset guard used `isProductionMode()` (`APP_ENV=production` or `APP_MODE=production`) to block reset with the message *"Shop reset is disabled in production mode."*

Vercel Preview deployments commonly use:

- `NODE_ENV=production` (production build)
- `APP_ENV=production` (application config)
- `VERCEL_ENV=preview` (actual deployment tier)

Because the guard ignored `VERCEL_ENV`, Preview was misclassified as a **production deployment** for reset authorization. The user's Preview database fingerprint `3c974614fe7b` was never evaluated — the guard stopped at the production-mode check first.

**Exact misclassification signal:** `APP_ENV=production` (and/or `APP_MODE=production`) without checking `VERCEL_ENV=preview`.

---

## Exact Fix

### 1. New deployment environment module (`lib/env/deployment-environment.ts`)

- `resolveDeploymentEnvironment()` uses **`VERCEL_ENV` first**:
  - `preview` → `vercel-preview`
  - `production` → `vercel-production`
  - local host → `local`
  - other remote → `remote`
- `isResetGuardProductionDeployment()` returns **false** for `vercel-preview` and `local`, even when `APP_ENV=production` or `NODE_ENV=production`.

### 2. Updated guard (`lib/server/database-target-guard.ts`)

- Production block now uses **`isResetProductionDeployment`**, not `isProductionMode`.
- Refusal messages distinguish **Vercel Production** vs generic production deployment.
- Preview response includes `deploymentEnvironment`, `deploymentLabel`, and `isResetProductionDeployment`.

### 3. UI (`components/settings/shop-reset-section.tsx`)

- Shows **Deployment: Vercel Preview / Vercel Production / Local / Remote** instead of implying APP production mode.

---

## Preview vs Production Behavior

| Deployment | Reset guard production block | Remote Neon authorization |
|------------|------------------------------|---------------------------|
| **Local** | No | Not required (local host passes) |
| **Vercel Preview** | **No** (even if APP_ENV=production) | Required: Neon + non-local flags + matching fingerprint |
| **Vercel Production** | **Yes** (unless ALLOW_DESTRUCTIVE_OPS) | N/A — blocked at production deployment check |
| **Remote non-Vercel + APP_ENV=production** | **Yes** | Required if not production-blocked |

Fingerprint protection unchanged — flags alone never authorize arbitrary Neon databases.

---

## Preview Configuration Still Required (Manual — Vercel Dashboard)

After this fix deploys, Preview should show **Deployment: Vercel Preview** and the fingerprint/missing-env message (not production mode).

Set on **Preview ONLY**:

| Variable | Value |
|----------|-------|
| `ALLOW_NEON_TRANSACTIONAL_RESET` | `true` |
| `ALLOW_NONLOCAL_TRANSACTIONAL_RESET` | `true` |
| `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT` | `3c974614fe7b` |

**Do NOT set these on Production.**

Redeploy Preview after setting env vars.

---

## Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:shop-reset-target-guard` | **PASS** (A–H + live checks) |
| `npm run verify:owner-shop-reset` | **PASS** |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS** |

Regression coverage includes:

- **H:** `NODE_ENV=production` + `VERCEL_ENV=preview` + `APP_ENV=production` → not production deployment for reset guard
- **F:** Preview fingerprint `3c974614fe7b` with required flags passes (mocked)

---

## Files Changed

| File | Change |
|------|--------|
| `lib/env/deployment-environment.ts` | New VERCEL_ENV-aware deployment classification |
| `lib/server/database-target-guard.ts` | Use reset production deployment signal; expose deployment metadata |
| `lib/api/shop-reset.ts` | Updated resetTarget types |
| `components/settings/shop-reset-section.tsx` | Show deployment label in UI |
| `scripts/verify-shop-reset-target-guard.ts` | Tests A–H |
| `scripts/verify-owner-shop-reset.ts` | Updated static checks |
| `scripts/safe-transactional-reset.ts` | Log deployment classification |
| `docs/data-integrity/VERCEL-PREVIEW-RESET-TARGET-FIX-REPORT.md` | This report |
| `docs/data-integrity/VERCEL-PREVIEW-RESET-TARGET-FIX-REPORT.docx` | Word deliverable |

---

## Preview Deployment

- **New Preview commit:** *(filled after push)*
- **Manual Preview retest required:** **YES**
- **Preview reset confirmed working:** **NO** — awaiting deploy + env vars + manual test

---

## Production / Destructive Reset

| Item | Status |
|------|--------|
| Production touched | **NO** |
| Production env vars modified | **NO** |
| Destructive reset executed | **NO** |
