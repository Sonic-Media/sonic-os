# PHASE 1 FIX #20 — REMOVE DEAD DEFAULT_STAFF CONSTANTS

**Formal deliverable:** `docs/PHASE-1-FIX-20-DEFAULT-STAFF.docx`

## 1. Title

Phase 1 Fix #20 — Remove Dead DEFAULT_STAFF Constants (Data Integrity)

## 2. Status

**PASS**

## 3. Date

2026-09-11

## 4. Branch

`cursor/default-staff-b6e7`

## 5. Objective

Audit and remove dead `DEFAULT_STAFF` constants / obsolete default staff data so PostgreSQL/API remains the only source of truth for real staff. Production UI/business logic must not silently manufacture staff records from hardcoded constants.

## 6. Audit scope

Searched the repository for:

- `DEFAULT_STAFF`
- `defaultStaff` / default staff
- `STAFF_DEFAULT`
- `FALLBACK_STAFF` / `MOCK_STAFF` / `SAMPLE_STAFF` / `STAFF_DATA`
- hardcoded staff fixture ids/names (`staff-p`, `staff-f`, `staff-k`, `Staff P/F/K`)
- staff list localStorage source-of-truth paths

Inspected: `app/`, `components/`, `context/`, `hooks/`, `lib/`, `scripts/`, `prisma/`, API routes, seed/bootstrap, tests/verification scripts, docs.

## 7–8. Every DEFAULT_STAFF / default-staff occurrence + classification

| Symbol | File | Usage count / callers | Production reach? | Writes PG? | Affects payments/auth/finance? | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DEFAULT_STAFF` | `lib/constants.ts` (removed) | **0 imports / 0 callers** before removal | No — dead export | No | No | **D. Dead/unused production constant — REMOVED** |
| `DEFAULT_STAFF_ROLES` | `lib/staff/roles.ts` | Used by roles UI + permissions | Yes (role catalog only) | No (not person rows) | Role labels/modules only | **C. Required configuration — PRESERVED** |
| `DEFAULT_STAFF_ROLES` consumers | `lib/auth/permissions.ts`, `components/settings/roles-list.tsx` | Role name/module maps | Yes | No | Auth module visibility, not staff people | **C. Required configuration — PRESERVED** |
| Bootstrap owner staff | `lib/server/bootstrap/stages.ts` (`runOwnerStaffStage`) | Bootstrap pipeline only | Controlled bootstrap | Yes (owner only) | Links owner user↔staff | **F. Historical compatibility / bootstrap — PRESERVED** |
| `HISTORICAL_IMPORT_STAFF_NAME` | `lib/historical-import/constants.ts` | Historical import actor label `"Penny"` | Import path | No staff create from DEFAULT_STAFF | Display name for import actor | **F. Preserved (out of DEFAULT_STAFF scope)** |
| `MOCK_STAFF` / `SAMPLE_STAFF` / `FALLBACK_STAFF` / `STAFF_DATA` | — | None found | — | — | — | N/A — absent |

### Removed constant contents (evidence)

Former `DEFAULT_STAFF` array (pre-fix):

- `{ id: "staff-p", name: "Staff P", branch: "salaama", role: "cashier", ... }`
- `{ id: "staff-f", name: "Staff F", branch: "salaama", role: "cashier", ... }`
- `{ id: "staff-k", name: "Staff K", branch: "kansanga", role: "branch-manager", ... }`

Repo-wide search showed **no** `import { DEFAULT_STAFF }` and no symbol references outside the definition site.

## 9. Root cause

Legacy localStorage-era fixture array remained exported from `lib/constants.ts` after staff loading moved to API/PostgreSQL (`StaffProvider` → `fetchStaff` → `/api/staff` → `prisma.staff`). The constant was unused but remained an unsafe mock business-data artifact that could be reintroduced as a fallback.

## 10. Files changed

- `lib/constants.ts` — removed `DEFAULT_STAFF` + unused `Staff` type import
- `scripts/verify-default-staff.ts` — new static integrity verifier (checks A–L + high-risk paths)
- `package.json` — added `verify:default-staff`
- `docs/PHASE-1-FIX-20-DEFAULT-STAFF.md` — this report
- `docs/PHASE-1-FIX-20-DEFAULT-STAFF.docx` — Word deliverable

## 11. What was removed

- Entire `export const DEFAULT_STAFF: Staff[] = [...]` fixture (Staff P/F/K).

## 12. What was intentionally preserved

- `DEFAULT_STAFF_ROLES` role catalog and consumers
- Bootstrap owner staff stage (`DEFAULT_OWNER_USERNAME`)
- `HISTORICAL_IMPORT_STAFF_NAME`
- Prisma schema / migrations (unchanged)
- No replacement default-staff array was added

## 13. Production-path analysis

Authoritative path verified in code:

```
PostgreSQL Staff (branchId FK)
  → lib/server/services/staff-service.ts
  → /api/staff
  → lib/api/staff.ts fetchStaff()
  → context/staff-context.tsx (normalizeStaffList, empty array if unauthenticated)
  → UI / staff payments / day closing selectors
