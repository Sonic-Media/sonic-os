# Owner Shop Reset — Vercel Preview POST Authentication Fix

**Branch:** `cursor/owner-shop-reset-preview-auth-fix-b6e7`  
**Date:** 2026-09-13  
**Preview deployment (parent PR branch):** https://sonic-os-git-cursor-close-shop-ux-fix-b6e7-sonic9.vercel.app  
**Preview deployment (this fix):** Pending Vercel build after push

---

## Problem

On Vercel Preview, the Shop Reset page loaded correctly for Kevin (Owner):

- Owner-only UI visible
- Neon database target and fingerprint shown
- Reset target authorization guard working

But submitting the correct confirmation phrase on **POST `/api/admin/shop-reset`** returned:

> Authentication required.

GET preview on the same page succeeded, so the failure was specific to the mutating POST path — not a global auth outage.

---

## Root cause

The `"Authentication required."` message is emitted **only** by `requireSession()` in `lib/server/session.ts` (HTTP 401, code `unauthorized`). CSRF failures use a different message (`Cross-site request blocked.`), and reset target guard failures use `reset_target_forbidden` (403).

### Request path traced

| Step | GET preview | POST reset (before fix) |
|------|-------------|-------------------------|
| Browser | Same-origin fetch, `credentials: "include"` | Same-origin fetch, `credentials: "include"` |
| Client helper | `apiGet` → `apiRequest` | `apiPost` → `apiRequest` |
| Route wrapper | `withDatabase` / `withSessionDatabase` | `withDatabase` |
| CSRF | Skipped (GET) | `assertCsrfProtection(request)` |
| Session lookup | `requireSession()` → `cookies()` | `requireSession()` → `cookies()` (route gate + again inside service) |
| Body read | None | `request.json()` before/alongside second auth check |
| Owner gate | `ownerOnly: true` | `ownerOnly: true` |
| Target guard | Skipped on GET preview | `assertSafeTransactionalResetTarget()` on POST |

The client was **not** omitting credentials. `lib/api/client.ts` already sets `credentials: "include"` for all API calls.

The defect was **server-side session resolution for POST route handlers**:

1. `getSessionFromRequest()` relied exclusively on Next.js `cookies()` from `next/headers`.
2. It did **not** read the inbound HTTP `Request` Cookie header that the browser already sent.
3. The shop-reset POST route called `requireSession()` in `withDatabase`, then called `request.json()`, then called `requireSession()` again inside `runBranchShopReset()`.
4. On Vercel Preview POST handlers — especially long-running routes (`maxDuration = 120`) — this pattern can leave the route gate or service-level auth check without a resolvable session even when the Cookie header is present on the inbound request. GET preview on the same page still worked because it is a simpler, non-mutating request with an earlier auth resolution path.

Verification scripts authenticate via explicit `Cookie` headers on `fetch()` and therefore did not reproduce the Preview browser symptom locally.

---

## Exact code change

### 1. `lib/server/session.ts`

- Added `readSessionTokenFromHttpRequest(request)` to parse `sonic-os-session-token` from:
  - `NextRequest.cookies` when available
  - fallback: raw `Cookie` request header
- `readSessionToken(request?)` prefers the HTTP request, then falls back to `cookies()`.
- Session DB lookup is cached by **token string** (not by zero-arg React cache), so repeated auth checks within one request share one DB read regardless of resolution path.

### 2. `lib/server/route-handler.ts`

- `withDatabase` and `withSessionDatabase` now call `requireSession(options?.request)` so route handlers pass the inbound Request into session resolution.

### 3. `app/api/admin/shop-reset/route.ts`

- Switched to `withSessionDatabase`.
- Resolves the Owner session **once** before `request.json()`.
- Passes the session object into `previewBranchShopReset()` / `runBranchShopReset()`.

### 4. `lib/server/branch-shop-reset-service.ts`

