# Sonic OS — Phase 1 Fix: Server-Side Branch Authorization

**Date:** 10 September 2026  
**Milestone:** Data Integrity (Phase 1)  
**Scope:** Critical branch-authorization fixes only (authorized subset of Phase 1 audit)  
**Branch:** `cursor/phase1-branch-auth-b6e7`  
**Pull request:** [#9](https://github.com/Sonic-Media/sonic-os/pull/9)

---

## Executive Summary

Phase 1 audit identified **CRITICAL** gaps where server APIs accepted a client-provided `branch` code without validating it against the authenticated session. A staff member at Salaama could craft an API request targeting Kansanga and modify another branch’s data.

This fix implements **server-side branch authorization** on the authorized write paths. The client is never trusted to decide which branch a user may operate on. All branch-sensitive writes now:

1. Identify the authenticated session.
2. Determine the branch requested by the operation.
3. Validate that the user is authorized for that branch.
4. Use the validated server-side branch ID for the operation.

Existing helpers (`getBranchIdForSession`, `assertSessionCanAccessBranchCode`) are used throughout — no competing authorization system was introduced.

---

## Phase 1 Branch Authorization Fix Result: **PASS**

All six targeted authorization scenarios pass automated verification. Build and typecheck pass. **No production data was modified.**

---

## Core Rule

> The client must **never** be trusted to decide which branch a user may operate on.

Hiding another branch in the UI is not sufficient. A manually crafted API request must also be rejected server-side.

**Example:** A Salaama staff session sending `branch: "KANSANGA"` receives **403** `branch_forbidden` and does not modify Kansanga data.

**Owner requirement:** Owners retain cross-branch access (Kansanga and Salaama). Branch switching for owners is not restricted by these changes.

---

## Audit Findings Addressed

This fix resolves **Critical findings #1, #2, #3, and #5** from `docs/PHASE-1-DATA-INTEGRITY-AUDIT.md`. Other Phase 1 findings were **not** modified.

| Audit # | Finding | Status |
|---------|---------|--------|
| 1 | Daily operations accept client branch without session validation | **FIXED** |
| 2 | Day closing operations accept client branch without session validation | **FIXED** |
| 3 | Attendance accepts client branch without access check | **FIXED** |
| 4 | Historical save does not await PostgreSQL persistence | Not in scope |
| 5 | Bulk delete of historical operations is not owner-only | **FIXED** |
| 6–23 | All other High / Medium / Low findings | Not in scope |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/server/branch-record-guard.ts` | **NEW** — `assertRecordInSessionBranchScope` helper |
| `lib/server/services/daily-operations-service.ts` | Session branch validation on all write paths |
| `lib/server/services/day-closings-service.ts` | `getBranchIdForSession` on open/close/reopen/draft |
| `lib/server/services/attendance-service.ts` | Branch validation before attendance reads/writes |
| `app/api/daily-operations/bulk-delete/route.ts` | Owner-only route + session-scoped deletion |
| `lib/server/security/permissions.ts` | Added bulk-delete to `OWNER_ONLY_PREFIXES` |
| `scripts/verify-branch-authorization.ts` | **NEW** — focused authorization test suite |
| `package.json` | Added `verify:branch-authorization` script |

---

## Authorization Changes (Detail)

### 1. Daily operations — `daily-operations-service.ts`

| Function | Before | After |
|----------|--------|-------|
| `upsertDailyOperation` | `getBranchIdByCode(entry.branch)` | `getBranchIdForSession(session, entry.branch)`; on update, `assertRecordInSessionBranchScope` + block cross-branch moves |
| `importDailyOperations` | Per-entry `getBranchIdByCode` | Per-entry `getBranchIdForSession(session, entry.branch)` |
| `deleteDailyOperation` | Delete by ID only | Load record → `assertRecordInSessionBranchScope` → delete |
| `removeDailyOperationsByIds` | No branch filter | Owner: all IDs; staff: scoped via `resolveBranchListFilter` |
| `listDailyOperationsByBranchDate` | `getBranchIdByCode` | `getBranchIdForSession(session, branchCode)` |

**Cross-branch move blocked:** Updating an existing record with a different `branch` in the body returns **400** `branch_mismatch`.

**Unauthorized record access:** Staff attempting update/delete on a record in another branch receive **404** `not_found` (no information leak).

---

### 2. Day closings — `day-closings-service.ts`

| Function | Change |
|----------|--------|
| `openDay` | `getBranchIdForSession(session, parsed.branch)` replaces `getBranchIdByCode` |
| `openWithShift` | Same |
| `closeDay` | Same |
| `reopenDay` | Same |
| `ensureDailyOperationDraft` | Validates branch via `getBranchIdForSession` before draft creation |

Read-only helpers (`getClosedDayRecord`, `isBranchDayOpened`) remain unchanged — they are not write paths and were outside authorized scope.

---

### 3. Attendance — `attendance-service.ts`

| Function | Change |
|----------|--------|
| `recordAttendanceAction` | Calls `getBranchIdForSession(session, branch)` before any write |
| `assertBranchDayOpen` | Resolves branch via `getBranchIdForSession(session, branch)` before day-open lookup |

Cross-branch clock-in is rejected with **403** before day-open or shift checks run.

---

### 4. Bulk delete — `bulk-delete/route.ts` + `permissions.ts`

| Control | Implementation |
|---------|----------------|
| Owner-only access | Route uses `{ request, ownerOnly: true }`; path added to `OWNER_ONLY_PREFIXES` |
| Branch scoping | Session passed to `removeDailyOperationsByIds(ids, session)` |
| Cross-branch IDs | Staff bulk delete returns **0 deleted** for foreign-branch IDs; manager receives **403** |

---

### 5. New helper — `branch-record-guard.ts`

```typescript
assertRecordInSessionBranchScope(session, branchId)
```

- **Owners:** bypass (any branch allowed).
- **Staff:** record `branchId` must appear in `resolveBranchListFilter(session).branchId.in`.
- **Failure:** **404** `not_found` (consistent with ID-based access patterns elsewhere).

---

## Authorization Matrix (Verified)

| Actor | Target branch | Expected | Verified |
|-------|---------------|----------|----------|
| Owner | Kansanga (`main` / `kansanga`) | Allowed | Yes |
| Owner | Salaama | Allowed | Yes |
| Salaama staff | Kansanga / `main` | **403** rejected | Yes |
| Kansanga staff | Salaama | **403** rejected | Yes |
| Staff (wrong branch) | Update/delete foreign record ID | **404** rejected | Yes |
| Staff | Bulk delete cross-branch IDs | 0 deleted | Yes |
| Non-owner (manager) | Bulk delete endpoint | **403** rejected | Yes |
| Owner | Bulk delete endpoint | Allowed | Yes |

---

## Tests Run

| Command | Result |
|---------|--------|
| `npm run verify:branch-authorization` | **PASS** |
| `npm run build` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| ESLint (changed files) | PASS (1 pre-existing issue in `permissions.ts`, unrelated) |

### Verify script sections

1. **Session branch matrix** — unit tests for `assertSessionCanAccessBranchCode` (owner + staff cross-branch)
2. **Owner branch resolution** — `getBranchIdForSession` for `main`, `salaama`, `kansanga` alias
3. **Record scope + bulk delete** — `assertRecordInSessionBranchScope`; `removeDailyOperationsByIds` cross-branch scoping via DB
4. **API authorization** — ephemeral test users via `verify-bootstrap`; day-closings open, attendance clock-in, record delete, bulk-delete endpoints

Run locally (requires local PostgreSQL, not Neon):

```bash
npm run verify:branch-authorization
```

---

## Production Data Impact

| Item | Value |
|------|-------|
| **Production data touched** | **NO** |
| Schema changes | None |
| Migrations run | None |
| Data rewrite / delete | None |
| Destructive commands | None (`prisma db push`, `prisma migrate reset`, etc. not run) |

Verify script creates ephemeral `DailyOperation` rows on dates `2099-01-01`–`2099-01-03` and certification staff users; all cleaned up in `finally` blocks.

---

## Intentionally Not Fixed (Remaining Phase 1)

The following audit items remain **open** and were explicitly excluded from this fix:

- Historical save await (`hooks/use-entry-form.ts`) — Critical #4
- Close-day payout sequencing — High #6
- Fire-and-forget client mutations — High #7
- Expense update/delete branch scope — High #8
- Branch-switch refetch — High #9
- Import undo optimistic delete — High #10
- Day-closing in-memory cache vs DB — Medium #11
- Branch localStorage fallback — Medium #12
- Owner dashboard expense double-count — Medium #13
- Reports page client-side aggregation — Medium #14
- Legacy localStorage cleanup — Medium #15
- Historical import undo metadata — Medium #16
- Staff payments branch validation — Medium #17
- Context auth gates — Medium #18
- Low-priority items #19–23
- Backup / restore system
- Migrations / schema

Do **not** treat Phase 1 as fully complete until these are reviewed and authorized separately.

---

## How to Re-Verify After Merge

1. Merge PR #9 (or cherry-pick to your target branch).
2. Ensure local dev DB is seeded (`npm run db:seed` or equivalent).
3. Start dev server: `npm run dev`.
4. Run: `npm run verify:branch-authorization`
5. Confirm output ends with: `[verify-branch-authorization] All checks passed.`

Manual spot-check (optional):

```bash
# As Salaama staff, POST /api/day-closings with branch: "main" → expect 403
# As owner, set-active-branch to salaama → operations list scoped correctly
```

---

## Shareable Summary

**Verdict:** Phase 1 **branch authorization fix — PASS**.

Server-side branch validation is now enforced on daily operations, day closings, attendance, and bulk delete. Crafted cross-branch API requests from staff sessions are rejected. Owners retain multi-branch access.

**Production data:** Not touched.

**Next step:** Review remaining Phase 1 audit findings (`docs/PHASE-1-DATA-INTEGRITY-AUDIT.md`) and authorize fixes in recommended order. Do not assume full Phase 1 pass until Critical #4 and High findings are addressed.

---

## Constraints Observed

- Authorization/logic changes only
- No reports, dashboard, refetch, fire-and-forget, backup, restore, migration, or schema changes
- Used existing `getBranchIdForSession` / `assertSessionCanAccessBranchCode` helpers
- No second competing authorization system introduced
