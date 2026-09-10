# PHASE 1 FIX #12 REPORT

**STATUS: PASS**

Formal deliverable: `docs/PHASE-1-FIX-12-SERVER-AUTHORITATIVE-BRANCH.docx`

## ROOT CAUSE

`BranchProvider` used `readStoredActiveBranch()` which read `sonic-os-active-branch` from localStorage and could override PostgreSQL `UserPreference.activeBranchCode`. For owners, after fetching server preference, code called `readStoredActiveBranch(serverBranch)` — localStorage won. `clearSession()` did not clear the active-branch key, enabling cross-user leakage.

## BRANCH AUTHORITY BEFORE / AFTER

| Before | After |
|--------|-------|
| localStorage could override server preference | Server `activeBranchCode` is authoritative |
| Init read localStorage before/alongside server | `fetchAuthSession()` + `resolveAuthoritativeActiveBranch()` |
| API getter always active | Getter returns `null` until `selectionLoaded` |
| Logout left branch key in localStorage | Cleared in `clearSession()` and BranchProvider logout path |

## TEST RESULTS

- `npm run verify:server-authoritative-branch` — 16/16 PASS
- `npx tsc --noEmit` — PASS
- `npm run build` — PASS
- ESLint — pre-existing `set-state-in-effect` only

## PHASE 1 FIX #12 RESULT: PASS