- Service functions now accept `session: AuthSession` from the route instead of calling `requireSession()` internally.
- Owner enforcement remains via `requireOwner(session)`.
- Reset scope, confirmation, target guard, backup, and deletion logic unchanged.

---

## Verification matrix

| Case | Expected | Local result |
|------|----------|--------------|
| A. Unauthenticated POST | 401 rejected | **PASS** (`A-live-unauthenticated-post`) |
| B. Authenticated Owner POST | Reaches confirmation/target guard (not 401) | **PASS** (`B-live-owner-post-not-unauthorized`) |
| C. Authenticated non-owner | 403 forbidden | **PASS** (cashier + manager) |
| D. Wrong confirmation | 400 rejected | **PASS** |
| E. Unauthorized Preview DB target | Guard 403 | **PASS** (static + guard script A–H) |
| F. No destructive reset during tests | No deletion | **PASS** |

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:owner-shop-reset` | **PASS** (includes new AUTH static + live checks) |
| `npm run verify:shop-reset-target-guard` | **PASS** (A–H + live checks) |

## Tests not run

| Test | Reason |
|------|--------|
| Vercel Preview browser E2E (Owner reset POST after deploy) | Preview deployment is Vercel SSO protected; this agent cannot complete authenticated browser POST against the live Preview URL |
| Vercel function log capture for failing POST | Same SSO / no runtime log access from agent environment |
| Destructive Preview reset execution | Explicitly excluded per safety requirements |
| Production deployment test | Out of scope; no Production env or data touched |

---

## Preview behavior

**Before fix (reported on deployed Preview):**

- GET `/api/admin/shop-reset` — Owner session recognized; preview counts and target metadata returned
- POST `/api/admin/shop-reset` — 401 `Authentication required.` despite visible Owner UI

**After fix (expected on next Preview deploy):**

- POST should resolve the same Owner session as GET via Request Cookie header
- Owner POST with wrong confirmation → 400 `confirmation_required` (or 403 target guard if unauthorized)
- Owner POST with correct confirmation + authorized target → proceeds to backup/reset path

**Important:** Preview E2E success is **not claimed** until manually verified on the deployed Preview URL after this branch merges/builds.

---

## Production safety

- No changes to reset scope, deletion sets, confirmation phrases, or target guard rules.
- No Production environment variables modified.
- No Production data modified.
- Unauthenticated and non-owner requests remain rejected.
- Production remains blocked unless explicit maintenance env vars are set (`ALLOW_DESTRUCTIVE_OPS`, fingerprint flags, etc.).
- Session cookies remain `httpOnly`, `sameSite=lax`, `secure` on production/staging — no cookie policy weakening.
- Reading the session from the inbound Request Cookie header is standard for Route Handlers and only accepts the same signed token already issued by the app.

---

## Files changed

| File | Change |
|------|--------|
| `lib/server/session.ts` | Request Cookie header session resolution |
| `lib/server/route-handler.ts` | Pass Request into `requireSession` |
| `app/api/admin/shop-reset/route.ts` | `withSessionDatabase` + session handoff |
| `lib/server/branch-shop-reset-service.ts` | Accept session param; remove internal `requireSession` |
| `scripts/verify-owner-shop-reset.ts` | AUTH regression checks A/B + unit parser test |
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-AUTH-FIX-REPORT.md` | This report |
| `docs/data-integrity/OWNER-SHOP-RESET-PREVIEW-AUTH-FIX-REPORT.docx` | Word deliverable |

---

## Manual Preview verification checklist (for Kevin)

1. Deploy branch `cursor/owner-shop-reset-preview-auth-fix-b6e7` to Vercel Preview.
2. Log in as Owner on Preview.
3. Open **Settings → Data & Backup → Shop Reset**.
4. Confirm GET preview still loads counts + fingerprint.
5. Enter the correct confirmation phrase and submit reset.
6. **Expected:** no `Authentication required.` — request reaches backup/reset or target/confirmation guard with actionable message.
7. Do **not** complete a destructive reset unless intentionally testing on the authorized Preview Neon target.
