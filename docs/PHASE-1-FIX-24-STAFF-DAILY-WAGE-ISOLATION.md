# PHASE 1 FIX #24 REPORT — STAFF DAILY WAGE ISOLATION

**STATUS: PASS**

**DATE:** 2026-09-11  
**BRANCH:** `cursor/data-integrity-consolidated-b6e7`  
**Formal deliverable:** `docs/PHASE-1-FIX-24-STAFF-DAILY-WAGE-ISOLATION.docx`

---

## 1. Finding

Staff member A records their daily wage/cut successfully. Staff member B on the same branch and business date receives "daily wage already recorded" and cannot pay themselves. Branch/day appeared paid after any single staff payment.

## 2. Reproduction

1. Staff A logs in, makes sales, records daily wage → success.
2. Staff B logs in (same branch, same date), makes sales, attempts daily wage → blocked as already paid.
3. Staff A's payment row has correct `staffId`; Staff B has no payment row but UI/server-side branch aggregate treated the day as paid.

Deterministic API reproduction (historical date `2019-09-12`, Kansanga):

- POST `/api/staff-payments` as Staff A → 201
- POST `/api/staff-payments` as Staff B → 201 (after fix; was blocked in UI before fix)
- Duplicate POST for Staff A → 409
- Duplicate POST for Staff B → 409

## 3. Root Cause

**Server duplicate guard was already correct.** `createStaffPayment` in `lib/server/services/staff-payments-service.ts` queries `staffId + branchId + date`. No Prisma unique constraint exists on `branchId + date` alone.

**UI and client-side workflow logic was branch-scoped, not staff-scoped:**

- `staff-operations-workspace.tsx` used `staffPayouts > 0` / branch-wide payout totals to set `wageRecorded`.
- `staff-end-of-day-card.tsx` inherited branch-wide "paid" state.
- `staff-daily-wage-card.tsx` searched payments without scoping to linked staff.
- BI warning generators treated any branch payment as "wage recorded" rather than evaluating each staff member.

Day closing payout rows (`buildStaffPayoutRows`) already evaluated `paidToday` per staff; the bug was in staff self-service UI gating.

## 4. Affected Files

| File | Change |
|------|--------|
| `lib/staff-payments/calculations.ts` | Added `findStaffDailyWagePayment`, `hasStaffDailyWagePayment`, `computeStaffPayoutTotalForStaffBranchDate`; fixed branch matching in branch-date totals |
| `hooks/use-entry-form.ts` | Added `scopedStaffId` for per-staff payout deduction |
| `components/operations/staff/staff-operations-workspace.tsx` | Per-staff `wageRecorded` via `hasStaffDailyWagePayment` + `useLinkedStaff` |
| `components/operations/staff/staff-end-of-day-card.tsx` | Accepts explicit `wageRecorded` prop |
| `components/operations/staff/staff-daily-wage-card.tsx` | Uses `findStaffDailyWagePayment` for linked staff |
| `components/operations/staff/staff-day-closed-view.tsx` | Per-staff daily wage display |
| `lib/business-intelligence/generators/warnings.ts` | Unpaid-staff warnings per individual |
| `lib/business-intelligence/generators/staff.ts` | Same per-staff unpaid logic |
| `scripts/verify-staff-daily-wage-isolation.ts` | New certification script (14 checks) |
| `package.json` | Added `verify:staff-daily-wage-isolation` |

## 5. Fix

- Introduced shared per-staff daily wage helpers keyed by `staffId + branch + businessDate`.
- Staff operations UI now resolves the logged-in staff member and checks **their** payment only.
- Entry form payout deduction scopes to the active staff member when provided.
- Day open/close branch state remains independent from individual staff payment state.

## 6. Invariant

For each `(branch, businessDate, staffMember)` tuple, at most one valid daily-wage payment may exist. Staff A being paid must not block Staff B. Cross-branch and cross-staff writes remain forbidden. Duplicate same-staff/same-date payments remain rejected (409).

## 7. Test Design

`scripts/verify-staff-daily-wage-isolation.ts`:

1. Static checks — UI uses per-staff helper; server scopes duplicate guard.
2. Staff A paid; Staff B unpaid then paid on same branch/date.
3. Duplicate rejection for A and B.
4. Cross-staff create rejected (403).
5. Cross-branch create rejected (403).
6. Different business dates independent.
7. PostgreSQL one row per staff per date.
8. `buildStaffPayoutRows` marks each staff `paidToday` independently.

Uses controlled certification cashiers and historical dates (no production/Neon).

## 8. Test Results

```
npm run verify:staff-daily-wage-isolation → 14/14 PASS
npm run verify:staff-payment-branch       → 16/16 PASS
npm run verify:close-day-payouts          → PASS
npm run verify:day-closing-live-db        → 15/15 PASS
npm run verify:close-day-date             → 16/16 PASS
```

## 9. Branch Safety

All payment queries and UI checks include branch context. Kansanga staff payments do not affect Salaama. Cross-branch payment attempts rejected.

## 10. Transaction Safety

Staff payment creation remains atomic (ExpenseRecord + StaffPayment + AuditLog in existing Prisma transaction). No change to transaction boundaries.

## 11. Schema Impact

**NONE**

Audited `StaffPayment` model — no incorrect unique index on `branchId + date`. Server already scopes duplicates by `staffId`.

## 12. Production Impact

**NOT TOUCHED** — local/disposable PostgreSQL fixtures only.

## 13. Regression Results

| Check | Result |
|-------|--------|
| `verify:staff-daily-wage-isolation` | PASS |
| `verify:staff-payment-branch` | PASS |
| `verify:close-day-payouts` | PASS |
| `verify:day-closing-live-db` | PASS |
| `verify:close-day-date` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | FAIL — PRE-EXISTING `_global-error` prerender |
| `npm run lint` | FAIL — PRE-EXISTING repo-wide lint debt (45 errors) |

## 14. Final Result

**PASS**
