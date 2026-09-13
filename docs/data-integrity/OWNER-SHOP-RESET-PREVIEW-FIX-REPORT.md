# Sonic OS — Owner Shop Reset Preview Fix Report

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Production touched:** **NO**  
**Destructive reset executed:** **NO**

---

## Root Cause

Vercel Preview POST `/api/admin/shop-reset` failed because `assertSafeTransactionalResetTarget()` blocked the **remote Neon** Preview database without the required Preview-only authorization env vars. The guard threw a plain `Error`, which was masked as **"Unexpected server error."** (HTTP 500 `internal_error`).

GET preview worked because it never invoked the guard.

---

## Exact Fix

### 1. Strengthened database target guard (`lib/server/database-target-guard.ts`)

- Extracted testable `evaluateTransactionalResetTarget()` and `readResetTargetGuardEnv()`.
- Guard refusals now throw **`ApiError`** with:
  - HTTP **403**
  - code **`reset_target_forbidden`**
  - Safe actionable message (no credentials/URLs)
  - Optional `details.fingerprint` and `details.requiredEnvVars`
- **Non-local databases (including Neon) now require ALL of:**
  1. `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`
  2. `ALLOW_NEON_TRANSACTIONAL_RESET=true` (Neon only)
  3. `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT=<exact 12-char fingerprint>`
- **Local development** unchanged — passes without remote env vars.
- **Production** unchanged — still blocked unless `ALLOW_DESTRUCTIVE_OPS=true`.
- **Blocked database names** unchanged (`sonic_os_prod`, `production`, etc.).

### 2. Preview target metadata in Shop Reset GET (`lib/server/branch-shop-reset-service.ts`)

- Preview response includes `resetTarget` with safe metadata:
  - `authorized`, `fingerprint`, `hostCategory`, `database`, `isProductionMode`
  - `message` + `requiredEnvVars` when unauthorized
- `canReset` now reflects `resetTarget.authorized`.

### 3. UI improvements (`components/settings/shop-reset-section.tsx`)

- Shows reset target authorization panel with fingerprint and required Preview env vars when unauthorized.
- Reset button disabled until target is authorized **and** confirmation phrase matches.

### 4. Regression tests (`scripts/verify-shop-reset-target-guard.ts`)

- Production blocked
- Arbitrary Neon blocked
- Wrong fingerprint blocked
- Authorized Preview target passes (mocked)
- Local passes without remote env
- Live: owner-only, wrong confirmation, no destructive POST

---

## Guard Behavior Before / After

| Scenario | Before | After |
|----------|--------|-------|
| Local dev DB | Allowed | Allowed |
| Preview Neon without env vars | Blocked → generic 500 | Blocked → **403 reset_target_forbidden** with fingerprint |
| Preview Neon with full env + matching fingerprint | Blocked (same as above) | **Allowed** |
| Preview Neon with env vars but wrong fingerprint | Blocked (optional fingerprint) | **Blocked** (fingerprint mandatory) |
| Production mode | Blocked | Blocked (unchanged) |
| Arbitrary other Neon DB | Could pass if only ALLOW flags set | **Blocked** without matching fingerprint |

---

## Preview Configuration Required (Manual — Vercel Dashboard)

**Set these on Vercel → Project → Settings → Environment Variables → Preview ONLY:**

| Variable | Value |
|----------|-------|
| `ALLOW_NEON_TRANSACTIONAL_RESET` | `true` |
| `ALLOW_NONLOCAL_TRANSACTIONAL_RESET` | `true` |
| `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT` | **Your Preview database fingerprint** |

**Do NOT set these on Production.**

### How to obtain the fingerprint (safe — no secrets)

1. Deploy this fix to Preview.
2. Log in as Owner → **Settings → Data & Backup → Shop Reset**.
3. The panel shows: **Database fingerprint: `xxxxxxxxxxxx`** (12 characters).
4. Copy that value into `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT` for **Preview** environment only.
5. Redeploy Preview.

The agent **cannot** read Preview `DATABASE_URL` or invent the fingerprint. You must copy it from the deployed Preview UI after this fix lands.

---

## Production Protection

| Control | Status |
|---------|--------|
| Production mode guard | **Active** — requires `ALLOW_DESTRUCTIVE_OPS=true` |
| Fingerprint pin | **Required** for all non-local targets |
| Preview-only env vars | Must be scoped to **Preview** in Vercel (not Production) |
| Blocked DB names | `sonic_os_prod`, `production` still blocked |

---

## Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:shop-reset-target-guard` | **PASS** (new) |
| `npm run verify:owner-shop-reset` | **PASS** |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS** |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/server/database-target-guard.ts` | ApiError guard, mandatory fingerprint for remote, evaluation helpers |
| `lib/server/branch-shop-reset-service.ts` | `resetTarget` in preview, `canReset` tied to authorization |
| `lib/api/shop-reset.ts` | `resetTarget` types |
| `components/settings/shop-reset-section.tsx` | Target authorization UI, submit gate |
| `scripts/verify-shop-reset-target-guard.ts` | New regression tests |
| `scripts/verify-owner-shop-reset.ts` | Updated guard/fingerprint checks |
| `package.json` | `verify:shop-reset-target-guard` script |
| `docs/DATA_PROTECTION.md` | Updated guard documentation |
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-FIX-REPORT.md` | This report |
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-FIX-REPORT.docx` | Word deliverable |

---

## Preview Deployment

- **New Preview commit:** `2c6e03d`
- **Preview reset confirmed working:** **NO** — requires Preview env vars + manual retest after deploy

---

## Destructive Reset / Production

| Item | Status |
|------|--------|
| Production touched | **NO** |
| Destructive reset executed | **NO** |
| Preview reset verified end-to-end | **NO** — pending env configuration + manual test |