```

`StaffProvider` does **not** reference `DEFAULT_STAFF`. Unauthenticated state sets `staff = []`.

## 14. Branch-integrity analysis

- Active staff filtering uses `branchCodesReferToSameInventory(member.branch, branch)` in `lib/staff-storage.ts`.
- Server staff create/update resolves `branchId` via `getBranchIdByCode`.
- Hardcoded `staff-p`/`staff-f`/`staff-k` branch assignments removed with the constant.
- No path allows DEFAULT_STAFF to bypass Kansanga/Salaama ownership.

## 15. Staff-payment safety analysis

- `createStaffPayment` loads `prisma.staff.findUnique({ where: { id: input.staffId } })` and throws `Staff member not found` if missing.
- UI payment recording uses `getStaffById` from API-backed `StaffProvider`.
- Day-closing / staff-payment contexts contain no `DEFAULT_STAFF` or Staff P/F/K fixtures.
- A hardcoded fixture id cannot become a financial `StaffPayment` row without a real PostgreSQL staff UUID.

## 16. Verification results

```
npm run verify:default-staff
verify:default-staff: 26/26 PASS
```

Checks A–L plus high-risk path scans all PASS (static repository inspection; no production DB writes).

## 17. Regression results

| Script | Result | Classification |
| --- | --- | --- |
| `npm run verify:default-staff` | **26/26 PASS** | Fix #20 evidence |
| `npm run verify:financial-assertions` | **NOT AVAILABLE** | Script missing on this branch |
| `npm run verify:financial-defaults` | **NOT AVAILABLE** | Script missing on this branch |
| `npm run verify:branch-selection` | **NOT AVAILABLE** | Script missing on this branch |
| `npm run verify:auth-storage-isolation` | **NOT AVAILABLE** | Script missing on this branch |
| `npm run verify:staff` | FAIL `fetch failed` | **ENVIRONMENT / FIXTURE FAILURE** (no local server at `:3000`) |
| `npm run verify:roles` | Static checks 1–7 PASS; then FAIL `fetch failed` | **ENVIRONMENT / FIXTURE FAILURE** (HTTP portion) |
| `npm run verify:branch-isolation` | FAIL `fetch failed` / ECONNREFUSED | **ENVIRONMENT / FIXTURE FAILURE** |
| `npm run verify:branch-operations` | FAIL `fetch failed` / ECONNREFUSED | **ENVIRONMENT / FIXTURE FAILURE** |
| `npm run verify:expenses` | FAIL `fetch failed` | **ENVIRONMENT / FIXTURE FAILURE** |
| `npm run verify:users` | FAIL `fetch failed` | **ENVIRONMENT / FIXTURE FAILURE** |
| `npm run verify:operations` | FAIL Prisma/DB branch lookup | **ENVIRONMENT / FIXTURE FAILURE** |
| `npm run verify:historical-import` | Ledger file not found | **ENVIRONMENT / FIXTURE FAILURE** |

None of the environment failures are attributable to Fix #20 (dead-constant removal with zero production callers).

## 18. TypeScript result

```
npx tsc --noEmit
→ exit 0 PASS
```

## 19. Build result

```
npm run build
→ ✓ Compiled successfully
→ exit 0 PASS
```

## 20. ESLint result

```
npm run lint
→ ✖ 100 problems (44 errors, 56 warnings)
→ exit 1
```

**Pre-existing** failures across many contexts/components. **No ESLint findings** in `lib/constants.ts` or `scripts/verify-default-staff.ts`. Not a new Fix #20 regression.

## 21. Schema changes

**NONE** — no Prisma schema edits, no migrations added.

## 22. Production-data impact

**NOT TOUCHED** — no seed, reset, migrate, DELETE/UPDATE against production. Verification is static file inspection.

## 23. Commit

`556def275d5523e0d941c5ef99c0b428f55a680e` — `fix(integrity): remove dead default staff constants`

Documentation for this fix is on the same branch in `docs/PHASE-1-FIX-20-DEFAULT-STAFF.md` and `.docx`.

## 24. Final PASS/FAIL

**PASS**

Evidence: dead `DEFAULT_STAFF` removed; no unsafe mock staff fallbacks remain; production staff path is API/PostgreSQL; `verify:default-staff` 26/26; `tsc` PASS; `build` PASS; schema/production data untouched.
