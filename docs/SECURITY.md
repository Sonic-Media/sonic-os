# Sonic OS Security Report

Audit date: 2026-08-02  
Scope: input validation, rate limiting, password hashing, cookies, CSRF, authorization middleware, logging, audit trails, error handling.

No UI redesign was performed.

---

## Executive summary

| Control | Before | After |
|---------|--------|-------|
| Server authorization | Authentication only | Role + module + owner middleware on all `withDatabase` routes |
| CSRF | None | Origin/Referer validation on mutating `/api/*` requests |
| Rate limiting | None | Login/unlock throttling (10 / 15 min per IP) |
| Session tokens | Raw random bytes | HMAC-signed tokens using `SESSION_SECRET` |
| Secure cookies | `NODE_ENV === production` | `APP_ENV` staging/production + explicit clear on logout |
| Inactive users | Sessions remained valid | Sessions rejected and deleted |
| Failed login audit | Not recorded | DB audit when user exists; structured log otherwise |
| Internal errors | Generic message (good) | Structured server logs; clients never see stack traces |
| Request logging | Ad hoc `console.error` | JSON request/error/security event logging |
| Import validation | Raw JSON | Zod schema (max 5000 entries) |
| Security headers | None | Middleware sets baseline headers on all routes |

---

## 1. Input validation

### Implemented

| Area | Implementation |
|------|----------------|
| Auth | `lib/validation/auth.ts` — login, user create/update, active branch |
| Branches | `lib/validation/branch.ts` |
| Historical import | `lib/validation/daily-operations.ts` — `importDailyOperationsSchema` (max 5000 rows) |
| Request parsing | `lib/validation/request.ts` — `parseJsonBody`, `parseSearchParams` |
| Env startup | `lib/env/validate.ts` + `instrumentation.ts` (existing) |

Import route now validates body before service execution:

```typescript
const body = await parseJsonBody(request, importDailyOperationsSchema);
```

### Remaining gaps

Domain services (sales, purchases, expenses, stock) still use inline validation. Recommended: add Zod schemas per module in `lib/validation/`.

---

## 2. Rate limiting

**File:** `lib/server/security/rate-limit.ts`

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 10 attempts | 15 minutes / IP |
| Unlock | 10 attempts | 15 minutes / IP |

Returns `429` with code `rate_limited`. Uses in-memory buckets (suitable for single-node; use Redis for multi-instance production).

---

## 3. Password hashing

**File:** `lib/server/password.ts` (unchanged, verified)

- bcrypt with **12 rounds**
- Legacy `local-*` hashes rejected on server
- Minimum 6 characters on server user creation (`users-service`)

---

## 4. Secure cookies

**File:** `lib/server/security/cookies.ts`

| Flag | Value |
|------|-------|
| `httpOnly` | `true` |
| `sameSite` | `lax` |
| `secure` | `true` when `APP_ENV` is staging or production |
| Logout | Explicit `maxAge: 0` overwrite |

---

## 5. CSRF protection

**File:** `lib/server/security/csrf.ts`

For mutating HTTP methods on `/api/*`:

1. Validates `Origin` or `Referer` against expected host
2. Exempt paths: `/api/auth/session` (login), health/readiness probes
3. Authenticated mutations require CSRF check via middleware headers (`x-sonic-pathname`, `x-sonic-method`)

Login action is exempt from CSRF (no session yet); logout/lock/unlock require valid origin.

---

## 6. Role & permission middleware

**Files:**

- `lib/server/security/authorization.ts` — `requireOwner`, `requireRole`, `requirePermission`, `requireModuleAccess`
- `lib/server/security/permissions.ts` — API path → module mapping, owner-only routes
- `lib/server/route-handler.ts` — enforced in `withDatabase()`

### Owner-only API paths

- `/api/users/*`
- `/api/roles`
- `/api/daily-operations/import`
- `/api/audit-log`

### Module-based access

API paths mapped to staff modules (sales, purchasing, stock, etc.). Non-owner roles must have module access per `lib/staff/permissions.ts`.

### Explicit permissions

- Branch creation: `manage_branches` (owner, CEO, branch-manager)

---

## 7. Server-side authorization

All routes using `withDatabase()` now:

1. Require authenticated, unlocked session
2. Enforce owner-only paths
3. Enforce module access by URL prefix (via middleware pathname header)
4. Reject inactive users at session read time

**Session hardening** (`lib/server/session.ts`):

- Validates HMAC-signed token format
- Deletes session if user is disabled
- Deletes session if token signature invalid

**User disable** (`users-service.ts`):

- Deletes all sessions for disabled user
- Writes audit log entry

---

## 8. Environment validation

