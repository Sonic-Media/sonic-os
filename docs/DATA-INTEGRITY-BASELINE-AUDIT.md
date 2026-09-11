# Sonic OS — Data Integrity Baseline Audit

**Date:** 2026-09-11  
**Task:** Read-only git/code baseline audit (no application changes)  
**Auditor branch:** `cursor/data-integrity-certification-b6e7`

---

## 1. Certification branch

| Field | Value |
|-------|-------|
| Branch | `cursor/data-integrity-certification-b6e7` |
| HEAD | `dc18a629ff389e26df6daea12073db2b1accc6c0` |
| Tip commit message | `test(integrity): certify full data integrity gate` |
| Ancestry from main | `main` (33201bc) → Fix #23 (57138f7) → certification gate (dc18a62) |

---

## 2. Main HEAD

| Field | Value |
|-------|-------|
| Branch | `main` |
| HEAD | `33201bce529605936c312c0b62603df3c58e31e3` |
| Message | `Add branch operations and production safeguards` |

---

## 3. Branch relationship summary

All certified fix branches (#1–#22 except #23) fork **directly from `main` (33201bc)** as parallel feature branches. They are **sibling branches**, not a linear chain.

The certification branch contains **only Fix #23** plus certification-only artifacts. It does **not** contain Fixes #1–#22.

```
main (33201bc)
├── cursor/phase1-branch-auth-b6e7          [Fix #1]  → cc9a1f0
├── cursor/historical-save-persistence-b6e7 [Fix #2]  → 1472dd6
├── … (Fixes #3–#19, #17 parallel) …
├── cursor/default-staff-b6e7               [Fix #20] → d6f053e
├── cursor/financial-defaults-b6e7          [Fix #21] → c6ce32a
├── cursor/financial-assertions-b6e7        [Fix #22] → 810cdfe
└── cursor/documentation-drift-b6e7         [Fix #23] → 57138f7
         └── cursor/data-integrity-certification-b6e7 → dc18a62
```

### Ancestor checks (`git merge-base --is-ancestor <fix-commit> cert-branch`)

| Fix branch | Is ancestor of cert branch? |
|------------|----------------------------|
| Fix #23 (`57138f7`) | **YES** |
| Fix #1 (`c4cbbab`) | **NO** |
| Fix #20 (`556def2`) | **NO** |
| Fix #21 (`c6ce32a`) | **NO** |
| Fix #22 (`d0ad65f`) | **NO** |
| All other fix commits (#2–#12, #15, #17, #19) | **NO** |

---

## 4. Certified fix inventory

| Fix | Certified commit | Branch | PRESENT ON CERT BRANCH? | Evidence |
|-----|------------------|--------|-------------------------|----------|
| #1 | `c4cbbab` | `cursor/phase1-branch-auth-b6e7` | **NO** | `git merge-base --is-ancestor c4cbbab cert` → false; `lib/server/branch-record-guard.ts` missing on cert |
| #2 | `1472dd6` | `cursor/historical-save-persistence-b6e7` | **NO** | Ancestor check false; `scripts/verify-historical-save-persistence.ts` absent |
| #3 | `3a5390d` | `cursor/close-day-payout-sequencing-b6e7` | **NO** | Ancestor check false; `verify:close-day-payouts` script absent |
| #4 | `c059e98` | `cursor/fire-and-forget-mutations-b6e7` | **NO** | Ancestor check false; `verify-awaited-mutations.ts` absent |
| #5 | `92d6eec` | `cursor/expense-branch-ownership-b6e7` | **NO** | Ancestor check false; expense update/delete branch guard absent |
| #6 | `9527cdb` | `cursor/branch-switch-refresh-b6e7` | **NO** | Ancestor check false; branch switch refetch absent |
| #7 | `93e9228` | `cursor/historical-import-undo-b6e7` | **NO** | Ancestor check false; import undo await absent |
| #8 | `c6330d5` | `cursor/auth-gated-loading-b6e7` | **NO** | Ancestor check false; auth-gated loading absent |
| #9 | `9109b14` | `cursor/day-closing-live-db-b6e7` | **NO** | Ancestor check false; live DB day-closing authority absent |
| #10 | `25e1385` | `cursor/close-day-date-fix-b6e7` | **NO** | Ancestor check false; close-day date rollover fix absent |
| #11 | `ca7ef39` | `cursor/reports-server-authority-b6e7` | **NO** | Ancestor check false; server reports summary path absent |
| #12 | `86fe9ea` | `cursor/branch-selection-authority-b6e7` | **NO** | Ancestor check false; server branch preference authority absent |
| #15 | `dc4fb3e` | `cursor/auth-storage-isolation-b6e7` | **NO** | Ancestor check false; legacy auth storage purge absent |
| #17 | `759e67f` | `cursor/staff-payment-branch-auth-b6e7` | **NO** | Ancestor check false; staff payment branch CRUD guard absent |
| #19 | `11304c1` | `cursor/audit-cache-integrity-b6e7` | **NO** | Ancestor check false; audit cache clear on session change absent |
| #20 | `556def2` | `cursor/default-staff-b6e7` | **NO** | Ancestor check false; `DEFAULT_STAFF` still in `lib/constants.ts` on cert |
| #21 | `c6ce32a` | `cursor/financial-defaults-b6e7` | **NO** | Ancestor check false; financial defaults gate absent |
| #22 | `d0ad65f` | `cursor/financial-assertions-b6e7` | **NO** | Ancestor check false; derived financial assertions absent |
| #23 | `57138f7` | `cursor/documentation-drift-b6e7` | **YES** | Ancestor check true; docs + `verify:documentation-drift` present |

**Note:** Fix #22 branch tip is `810cdfe` (docs expansion). Code commit is `d0ad65f`. Fix #20 branch tip is `d6f053e` (docs). Code commit is `556def2`.

---

## 5. Missing certified fixes

**22 of 23 certified fixes are missing** from the certification branch baseline.

Only **Fix #23** (documentation drift) is present.

Missing: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #15, #17, #19, #20, #21, #22.

---

## 6. Present certified fixes

| Fix | Commit | Evidence on cert branch |
|-----|--------|-------------------------|
| #23 | `57138f7` | Documentation updates, `docs/PHASE-1-FIX-23-DOCUMENTATION-DRIFT.md`, `scripts/verify-documentation-drift.ts`, `verify:documentation-drift` in package.json |

Certification-only additions (not a numbered fix): `dc18a62` — `verify:data-integrity`, `cert-restore-test.ts`, certification matrix/final report docs.

---

## 7. Verification scripts missing

Scripts reported unavailable during certification gate — root cause: **fix branches not merged**, not deleted files.

| Requested npm script | Actual script file (on owning branch) | Owning branch | On cert branch? |
|---------------------|---------------------------------------|---------------|-----------------|
| `verify:branch-authorization` | `scripts/verify-branch-authorization.ts` | `phase1-branch-auth-b6e7` | **NO** |
| `verify:historical-save` | `scripts/verify-historical-save-persistence.ts` | `historical-save-persistence-b6e7` | **NO** |
| `verify:close-day-payout-sequencing` | `scripts/verify-close-day-payout-sequencing.ts` (npm: `verify:close-day-payouts`) | `close-day-payout-sequencing-b6e7` | **NO** |
| `verify:awaited-mutations` | `scripts/verify-awaited-mutations.ts` | `fire-and-forget-mutations-b6e7` | **NO** |
| `verify:expense-branch-ownership` | `scripts/verify-expense-branch-ownership.ts` | `expense-branch-ownership-b6e7` | **NO** |
| `verify:branch-switch-refresh` | `scripts/verify-branch-switch-refresh.ts` | `branch-switch-refresh-b6e7` | **NO** |
| `verify:historical-import-undo` | `scripts/verify-historical-import-undo.ts` | `historical-import-undo-b6e7` | **NO** |
| `verify:auth-gated-loading` | `scripts/verify-auth-gated-loading.ts` | `auth-gated-loading-b6e7` | **NO** |
| `verify:day-closing-live-db` | `scripts/verify-day-closing-live-db.ts` | `day-closing-live-db-b6e7`, `close-day-date-fix-b6e7` | **NO** |
| `verify:dashboard-expense-deduplication` | (npm: `verify:dashboard-expense-dedupe`) | `dashboard-expense-dedupe-b6e7` | **NO** |
| `verify:reports-server-authority` | `scripts/verify-reports-server-authority.ts` | `reports-server-authority-b6e7` | **NO** |
| `verify:close-day-date` | `scripts/verify-close-day-date.ts` | `close-day-date-fix-b6e7` | **NO** |
| `verify:branch-selection` | `scripts/verify-branch-selection-authority.ts` | `branch-selection-authority-b6e7` | **NO** |
| `verify:staff-payment-branch` | `scripts/verify-staff-payment-branch-authorization.ts` | `staff-payment-branch-auth-b6e7` | **NO** |
| `verify:auth-storage-isolation` | `scripts/verify-auth-storage-isolation.ts` | `auth-storage-isolation-b6e7` (+ chain) | **NO** |
| `verify:audit-cache-integrity` | `scripts/verify-audit-cache-integrity.ts` | `audit-cache-integrity-b6e7` (+ chain) | **NO** |
| `verify:financial-defaults` | `scripts/verify-financial-defaults.ts` | `financial-defaults-b6e7` (+ chain) | **NO** |
| `verify:financial-assertions` | `scripts/verify-financial-assertions.ts` | `financial-assertions-b6e7` | **NO** |
| `verify:default-staff` | `scripts/verify-default-staff.ts` | `default-staff-b6e7` | **NO** |

**Naming note:** The certification gate used some script names that differ from actual npm script keys on fix branches (e.g. `verify:close-day-payout-sequencing` vs `verify:close-day-payouts`, `verify:dashboard-expense-deduplication` vs `verify:dashboard-expense-dedupe`).

---

## 8. Branch-authorization discrepancy

### Certification gate finding

The gate reported daily operations and day closing writes use `getBranchIdByCode(client branch)` without session branch authorization.

### Fix #1 presence on cert branch

**Fix #1 is NOT present.** Evidence:

- `lib/server/branch-record-guard.ts` — **missing** on cert branch; exists on `cursor/phase1-branch-auth-b6e7` (added in `c4cbbab`)
- `scripts/verify-branch-authorization.ts` — **missing** on cert branch
- Cert branch `daily-operations-service.ts` uses `getBranchIdByCode` at lines 94, 190, 276
- Cert branch `day-closings-service.ts` uses `getBranchIdByCode` at lines 195, 249, 340, 447, 493, 514

### Fix #1 on its certified branch

On `cursor/phase1-branch-auth-b6e7` (`c4cbbab`):

- Adds `assertRecordInSessionBranchScope` via `branch-record-guard.ts`
- Replaces `getBranchIdByCode` with `getBranchIdForSession(session, …)` on daily operation writes, import, list-by-branch, bulk delete scoping
- Replaces `getBranchIdByCode` with `getBranchIdForSession` on `openDay`, `closeDay`, `reopenDay` in day-closings-service

### Conclusion

**This is NOT a regression.** The certification gate tested **`main` + Fix #23 only**, which never included Fix #1. The branch-authorization finding is **accurate for the certification baseline** but **does not indicate Fix #1 broke** — Fix #1 was never merged into the branch under test.

---

## 9. Build discrepancy

### Finding

`npm run build` fails on all tested baselines with the same error:

```
Export encountered an error on /_global-error/page: /_global-error
TypeError: Cannot read properties of null (reading 'useContext')
```

### Branches tested

| Branch | Build exit code |
|--------|-----------------|
| `main` (33201bc) | **1 (FAIL)** |
| `cursor/data-integrity-certification-b6e7` (dc18a62) | **1 (FAIL)** |
| `cursor/phase1-branch-auth-b6e7` (cc9a1f0) | **1 (FAIL)** |

### Classification

**Category C — pre-existing on the branch baseline (`main`).**

- Not caused by certification-only files (build fails on `main` without cert commits)
- Not caused by missing Fix #1 (Fix #1 branch also fails)
- Not introduced by Fix #23 docs or certification gate tooling
- Appears to be a Next.js built-in `/_global-error` prerender issue (no custom `app/global-error.tsx` in repo)

---

## 10. Recommended safe consolidation plan

### Objective

Bring all 22 missing certified fix commits into the certification baseline **without rewriting fixes manually**.

### Recommended approach

1. **Create a new consolidation branch** from current certification HEAD (`dc18a62`) — do not modify `main`.
2. **Merge fix branches in fix-number order**, resolving conflicts at each step:

   | Order | Branch to merge | Brings fix |
   |-------|-----------------|------------|
   | 1 | `cursor/phase1-branch-auth-b6e7` | #1 |
   | 2 | `cursor/historical-save-persistence-b6e7` | #2 |
   | 3 | `cursor/close-day-payout-sequencing-b6e7` | #3 |
   | 4 | `cursor/fire-and-forget-mutations-b6e7` | #4 |
   | 5 | `cursor/expense-branch-ownership-b6e7` | #5 |
   | 6 | `cursor/branch-switch-refresh-b6e7` | #6 |
   | 7 | `cursor/historical-import-undo-b6e7` | #7 |
   | 8 | `cursor/auth-gated-loading-b6e7` | #8 |
   | 9 | `cursor/day-closing-live-db-b6e7` | #9 |
   | 10 | `cursor/close-day-date-fix-b6e7` | #10 |
   | 11 | `cursor/reports-server-authority-b6e7` | #11 |
   | 12 | `cursor/branch-selection-authority-b6e7` | #12 |
   | 13 | `cursor/staff-payment-branch-auth-b6e7` | #17 |
   | 14 | `cursor/auth-storage-isolation-b6e7` | #15 |
   | 15 | `cursor/audit-cache-integrity-b6e7` | #19 |
   | 16 | `cursor/default-staff-b6e7` | #20 |
   | 17 | `cursor/financial-defaults-b6e7` | #21 |
   | 18 | `cursor/financial-assertions-b6e7` | #22 |
   | 19 | `cursor/dashboard-expense-dedupe-b6e7` | (dashboard dedupe — related, no numbered fix in user list) |

3. **Alternative for #15/#19/#21/#22:** Merge `cursor/financial-assertions-b6e7` once (contains linear chain `dc4fb3e` → `11304c1` → `c6ce32a` → `d0ad65f`) instead of merging #15, #19, #21, #22 separately — but still merge all other parallel branches.

4. **Do not cherry-pick individual commits** unless a merge conflict requires it — prefer full branch merges to preserve exact certified commits.

5. **After each merge:** run the fix-specific verify script; resolve conflicts preserving certified behavior.

6. **Re-run certification gate** only after consolidation complete.

### Is consolidation safe?

| Aspect | Assessment |
|--------|------------|
| Git safety | **Safe** — read-only audit complete; merges are local/git-only |
| Conflict risk | **Moderate** — 18+ parallel branches from same base will produce merge conflicts in shared files (`package.json`, services, contexts) |
| Production data | **NOT TOUCHED** — no database operations in consolidation |
| Schema | **NOT TOUCHED** — no migration changes in this audit |
| Preserving certified commits | **Yes** — merge (not rewrite) preserves original commits in history |

**Do not perform consolidation in this audit task.** Report only.

---

## 11. Exact commits involved

| Item | Commit |
|------|--------|
| main HEAD | `33201bce529605936c312c0b62603df3c58e31e3` |
| cert branch HEAD | `dc18a629ff389e26df6daea12073db2b1accc6c0` |
| Fix #1 code | `c4cbbabefcecf4d799882b925f8468a712592e86` |
| Fix #2 | `1472dd63e1999c06cdba84cc2811b596fcc858c0` |
| Fix #3 | `3a5390daaef79060bd2f38925ac03f5a8751c73e` |
| Fix #4 | `c059e98627d4c617cc3ab1c20a3c668249067e84` |
| Fix #5 | `92d6eec…` (on branch tip `6e660d0`) |
| Fix #6 | `9527cdb…` (on branch tip `82543c1`) |
| Fix #7 | `93e9228…` (on branch tip `a77776f`) |
| Fix #8 | `c6330d565bc5c7cb1847000fbbb61d36ec4e6f0c` |
| Fix #9 | `9109b14…` (on branch tip `b71bfba`) |
| Fix #10 | `25e1385…` (on branch tip `3d880d4`) |
| Fix #11 | `ca7ef39…` (on branch tip `0285baf`) |
| Fix #12 | `86fe9ea…` (on branch tip `0d01519`) |
| Fix #15 | `dc4fb3ed0525bac8200341934a48374e88b9fc3c` |
| Fix #17 | `759e67f889f66b7d77c4581a3d80d63fe3c0059f` |
| Fix #19 | `11304c1cba31802b4133187eba2f558429d2ce7a` |
| Fix #20 code | `556def2…` (branch tip `d6f053e`) |
| Fix #21 | `c6ce32af2b60272467d6ab3a8a742169b7f3b64f` |
| Fix #22 code | `d0ad65f…` (branch tip `810cdfe`) |
| Fix #23 | `57138f76cafb9a761f0a9723d84a079feac0d3d9` |

---

## 12. Production-data impact

**NOT TOUCHED.** This audit used read-only git inspection and local build commands only. No Neon, no production reset, no seed, no schema migration.

---

## 13. Audit conclusion

The certification branch **`cursor/data-integrity-certification-b6e7` is NOT based on the cumulative certified codebase.** It is `main` + Fix #23 (docs) + certification gate artifacts. All Fixes #1–#22 remain on parallel unmerged branches.

The certification gate's branch-authorization finding reflects the **absence of Fix #1**, not a regression of previously merged work.

The build failure is **pre-existing on `main`**, not introduced by the certification branch or missing fixes.

**Consolidation must precede any re-certification attempt.**
