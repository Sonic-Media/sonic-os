# Salaama Production Branch Code Migration Report

**Branch:** `cursor/salaama-production-code-migration-b6e7`  
**Date:** 2026-09-15  
**Base branch:** `main`

---

## Objective

Rename the existing Salaama branch code from `branch2` → `salaama` on the **same Branch record** (same UUID). No new branch, no delete, no data reset.

**Target mapping:**

| Branch   | Display name | Authoritative code | Status |
|----------|--------------|--------------------|--------|
| Kansanga | Kansanga     | `main`             | Active |
| Salaama  | Salaama      | `salaama`          | Active |

---

## Step 1 — Production state inspection

### Expected production state (before migration)

| Field  | Expected value |
|--------|----------------|
| Name   | Salaama        |
| Code   | `branch2`      |
| Active | true           |

| Branch   | Code      | Active |
|----------|-----------|--------|
| Kansanga | `main`    | true   |
| Salaama  | `branch2` | true   |

### Cloud Agent connected database (development)

| Branch   | Code      | Branch ID                              | Active |
|----------|-----------|----------------------------------------|--------|
| Kansanga | `main`    | `d25fd4ff-c7cf-42c5-ab1d-3223e26a13a1` | true   |
| Salaama  | `salaama` | `794a56a1-80bd-4957-9337-80445aa00526` | true   |

**Note:** Local development database already used `salaama` (dev drift from production). Production inspection requires `PRODUCTION_DATABASE_URL`, which is **not available** in this Cloud Agent environment.

**Production read-only audit:** **BLOCKED** — no production credentials configured.

---

## Step 2 — Code collision check

| Check | Expected | Local dev | Production |
|-------|----------|-----------|------------|
| Branches with code `salaama` before migration | 0 (production) | 1 (already migrated) | **NOT RUN** |
| Branches with code `branch2` before migration | 1 (Salaama) | 0 | **NOT RUN** |
| Branches with code `s2` | 0 | 0 | User confirmed deleted |

Collision guard is enforced in both the Prisma migration SQL and `scripts/migrate-salaama-branch-code-production.ts`.

---

## Step 3 — Repository `branch2` reference audit

| Category | Files | Action |
|----------|-------|--------|
| Authoritative alias (legacy) | `lib/branch/codes.ts` | `branch2` → resolves to `salaama` |
| Bootstrap legacy lookup | `lib/server/bootstrap/stages.ts` | Accepts `branch2` as legacy code for Salaama |
| Duplicate reconciliation | `lib/server/branch-reconcile.ts` | Handles dev/prod duplicate `salaama`/`branch2` rows |
| Shop reset scope | `lib/shop-reset/constants.ts` | Accepts both; lookup uses `salaama` |
| Staff filters UI | `components/staff/staff-management-filters.tsx` | Uses `salaama` (display name remains Salaama) |
| Verify scripts (legacy entry data) | `scripts/verify-salaama-branch-code-rename.ts`, `verify-reports-branch-code-alignment.ts` | Test legacy `branch2` entry normalization |
| Verify scripts (live API) | `scripts/verify-owner-closing-approval-auth.ts`, `verify-day-close-state-sync.ts` | Updated to use `salaama` + equivalent-code lookups |
| Audit / migration tooling | `scripts/audit-salaama-branch-code.ts`, `scripts/migrate-salaama-branch-code-production.ts` | Read-only audit + guarded execute |
| Prisma migration | `prisma/migrations/20260915140000_salaama_branch_code_rename/migration.sql` | Deterministic SQL with preflight checks |
| Documentation (historical) | Various `docs/data-integrity/*.md` | Unchanged historical references |

No blind global replacement was performed.

---

## Step 4 — Database migration

### Prisma migration

**File:** `prisma/migrations/20260915140000_salaama_branch_code_rename/migration.sql`

Behavior:

- Verifies exactly one active Kansanga branch (`main`)
- Aborts if both `salaama` and `branch2` exist simultaneously
- No-op if Salaama already uses `salaama`
- Updates `Branch.code` from `branch2` → `salaama` on the existing Salaama row only
- Preserves branch UUID and all FK relationships (`branchId` references unchanged)

### Production execution script

**File:** `scripts/migrate-salaama-branch-code-production.ts`

- Default: audit-only
- `--execute`: applies migration (requires `PRODUCTION_DATABASE_URL` or `--allow-local`)
- Records dependent-record counts before/after
- Verifies branch ID unchanged

### Local migration validation (executed)

Simulated production state by temporarily setting Salaama code to `branch2`, then running `--execute --allow-local`:

| Metric | Before | After |
|--------|--------|-------|
| Salaama branch ID | `794a56a1-80bd-4957-9337-80445aa00526` | `794a56a1-80bd-4957-9337-80445aa00526` (unchanged) |
| Salaama code | `branch2` | `salaama` |
| users | 5 | 5 |
| staff | 6 | 6 |
| dailyOperations | 5 | 5 |
| sales | 0 | 0 |
| purchases | 0 | 0 |
| expenseRecords | 0 | 0 |
| stockMovements | 0 | 0 |
| staffPayments | 0 | 0 |
| dayClosings | 4 | 4 |
| products | 1 | 1 |

**Production migration execution:** **NOT RUN** — `PRODUCTION_DATABASE_URL` not configured.

---

## Step 5 — Application code updates

Authoritative codes after deployment:

- Kansanga = `main`
- Salaama = `salaama`

Display names unchanged (`Kansanga`, `Salaama`).

Key changes (from cherry-picked commit `60786e5` plus this branch):

