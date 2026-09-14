# Salaama Authoritative Branch Code Rename

**Branch:** `cursor/salaama-branch-code-rename-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `cursor/auth-gated-loading-b6e7`

---

## Objective

Rename the existing Salaama branch code from `branch2` to `salaama` without creating a new branch record, deleting data, or changing the branch UUID.

**Target mapping:**

| Branch   | Display name | Authoritative code |
|----------|--------------|--------------------|
| Kansanga | Kansanga     | `main`             |
| Salaama  | Salaama      | `salaama`          |

---

## Audit findings

### Root cause — Branch Edit form rejected `salaama`

The Edit Branch form uses `validateBranchInput()` (client) and `updateBranch()` (server). Both reject duplicate branch codes.

Production historically stored Salaama as `branch2`, while application bootstrap (`runBranchesStage`) upserted a **second** branch with code `salaama`. That bootstrap ghost branch caused:

- Client validation: another active branch already had code `salaama`
- Server validation: Prisma unique constraint / duplicate lookup on code `salaama`

The real Salaama record (with sales, expenses, stock, staff, day closings) remained on `branch2`. Editing it to `salaama` failed because the empty bootstrap duplicate already owned that code.

### Repository references audited

| Area | Finding |
|------|---------|
| `lib/branch/codes.ts` | Mapped `salaama → branch2` (inverted legacy alias) |
| `lib/constants.ts` | Already defined `SALAAMA_BRANCH_CODE = "salaama"` |
| `lib/server/bootstrap/stages.ts` | Upserted `salaama` even when `branch2` already existed |
| `lib/branch/validation.ts` | Duplicate check by exact code only |
| `lib/reports/branch-totals.ts` | Did not normalize legacy `branch2` entries to `salaama` |
| `components/staff/staff-management-filters.tsx` | Hard-coded filter value `branch2` |
| Prisma `Branch` model | FK relations use `branchId` (UUID), not code |
| Verify scripts | Mixed `branch2` / `salaama` depending on script age |

### Database safety assessment

Prisma schema stores branch identity as:

- `Branch.id` — UUID primary key (preserved)
- `Branch.code` — unique string (the field being renamed)
- `Branch.name` — display name (`Salaama`)
- Related tables reference `branchId`, not `code`

**Safe production mutation (manual, when approved):**

```sql
UPDATE "Branch" SET code = 'salaama' WHERE code = 'branch2';
```

No delete/recreate. No FK updates required.

### Connected environment audit (read-only)

`npm run audit:salaama-branch-code` against this Cloud Agent database:

| Field | Value |
|-------|-------|
| Branch ID | `794a56a1-80bd-4957-9337-80445aa00526` |
| Name | Salaama |
| Code | `salaama` (already migrated in this environment) |
| `branch2` present | No |
| Related records | 12 |

**Production mutation in this run:** NOT performed automatically. This environment already uses `salaama`.

---

## Files changed

| File | Change |
|------|--------|
| `lib/branch/codes.ts` | Flip alias: `branch2 → salaama` (authoritative) |
| `lib/branch/validation.ts` | Treat equivalent codes as duplicates; allow edit when ghost removed |
| `lib/reports/branch-totals.ts` | Normalize legacy `branch2` entries to `salaama` in reports |
| `lib/server/bootstrap/stages.ts` | Do not create duplicate Salaama when `branch2` exists |
| `lib/server/branch-reconcile.ts` | Deactivate empty bootstrap duplicate when both codes exist |
| `lib/server/services/branches-service.ts` | Equivalent-code duplicate checks; reconcile before update; clear lookup cache |
| `lib/shop-reset/constants.ts` | Comment update for authoritative code |
| `components/staff/staff-management-filters.tsx` | Filter chip uses `salaama` |
| `scripts/verify-salaama-branch-code-rename.ts` | New focused verification |
| `scripts/audit-salaama-branch-code.ts` | New read-only DB audit |
| `scripts/verify-reports-branch-code-alignment.ts` | Expect `salaama` as authoritative |
| `scripts/verify-shop-reset-blocker.ts` | Updated Salaama scope expectation |
| `scripts/verify-targeted-go-live-ux-fixes.ts` | Use `salaama` in aggregation fixture |
| `package.json` | Added verify/audit npm scripts |

---

## Transition / compatibility

- `branch2` remains a **legacy alias** resolving to `salaama` via `getEquivalentBranchCodes()` and `resolveInventoryBranchCode()`.
- Server branch lookup (`getBranchIdByCode`) tries all equivalent codes, so deployments still on `branch2` continue working until the manual SQL update.
- After production code update, the application no longer depends on `branch2` as authoritative; the alias exists only for rollout safety.

---

## Branch isolation

Unchanged. Authorization still flows through:

- `assertSessionCanAccessBranchCode()` in `lib/server/branch-lookup.ts`
- Session `branch` + server-side branch ID resolution
- Owner branch preference via server preference API

Switching Kansanga ↔ Salaama continues to scope all branch-owned data. Crafted branch-code requests cannot bypass server authorization.

---

## Tests run and results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run verify:salaama-branch-code-rename` | PASS (16/16) |
| `npm run verify:reports-branch-code-alignment` | PASS (9/9) |
| `npm run verify:shop-reset-blocker` | PASS (17/17) |
| `npm run verify:targeted-go-live-ux` | PASS (11/11) |
| `npm run verify:branch-authorization` | PASS |
| `npm run verify:auth-storage-isolation` | PASS |
| `npm run audit:salaama-branch-code` | PASS (read-only; code already `salaama` here) |
| `npm run verify:branch-isolation` | FAIL — environment (`401 Authentication required` on `/api/stock/products`) |
| `npm run verify:branch-switch-refresh` | FAIL check 12 — environment (product catalog count mismatch across switch) |

Failures classified as **environment/fixture**, not regressions from this branch-code change.

---

## Production migration step (when approved)

1. Run read-only audit: `npm run audit:salaama-branch-code`
2. Confirm exactly one Salaama branch, code `branch2`, no existing `salaama` code
3. Record branch UUID and related-record counts
4. Execute: `UPDATE "Branch" SET code = 'salaama' WHERE code = 'branch2';`
5. Re-run audit; confirm same UUID, code `salaama`, related counts unchanged
6. Deploy this codebase revision (or ensure it is live) so legacy alias support is active during rollout

**Not performed in this agent run.**

---

## Confirmations

- Production data was **not** reset
- No `prisma db push` or delete/recreate
- Existing Salaama branch ID preservation is the design constraint; FK data remains tied to UUID
- Bootstrap will no longer create a duplicate `salaama` branch when `branch2` is the live record
- Branch Edit form accepts code `salaama` once duplicate ghost is reconciled or absent
