# Day Close / Staff Still On Shift — Investigation Report

**Branch:** `cursor/day-close-staff-shift-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `main` (includes prior `cursor/staff-shift-state-fix-b6e7` business-date alignment)

---

## Observed behavior

Staff Today's Operations showed:

> Cannot submit closing while staff are still on shift: Fazil

while the Staff Dashboard header could simultaneously show **On Shift: No** for the logged-in user.

---

## Investigation — source of truth

Shift state is derived from **`AuditLogEntry`** attendance actions (`Start Shift`, `Clock In`, `Clock Out`, `Open Shop`). There is no separate Attendance table.

| Surface | Authority | Scope | Date key |
|---------|-----------|-------|----------|
| Staff Dashboard header | Server audit via `GET /api/staff/me/attendance?date=` + client derivation | **Current logged-in staff only** | Open **business date** (after shift-state fix) |
| End of Day close guard | Server `getStaffOnShiftAtBranch()` in `submitCloseRequest()` | **All active staff at branch** | Resolved open **business date** |
| End of Day checklist (this fix) | Server `GET /api/staff/attendance/on-shift?branch=&date=` | **All active staff at branch** | Open **business date** |

### Submit for Closing workflow (unchanged business rule)

| Step | Behavior |
|------|----------|
| UI | Staff End of Day → **Submit for Closing** |
| Client | `submitCloseRequest()` → `POST /api/day-closings` with `action: "submit-close-request"` |
| Server | `submitCloseRequest()` in `day-closings-service.ts` |
| Guard | `getStaffOnShiftAtBranch(branch, businessDate)` → 409 `staff_on_shift` if any active staff remain |
| On success | `DayClosing.status` → `close_requested` (business day **not locked**) |
| Final close | Management `approve-close` (owner/manager permission) — separate step |

**Not gated by:** revenue, movie revenue, accessory sales, cash remaining, or profit.

---

## Was Fazil actually on shift?

### Production database

This agent environment **does not contain production Fazil records** or an open production business day. Local query returned zero Fazil staff rows and zero open `DayClosing` records.

### Conclusion from architecture + live tests

The close-guard message naming **Fazil** is **correct server behavior** when:

1. Fazil has a `Start Shift` / `Clock In` audit on the **open business date** for the branch, and  
2. No matching `Clock Out` exists for that session on that date.

The apparent contradiction with the header occurs when:

| Case | Header | Close guard | Verdict |
|------|--------|-------------|---------|
| **Logged-in user ≠ Fazil**, Fazil still on shift | Shows **viewer's** shift (e.g. Tony: No) | Blocks on **Fazil** | **Correct server rule**, misleading UX |
| **Fazil logged in**, on shift, business date aligned | Should show Yes (after shift-state fix) | Blocks on Fazil | **Correct** |
| **Fazil clocked out** but UI stale | Could show No incorrectly | Could still block if clock-out not persisted | **Bug** (fixed below) |

---

## Root causes found

### 1. Scope mismatch (design, not a guard bug)

Header = current user. Close guard = all branch staff. Submitting staff can appear "off shift" while another colleague blocks closing.

**Fix:** End of Day now shows server **Staff On Shift** checklist using the same query as the close guard.

### 2. Client attendance cache did not refresh after clock-out

`mergeStaffAuditRecords()` updated the cache but did **not** dispatch `AUDIT_LOG_UPDATED_EVENT`, so `useStaffAttendance()` could keep stale header state until full page refresh.

**Fix:** Dispatch audit update event after merge.

### 3. Stale close error after successful clock-out

`closeFlowError` persisted after submit failure even when server on-shift list became empty.

**Fix:** Clear staff-on-shift error when server preflight returns zero staff; hide stale banner in EOD card.

### 4. No server preflight in UI before submit

Staff only saw the red error **after** failed submit.

**Fix:** `GET /api/staff/attendance/on-shift` + `useBranchStaffOnShift()` wired into End of Day checklist.

### 5. Test fixture bug (not application bug)

`verify:attendance` called `POST /api/day-closings` **without** `action: "submit-close-request"`, hitting owner-only `closeDay()` → **403 forbidden** instead of expected **409 staff_on_shift**.

**Fix:** Test now uses `submitCloseRequestApi()`.

---

## Schema changes

**None.**

---

## Production data / environment

**Not touched.** No production resets, records deleted, or environment variable changes.

---

## Files changed

| File | Change |
|------|--------|
| `lib/staff/audit.ts` | Dispatch `AUDIT_LOG_UPDATED_EVENT` after `mergeStaffAuditRecords` |
| `app/api/staff/attendance/on-shift/route.ts` | Server authoritative branch on-shift preflight API |
| `lib/api/staff-attendance.ts` | `fetchBranchStaffOnShift()` client helper |
| `hooks/use-branch-staff-on-shift.ts` | Fetch + refresh on audit updates |
| `components/operations/staff/staff-end-of-day-card.tsx` | Staff On Shift checklist; suppress stale error |
| `components/operations/staff/staff-operations-workspace.tsx` | Wire server preflight; clear stale errors |
| `lib/server/services/attendance-service.ts` | Export `StaffOnShiftMember` type |
| `scripts/verify-attendance-flow.ts` | Use `submit-close-request`; verify on-shift API + post-clock-out submit |
| `scripts/verify-day-close-staff-shift.ts` | Live scenarios A–E |
| `package.json` | `verify:day-close-staff-shift` script |
| `docs/data-integrity/DAY-CLOSE-STAFF-SHIFT-REPORT.md` | This report |
| `docs/data-integrity/DAY-CLOSE-STAFF-SHIFT-REPORT.docx` | DOCX export |

---

## Scenario verification (live)

| Scenario | Result |
|----------|--------|
| **A** Active staff blocks submit | **PASS** — on-shift API lists staff; submit returns 409 `staff_on_shift` |
| **B** Clock-out clears block | **PASS** — on-shift empty after clock-out; submit → `close_requested` |
| **C** Multiple staff | **PASS** — only remaining active staff listed |
| **D** Branch isolation | **PASS** — Salaama on shift does not appear in Kansanga preflight |
| **E** Historical shift | **PASS** — audit on 2019-03-01 does not block today's business date |
| **F** After midnight | **PASS** (prior branch) — `verify:staff-shift-state` business-date alignment |

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:day-close-staff-shift` | **PASS** (11 checks) |
| `npm run verify:staff-shift-state` | **PASS** (17 checks) |
| `npm run verify:close-request-workflow` | **PASS** (24 checks) |
| `npm run verify:close-day-date` | **PASS** (16 checks) |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:attendance` | **PASS** (after test fix — previously failed 403 vs 409) |

## Tests not run

| Test | Reason |
|------|--------|
| Production Fazil audit inspection | No production DB access in agent environment |
| Browser E2E on live Preview with Fazil account | Not executed in this run |

---

## Final verdict

| Question | Answer |
|----------|--------|
| Is "Fazil still on shift" necessarily wrong? | **No** — correct when Fazil has an open session on the open business date |
| Was there a state inconsistency? | **Yes** — header showed viewer-only shift; EOD had no server preflight; clock-out could leave stale UI/error |
| Is the close guard correct to keep? | **Yes** — unchanged; zero-revenue days still closable after all staff clock out |

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS** (all required verifiers run successfully in this session)
