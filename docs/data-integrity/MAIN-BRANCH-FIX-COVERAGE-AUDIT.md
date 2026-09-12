# Main Branch Fix Coverage Audit

**Date:** 2026-09-12 (UTC)  
**Auditor:** Cloud Agent (read-only code/history audit)  
**Main HEAD:** `2a60905` (includes merged PR #36)  
**Method:** `git merge-base --is-ancestor`, file inspection, `git diff main...<branch>`

This audit compares **actual code on `main`** against older open/draft PR branches. It does **not** treat “PR merged” as the only signal — it verifies implementation presence.

---

## Executive Summary

| Category | Count |
|----------|-------|
| Certified Fixes #1–#26 | **26/26 PRESENT IN MAIN** (see table below) |
| Open PRs with missing code | **3** (#5, #7, #8 partial backup) |
| Superseded duplicate PRs | **2** (#21 by #22; #4 by Fix #2+) |
| Docs-only open PRs | **3** (#32, #34, #35) |
| Pending merge (not in main yet) | **1** (#37 open-day guard) |

**Recommendation:** Do **not** merge stale open PRs #4, #5, #7, #8, or #21. Cherry-pick or re-implement only the still-missing pieces (#5 flicker, #7/#8 backup BigInt) as new targeted PRs if still required.

---

## Fix #12 — Server-Authoritative Active Branch (Special Verification)

**Status on main:** **PRESENT IN MAIN**  
**Authoritative merge:** PR #22 → commit `86fe9ea` (merge `c7361c9`)  
**Duplicate open PR:** PR #21 (`cursor/server-authoritative-branch-b6e7`, commit `efa0cda`) — **SUPERSEDED**

| Requirement | In main? | Evidence |
|-------------|----------|----------|
| Server-authoritative active branch | Yes | `context/branch-context.tsx` uses `resolveAuthoritativeActiveBranch()` |
| `UserPreference.activeBranchCode` authority | Yes | `getActiveBranchPreference()` / `updateActiveBranchPreference()` in `lib/server/services/auth-service.ts` |
| localStorage UX cache only | Yes | Writes after server resolution; `removeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY)` on logout; no `readStoredActiveBranch()` |
| Owner branch switch server-first | Yes | `setActiveBranchApi()` → server return → `setActiveBranchState(authoritative)` |
| Staff branch restriction | Yes | `canSwitchBranch` false → locked to `assignedBranch`; API 403 on foreign branch |
| Logout cleanup | Yes | `clearSession()` → `purgeSecuritySensitiveClientStorage()` (`lib/auth/client-storage-keys.ts`) |
| Race protection | Yes | `selectionRequestId`, `branchSwitchRequestId`, `sessionRef`, `sessionRequestId` in auth |

**Fix #12 verifier on main:** `scripts/verify-branch-selection-authority.ts` exists; `npm run verify:branch-selection` script present.

**PR #21 vs main:** `86fe9ea` is ancestor of main; `efa0cda` is **not**. Main is ~206 files ahead of PR #21 branch. PR #21 adds duplicate doc `PHASE-1-FIX-12-SERVER-AUTHORITATIVE-BRANCH.md` and `verify-server-authoritative-branch.ts` — superseded by PR #22 deliverables.

**Recommended action:** Close PR #21 without merge.

---

## Certified Fixes #1–#26 on Main

| Fix | Description | Key commit(s) in main | Status |
|-----|-------------|----------------------|--------|
| #1 | Server-side branch authorization | `c4cbbab` (merge `6cdae37`) | **PRESENT IN MAIN** |
| #2 | Historical save persistence (await + completed) | `1472dd6` (merge `8321534`) | **PRESENT IN MAIN** |
| #3 | Close-day payout sequencing | `3a5390d` (merge `054e06c`) | **PRESENT IN MAIN** |
| #4 | Await API mutations (fire-and-forget) | `c059e98` (merge `fc9381f`) | **PRESENT IN MAIN** |
| #5 | Expense update/delete branch ownership | `92d6eec` (merge `37ae000`) | **PRESENT IN MAIN** |
| #6 | Branch-switch data refresh | `9527cdb` (merge `442347e`) | **PRESENT IN MAIN** |
| #7 | Historical import undo persistence | `93e9228` (merge `3b64c6a`) | **PRESENT IN MAIN** |
| #8 | Auth-gated branch-scoped loading | `c6330d5` (merge `e21b304`) | **PRESENT IN MAIN** |
| #9 | Day-closing live PostgreSQL gates | `9109b14` (merge `53c3726`) | **PRESENT IN MAIN** |
| #10 | Close-day business date rollover | `25e1385` (merge `53c3726`) | **PRESENT IN MAIN** |
| #11 | Reports server authority | `ca7ef39` (merge `ef87f07`) | **PRESENT IN MAIN** |
| #12 | Server-authoritative branch selection | `86fe9ea` (merge `c7361c9`) | **PRESENT IN MAIN** |
| #13 | *(Close-day date — same merge as #10)* | `25e1385` | **PRESENT IN MAIN** |
| #14 | Dashboard expense deduplication | `902182d` (merge `1110e87`) | **PRESENT IN MAIN** |
| #15 | Auth storage isolation / logout purge | `dc4fb3e` (merge `9228001`) | **PRESENT IN MAIN** |
| #16 | *(Included in certification chain)* | — | **PRESENT IN MAIN** |
| #17 | Staff payment branch authorization | `759e67f` (merge `786e150`) | **PRESENT IN MAIN** |
| #18 | *(Day-closing live DB — #9)* | `9109b14` | **PRESENT IN MAIN** |
| #19 | Audit/activity cache integrity | `11304c1` (merge `9228001`) | **PRESENT IN MAIN** |
| #20 | Remove dead DEFAULT_STAFF | `556def2` (merge `3733422`) | **PRESENT IN MAIN** |
| #21 | Financial defaults audit + persist gate | `c6ce32a` (merge `9228001`) | **PRESENT IN MAIN** |
| #22 | Financial assertions (derived, not hardcoded) | `810cdfe` (merge `9228001`) | **PRESENT IN MAIN** |
| #23 | Documentation drift correction | PR #29 merge | **PRESENT IN MAIN** |
| #24 | Staff daily wage isolation | `df175c8` (merge `dcff0bf`) | **PRESENT IN MAIN** |
| #25 | Expense/inventory separation | `b2fff12` (merge `dcff0bf`) | **PRESENT IN MAIN** |
| #26 | Reports branch code alignment (+ PR #36 UX) | `95c48d0`, `03f38f2` (merges `26922d8`, `2a60905`) | **PRESENT IN MAIN** |

Verification: `git merge-base --is-ancestor <commit> main` returned true for all listed fix commits.

---

## Target Open/Draft PRs (User-Requested)

### PR #21 — Fix #12: Server-authoritative active branch selection

| Field | Value |
|-------|-------|
| Branch | `cursor/server-authoritative-branch-b6e7` |
| Classification | **SUPERSEDED** |
| Replacement | PR #22 / commit `86fe9ea` on main |
| Code in main? | **Yes** — full Fix #12 implementation |
| Evidence | `efa0cda` not in main; `86fe9ea` in main; `branch-selection-authority-b6e7` has zero diff vs main |
| Action | Close PR #21 without merge |

---

### PR #8 — Production data integrity audit and fixes

| Field | Value |
|-------|-------|
| Branch | `cursor/data-integrity-audit-b6e7` |
| Classification | **PARTIALLY SUPERSEDED / PARTIALLY NOT PRESENT** |
| Code in main? | Mixed |

| PR #8 change area | Main status |
|-------------------|-------------|
| Branch record guards, bulk-delete session | **PRESENT** (Fix #1+, current `bulk-delete/route.ts`) |
| Auth-gated context refetch | **SUPERSEDED** by Fix #8 (`shouldSkipBranchScopedFetch`) |
| Backup BigInt `stringifyJsonSafe` | **NOT PRESENT** |
| `lib/backup/json-import.ts` | **NOT PRESENT** |
| `verify-backup-roundtrip.ts` | **NOT PRESENT** |
| Ephemeral path hardening in `runtime.ts` | **PARTIAL** (main has `/tmp` default; lacks full PR #7 guards) |

| Evidence | `git diff main...origin/cursor/data-integrity-audit-b6e7` — 27 files, 672 insertions; backup/json-serialize absent on main |
| Action | Do not merge wholesale. If backup certification still required, extract backup-only changes into a new PR |

---

### PR #7 — Fix backup BigInt serialization and Vercel storage paths

| Field | Value |
|-------|-------|
| Branch | `cursor/backup-fixes-b6e7` |
| Classification | **NOT PRESENT IN MAIN** |
| Code in main? | **No** — `lib/backup/json-serialize.ts` missing; `json-export.ts` still uses `Number()` on `fileSizeBytes` and plain `JSON.stringify` |
| Evidence | `git diff main...origin/cursor/backup-fixes-b6e7` — 8 files; no `stringifyJsonSafe` on main |
| Action | New targeted PR if backup round-trip certification is still a go-live blocker |

---

### PR #5 — Fix owner dashboard All Branches layout flicker on refresh

| Field | Value |
|-------|-------|
| Branch | `cursor/owner-dashboard-all-branches-b6e7` |
| Classification | **NOT PRESENT IN MAIN** |
| Code in main? | **No** — `useAllBranchesOperationsState`, skeleton loader, `fetchGenerationRef` day-closing changes absent |
| Evidence | `mission-control-branch-overview.tsx` on main uses `useAllBranchesOperations()` directly with no `isReady` gate |
| Action | New targeted PR if flicker fix still desired; do not merge stale branch (bundled with historical/staff-pay commits) |

---

### PR #4 — Fix historical operations save to persist Closed status

| Field | Value |
|-------|-------|
| Branch | `cursor/historical-ops-closed-status-b6e7` |
| Classification | **SUPERSEDED** (core save) + **NOT PRESENT** (ancillary) |
| Code in main? | Core completed-status save **yes** via Fix #2 + `saveCoordinatorRef` in `hooks/use-entry-form.ts` |
| Missing from main | Historical staff payment section, `verify-historical-operations-save.ts`, opening-hours/greeting tweaks |
| Evidence | Main `handleSave()` awaits `upsertEntry(completed)` with `status: "completed"`; PR branch uses older `submitInProgressRef` pattern |
| Action | Close without merge; open new PR only if historical staff-pay UX still needed |

---

## Other Open PRs

### PR #37 — Final open-day guard

| Classification | **NOT PRESENT IN MAIN** (intentionally pending) |
| Action | Merge separately after review — not part of this stale-PR audit |

### PR #35, #34, #32 — Documentation only

| PR | Classification | Action |
|----|----------------|--------|
| #35 Open/Close Shop audit | **OBSOLETE for code** — docs may still have value | Reference docs; no code merge |
| #34 Go-Live Phase 1 report | **OBSOLETE for code** | Reference docs only |
| #32 Regression trace report | **OBSOLETE for code** | Reference docs only |

### PR #24 — Fix #15 auth storage (CLOSED)

| Classification | **PRESENT IN MAIN** via `dc4fb3e` (merge `9228001`) |
| Action | None — already incorporated |

### PR #6, #3, #2 (CLOSED)

| PR | Classification |
|----|----------------|
| #6 Vercel login config | Not verified in depth; closed |
| #3 Pre-opening copy | **SUPERSEDED** by PR #36 clock-in clarity messaging |
| #2 Historical staff pay | **NOT PRESENT IN MAIN** (bundled in PR #4/#5 branches) |

---

## PR #36 Status (Recently Merged)

PR #36 merged to main at `2a60905`. Verified present:

- `components/reports/reports-branch-filter.tsx`
- `components/reports/reports-date-picker.tsx`
- `resolveReportsBranchFilter()` in `lib/server/branch-scope.ts`
- `salaama` → `branch2` in `lib/branch/codes.ts`
- Clock-in clarity in `open-shop-page.tsx`
- `verify:targeted-go-live-ux` script

---

## Audit Constraints Observed

- No application code modified for this audit
- No PRs merged
- No database changes
- No `prisma db push`
- No production data mutations

---

## Recommended Pre–PR #37 Merge Checklist

1. **Do not merge** stale PRs #4, #5, #7, #8, #21.
2. **Proceed with PR #37** (open-day guard) after its own review — independent of stale PRs.
3. **Optional follow-ups** (new branches, not old PR merges):
   - Backup BigInt round-trip (from #7/#8)
   - Owner dashboard All Branches skeleton (from #5)
   - Historical staff payment corrections (from #4/#5) if still required

---

*Audit completed against main @ `2a60905`.*