Existing system retained and now consumed by session signing:

| Variable | Staging/Production |
|----------|-------------------|
| `SESSION_SECRET` | Required (≥ 32 chars) — used for HMAC session tokens |
| `DATABASE_URL` | Required |
| `APP_ENV` / `NODE_ENV` | Must align in production |

Validated at startup via `instrumentation.ts` and `npm run validate:env`.

---

## 9. Request logging

**File:** `lib/server/security/logging.ts`

Structured JSON logs for:

- `request.start` / `request.complete` (auth route)
- `request.error` (all API errors via `handleRouteError` / `jsonError`)
- `security.login_failed`, `security.rate_limit`

Each log includes `requestId`, method, pathname, duration, and user context when available.

---

## 10. Error logging & hidden internal errors

**File:** `lib/api/response.ts`

| Error type | Client response | Server log |
|------------|-----------------|------------|
| `ApiError` | Safe message + code | Logged via `handleRouteError` |
| `ZodError` | Validation summary | Not logged as 500 |
| Unknown errors | `"Unexpected server error."` | Full stack in structured log (500 only) |

Internal stack traces and DB errors are **never** returned to clients.

---

## 11. Audit logging

**Files:**

- `lib/server/security/audit.ts` — `recordSecurityAudit`, `recordSecurityAuditInTransaction`
- `lib/server/services/auth-service.ts` — login, logout, failed login (when user known)
- `lib/server/services/users-service.ts` — disable user
- `lib/server/transaction-audit.ts` — business mutations (existing)
- `app/api/audit-log/route.ts` — owner-only read of last 500 `AuthAuditLog` rows

### Audit events added

| Action | Trigger |
|--------|---------|
| `login` | Successful sign-in |
| `logout` | Sign-out |
| `login-failed` | Wrong password (known user) |
| `disable-user` | User disabled by owner |

---

## 12. Security headers (middleware)

**File:** `middleware.ts`

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restricts camera/mic/geolocation |
| `Cache-Control` | `no-store` on `/api/*` |

Also forwards `x-sonic-pathname` and `x-sonic-method` for server-side CSRF and authorization.

---

## 13. Session token signing

**File:** `lib/server/security/session-token.ts`

Tokens are now `{nonce}.{hmac-sha256}` signed with `SESSION_SECRET`:

- Prevents token forgery without secret
- Invalid signatures trigger session deletion
- New login rotates sessions (deletes prior sessions for user)

---

## 14. Files added/changed

### New

```
lib/server/security/authorization.ts
lib/server/security/permissions.ts
lib/server/security/rate-limit.ts
lib/server/security/csrf.ts
lib/server/security/session-token.ts
lib/server/security/cookies.ts
lib/server/security/logging.ts
lib/server/security/audit.ts
lib/validation/request.ts
lib/validation/daily-operations.ts
middleware.ts
app/api/audit-log/route.ts
docs/SECURITY.md
```

### Updated

```
lib/server/route-handler.ts
lib/server/session.ts
lib/server/services/auth-service.ts
lib/server/services/users-service.ts
lib/api/response.ts
app/api/auth/session/route.ts
app/api/daily-operations/import/route.ts
app/api/branches/route.ts
```

---

## 15. Verification

```bash
npm run build          # passes
npm run validate:env   # validate secrets before deploy
```

Manual security checks:

1. Non-owner calling `GET /api/users` → `403 forbidden`
2. Wrong login 11 times → `429 rate_limited`
3. Disabled user with existing cookie → session cleared, `401`
4. Cross-origin POST without matching Origin → `403 csrf_blocked`
5. Server throw in API → client sees generic error; stack in server logs only

---

## 16. Recommended next steps

| Priority | Item |
|----------|------|
| P1 | Redis-backed rate limiting for multi-instance deployments |
| P1 | Zod schemas for sales, purchases, expenses, stock API bodies |
| P2 | Audit user create/enable/reset-password actions |
| P2 | Content-Security-Policy header (tune for Next.js assets) |
| P2 | Wire UI audit log to `GET /api/audit-log` in API mode |
| P3 | Branch-scoped write authorization (enforce session branch on mutations) |
| P3 | Session rotation on password reset |

---

## 17. Threat model notes

- **Same-origin SPA**: CSRF mitigated via Origin/Referer checks on cookie-authenticated API calls
- **Session theft**: Mitigated via `httpOnly`, `secure`, signed tokens; not mitigated against XSS — avoid rendering untrusted HTML
- **Brute force**: Rate limited on login/unlock; consider account lockout after N failures
- **Privilege escalation**: Server now enforces owner/module checks; client-only gating was insufficient before this hardening
