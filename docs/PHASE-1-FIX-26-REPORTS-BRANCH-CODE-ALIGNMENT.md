# PHASE 1 FIX #26 REPORT — REPORTS BRANCH CODE ALIGNMENT

**STATUS:** PASS (code + verification)  
**LIVE:** NOT VERIFIED (not deployed at time of report)  
**DATE:** 2026-09-11  
**BRANCH:** `cursor/reports-branch-code-fix-b6e7`

**Formal deliverable:** `docs/PHASE-1-FIX-26-REPORTS-BRANCH-CODE-ALIGNMENT.docx`

---

## 1. Finding

Live production `/reports` crashed after login with:

```
Uncaught Error: Branch 'salaama' is missing from report aggregation output.
```

`/api/reports/summary?period=daily` returned HTTP 200 with valid JSON.

---

## 2. Root Cause

Two branch identity models were in use:

| Layer | Branch keys | Names |
|-------|-------------|-------|
| **Server / PostgreSQL** (`Branch.code`) | `main`, `branch2` | Kansanga, Salaama |
| **Settings UI** (`BRANCH_IDS` + `buildBranchConfigs`) | `main`, `salaama` | Kansanga, Salaama |

Fix #11 reports API correctly aggregates using **database branch codes** from `prisma.branch.findMany()`.

Reports UI (`ReportsBranchTotals`) iterated `useSettings().branches` and called `getBranchTotals(byBranch, branch.id)` with `salaama`. Server `byBranch` contained `branch2`, not `salaama` → `getBranchTotals` threw → React crash.

Production evidence (live branches API):

- Kansanga → code `main`
- Salaama → code `branch2`

---

## 3. Canonical Branch Identity Decision

**Authoritative identity:** `BranchEntity.code` from PostgreSQL / `BranchProvider` (`context/branch-context.tsx`).

- **Code** = financial/reporting key (used in `byBranch`, server scoping, entries)
- **Name** = display label (Kansanga, Salaama)
- **UUID** = database primary key only

`BRANCH_IDS` / `settings.branches` remain deprecated for iteration. No `salaama` → `branch2` alias added. No production branch codes renamed.

---

## 4. Fix

Wire Reports UI to `BranchProvider` active branches and lookup totals by `branch.code`:

1. `components/reports/reports-branch-totals.tsx` — `useBranch().activeBranches`, `getBranchTotals(byBranch, branch.code)`
2. `components/reports/reports-insights.tsx` — `getBranchName` from `useBranch()` (resolves DB names for `bestPerformingBranch` codes like `branch2`)
3. `components/dashboard/staff-dashboard-layout.tsx` — same pattern for dashboard branch card (same bug class)
4. `hooks/use-reports.ts` — empty `byBranch: {}` instead of seeding deprecated `BRANCH_IDS`
5. `lib/branch/registry.ts` — `getActiveBranchesForReports()` helper
6. `scripts/verify-reports-branch-code-alignment.ts` — regression tests for production codes `main` / `branch2`

**Preserved:**
- Fix #11 server report authority (`/api/reports/summary` unchanged)
- `getBranchTotals` throw on missing/wrong keys (integrity guard)
- Branch isolation / server scoping unchanged

---

## 5. Files Changed

| File | Change |
|------|--------|
| `components/reports/reports-branch-totals.tsx` | BranchProvider + DB codes |
| `components/reports/reports-insights.tsx` | BranchProvider display names |
| `components/dashboard/staff-dashboard-layout.tsx` | BranchProvider for dashboard totals |
| `hooks/use-reports.ts` | Remove BRANCH_IDS empty-state seed |
| `lib/branch/registry.ts` | `getActiveBranchesForReports()` |
| `scripts/verify-reports-branch-code-alignment.ts` | New Fix #26 verifier |
| `package.json` | `verify:reports-branch-code-alignment` script |

---

## 6. Branch Isolation Impact

**None.** Server `resolveBranchListFilter` and reports aggregation unchanged. UI now uses the same codes the server already emits.

---

## 7. Financial / Reporting Impact

Reports totals remain server-authoritative. UI displays Kansanga/Salaama names with correct `main` / `branch2` totals from API `byBranch`. No client-side re-aggregation added.

---

## 8. Tests and Results

| Command | Result |
|---------|--------|
| `npm run verify:reports-branch-code-alignment` | **10/10 PASS** |
| `npm run verify:reports` | **PASS** (all scenarios) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:reports-server-authority` | **FAIL** — 401 on `/api/reports/summary` (local auth/session fixture; checks 1–3, 13 passed before failure) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **FAIL** — pre-existing `/_global-error` prerender (`useContext` null); same baseline blocker from prior certification |

---

## 9. Schema Changed?

**NO**

---

## 10. Production Data Changed?

**NO**

---

## 11. Deployment Performed?

**NO** (at time of report — awaiting merge/deploy)

---

## 12. Production Commit After Fix

Pending merge to `main` and Vercel Production deploy.

Prior production: `dcff0bf`

---

## 13. Live /reports Result

**NOT VERIFIED LIVE** — fix not yet on https://sonic-os-lemon.vercel.app

Expected after deploy:
- `/reports` loads without React crash
- Kansanga card (code `main`) and Salaama card (code `branch2`) display
- Branch switching does not mix totals
- Server summary remains authoritative

---

*Fix #26 only. Does not restart Fixes #1–#25.*