- Flip alias mapping in `lib/branch/codes.ts`
- Bootstrap avoids duplicate Salaama when `branch2` exists
- Branch validation treats equivalent codes as duplicates
- Reports normalize legacy `branch2` entries to `salaama`
- Staff management filter chip uses `salaama`

---

## Step 6 — Legacy `branch2` handling

**Intentional remaining `branch2` references:**

| Location | Reason |
|----------|--------|
| `lib/branch/codes.ts` | Legacy alias: `branch2` resolves to `salaama` |
| `lib/server/bootstrap/stages.ts` | `legacyCodes: ["branch2"]` for bootstrap on unmigrated DBs |
| `lib/server/branch-reconcile.ts` | Reconcile duplicate rows during transition |
| `lib/shop-reset/constants.ts` | Accept legacy scope input |
| Verify scripts | Test legacy entry normalization and alias resolution |

**Authoritative codes after migration:** `main`, `salaama` — not `branch2`.

---

## Step 7 — Database integrity verification

### Local dev (post-migration test)

| Check | Result |
|-------|--------|
| Kansanga \| main \| Active | PASS |
| Salaama \| salaama \| Active | PASS |
| Exactly one active Salaama branch | PASS |
| Salaama branch ID unchanged | PASS |
| All dependent counts unchanged | PASS (10/10) |
| s2 does not exist | PASS |

### Production

**NOT RUN** — requires post-deploy verification with production credentials.

---

## Step 8 — Branch isolation tests

| # | Test | Result |
|---|------|--------|
| 1 | Kansanga resolves using `main` | PASS |
| 2 | Salaama resolves using `salaama` | PASS |
| 3 | Salaama branch ID unchanged (local migration test) | PASS |
| 4 | Owner can switch Kansanga ↔ Salaama | PASS (`verify:branch-isolation`) |
| 5–19 | Staff assignment, isolation, reports, stock, etc. | PASS (`verify:branch-authorization`, `verify:branch-isolation`) |
| 20 | No records deleted or reassigned | PASS (local migration counts) |

---

## Step 9 — Regression checks

| Area | Command | Result |
|------|---------|--------|
| Branch code rename | `npm run verify:salaama-branch-code-rename` | PASS (16/16) |
| Reports alignment | `npm run verify:reports-branch-code-alignment` | PASS (9/9) |
| Shop reset | `npm run verify:shop-reset-blocker` | PASS (17/17) |
| Go-live UX | `npm run verify:targeted-go-live-ux` | PASS (11/11) |
| Branch authorization | `npm run verify:branch-authorization` | PASS |
| Branch isolation | `npm run verify:branch-isolation` | PASS |
| Owner closing approval | `npm run verify:owner-closing-approval-auth` | NOT RUN (requires dev server) |
| Day close state sync | `npm run verify:day-close-state-sync` | NOT RUN (requires dev server) |

---

## Step 10 — Production safety

Confirmed **not modified:**

- Business data reset functionality
- `ALLOW_DESTRUCTIVE_OPS`
- Reset authorization
- Environment variables (no secrets exposed)
- Branch UUIDs (preserved by design)
- Business-day rules
- Financial calculations

---

## Step 11 — Validation summary

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | PASS |
| Prisma migrate deploy (local) | PASS |
| Migration script audit (local) | PASS |
| Migration script execute (local, branch2→salaama) | PASS |
| Salaama rename verification | PASS |
| Reports / shop reset / UX verifiers | PASS |
| Branch authorization | PASS |
| Branch isolation | PASS |
| Production build (`npm run build`) | FAIL (pre-existing `_global-error` prerender issue on `main`; unrelated to this migration) |
| Production DB migration | **BLOCKED** (no `PRODUCTION_DATABASE_URL`) |
| Production post-deploy verification | **NOT RUN** |

---

## Step 12 — Production deployment procedure

1. **Backup** production database.
2. **Audit:** `PRODUCTION_DATABASE_URL=... npm run audit:salaama-branch-code`
   - Confirm Salaama: code=`branch2`, name=`Salaama`, active=true
   - Confirm Kansanga: code=`main`, active=true
   - Confirm zero branches with code `salaama` or `s2`
   - Record Salaama branch UUID and dependent counts
3. **Deploy** this codebase revision (includes legacy `branch2` alias support).
4. **Migrate:** `PRODUCTION_DATABASE_URL=... npm run migrate:salaama-branch-code:execute`
   - Or rely on `prisma migrate deploy` if migration runs via deploy pipeline
5. **Verify:** Re-run audit; confirm same UUID, code=`salaama`, counts unchanged
6. **Smoke test:** login, branch selection, Today, Sales, Expenses, closing workflow

---

## Rollback considerations

- **Code rollback:** Re-deploy previous revision; legacy alias `salaama → branch2` in old code supports reversed DB state temporarily
- **DB rollback:** `UPDATE "Branch" SET code = 'branch2' WHERE code = 'salaama' AND lower(name) = 'salaama';` — only if no new records were created referencing code `salaama` as a string in non-normalized storage (FK data uses UUID, so rollback is low risk)
- Take a backup before any production execute

---

## Remaining risks

1. **Production migration not executed from this agent** — owner must run with production credentials
2. **Stale client localStorage** may hold `branch2` as active branch; server alias resolution handles this during rollout
3. **Build failure on main** — unrelated prerender error; does not block DB migration but should be tracked separately

---

## Final go-live check (production)

| Requirement | Status |
|-------------|--------|
| Kansanga \| main \| Active | Pending production verify |
| Salaama \| salaama \| Active | Pending production verify |
| s2 does not exist | User confirmed deleted |
| Salaama branch ID unchanged | Verified locally; pending production |
| All Salaama data on same branch ID | Verified locally; pending production |

**Migration complete in codebase and locally validated. Production execution pending owner deployment.**
