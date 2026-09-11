# PHASE 1 FIX #26 REPORT — REPORTS BRANCH CODE ALIGNMENT

**STATUS:** PASS  
**LIVE:** PASS (verified on production after deploy)  
**DATE:** 2026-09-11  
**FIX COMMIT:** `95c48d0`  
**MERGE COMMIT:** `26922d8`  
**PR:** #33 (merged)

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
2. `components/reports/reports-insights.tsx` — `getBranchName` from `useBranch()`
3. `components/dashboard/staff-dashboard-layout.tsx` — same pattern for dashboard branch card
4. `hooks/use-reports.ts` — empty `byBranch: {}` instead of seeding deprecated `BRANCH_IDS`
5. `lib/branch/registry.ts` — `getActiveBranchesForReports()` helper
6. `scripts/verify-reports-branch-code-alignment.ts` — regression tests for production codes `main` / `branch2`

**Preserved:** Fix #11 server report authority, `getBranchTotals` integrity guard, branch isolation.

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

## 6. Deployment

| Item | Value |
|------|-------|
| Fix branch | `cursor/reports-branch-code-fix-b6e7` |
| Fix commit | `95c48d0` |
| Merge commit (main) | `26922d8` — Merge Fix #26: Reports branch code alignment |
| Prior production | `dcff0bf` |
| Vercel Production deployment ID | `6402602266` |
| Vercel Production commit | `26922d84482a8cc65a3892ab2b588dfdc2f7c2db` |
| Deployment status | **success** (2026-09-11T22:09:57Z) |
| Production domain | https://sonic-os-lemon.vercel.app |

**Proof Fix #26 is in production:** `git merge-base --is-ancestor 95c48d0 26922d8` → true. GitHub deployment `6402602266` sha = `26922d8`.

---

## 7. Live Production Verification (2026-09-11T22:10–22:13 UTC)

### /api/health

```json
{
  "status": "ok",
  "databaseConfigured": true,
  "databaseConnected": true,
  "databaseError": null,
  "timestamp": "2026-09-11T22:10:12.727Z"
}
```

### /reports (owner login, browser)

| Check | Result |
|-------|--------|
| Page loads | **PASS** — no "This page couldn't load" |
| Console error `Branch 'salaama' is missing...` | **PASS** — not present |
| Kansanga card visible | **PASS** |
| Salaama card visible | **PASS** |
| Branch switch Kansanga ↔ Salaama | **PASS** — no crash |
| `/api/reports/summary?period=daily` | **HTTP 200**, `byBranch` keys: `main`, `branch2` |

Daily period totals UGX 0 for both branches (no transactions today); branch cards render correctly with distinct branch names.

---

## 8. Tests and Results (post-merge main)

| Command | Result |
|---------|--------|
| `npm run verify:reports-branch-code-alignment` | **10/10 PASS** |
| `npm run verify:reports` | **PASS** |
| `npm run verify:branch-selection` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **FAIL** — pre-existing `/_not-found` / `/_global-error` prerender (`useState`/`useContext` null); unchanged baseline blocker |

---

## 9. Schema Changed?

**NO**

---

## 10. Production Data Changed?

**NO**

---

## 11. Environment / DATABASE_URL Changed?

**NO**

---

*Fix #26 only. Does not restart Fixes #1–#25.*
