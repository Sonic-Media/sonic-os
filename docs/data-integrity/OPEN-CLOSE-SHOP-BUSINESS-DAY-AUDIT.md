# SONIC OS — OPEN / CLOSE SHOP BUSINESS-DAY AUDIT

**Date:** 11 September 2026  
**Type:** Code audit (read-only; no schema/data/production changes)  
**Commit inspected:** `8168a20` (main; includes Fix #26 deployment docs)  
**Production relevance:** Live app at https://sonic-os-lemon.vercel.app runs this commit ancestry (`26922d8` Fix #26 + prior integrity fixes)

---

## Executive Summary

**CORE BUSINESS-DAY RESULT: TARGETED FIX REQUIRED**

The current implementation **correctly models business date, after-midnight close, branch isolation, staff-scoped open/close, and staff payment business dates** for the Sonic Media rules tested in this audit.

**One explicit business-rule mismatch:** Rule 6 (forgotten close) — the server **does not block** opening a new calendar date while a **previous business day remains open** for the same branch.

**No code was modified during this audit.**

Smallest targeted fix (for a future change): add a server guard in `openDay` / `openWithShift` that rejects when any other `DayClosing` row for the branch is `status=open` with `openedAt`/`reopenedAt` on a **different** `date`.

Fixes #1–#26: **Previously certified; not rerun** (except `verify:close-day-date` run for close/midnight evidence).

---

## Sonic Media Business Rules (Reference)

1. Opening time flexible (~7–9 AM); staff open when operating begins  
2. Closing flexible (~10 PM–12 AM+); midnight is not a business-day boundary  
3. Business date = date the day was **opened**  
4. Midnight must **not** auto-close an open business day  
5. Close Shop closes the **currently open** business day (not browser calendar alone)  
6. Forgotten close: block opening next day until previous day is closed  
7. Sunday not hardcoded closed  
8. Staff may open **their own branch** only  
9. Close is branch-scoped; not required to be same person who opened  
10. Branches operate independently  
11. Staff record own activity; owner sees combined branch view  
12. Staff wage uses business date + separate payment timestamp  

---

## Critical Questions A–M

| Q | Question | Result | Evidence |
|---|----------|--------|----------|
| **A** | Can an open Monday business day remain open after midnight? | **PASS** | No job/cron/midnight handler sets `DayClosing.status=closed`. Open rows persist until explicit close. |
| **B** | Close at Tue 12:30 AM closes **Monday** (not Tuesday)? | **PASS** | `resolveOpenBusinessDateForClose()` selects earliest open record by `date` asc (`day-closings-service.ts` L476–507). Verified: `verify:close-day-date` check 7 PASS. |
| **C** | Can Tuesday be opened while Monday remains open? | **FAIL** | `openDay` / `openWithShift` only check `branchId_date` for **requested** date (L271–298, L376–403). No query for other open dates. Violates Rule 6. |
| **D** | Does midnight automatically close anything? | **PASS** | No server auto-close on date rollover. UI schedule (`opening-hours.ts`) affects **new open** UX only, not DB state. |
| **E** | Can staff open their own branch? | **PASS** | `assertCanOpenShop` + `getBranchIdForSession(session, parsed.branch)` with staff home-branch check. |
| **F** | Can staff open another branch? | **PASS** | `assertSessionCanAccessBranchCode` → 403. Verified in branch auth / close-day scripts. |
| **G** | Can another authorized staff member close the same branch? | **PASS** | `canAccessCloseDay`: branch-manager or cashier; no requirement that closer = opener. |
| **H** | Independent Kansanga / Salaama open-closed states? | **PASS** | `DayClosing` unique on `[branchId, date]`. Cross-branch close → 403 (verify check 14–15). |
| **I** | Can Sunday operate when business chooses? | **PASS** | No `dayOfWeek === 0` block in open/close services. Schedule hours apply all days equally. |
| **J** | Staff wages: business date **and** payment timestamp? | **PASS** | `StaffPayment.date` = business date input; `createdAt` = server timestamp (`staff-payments-service.ts`). |
| **K** | Close uses persisted open record (not calendar alone)? | **PASS** | Server: `resolveOpenBusinessDateForClose`. Client: `getActiveOpenDayRecord` (`business-date.ts`). |
| **L** | After close, business mutations blocked? | **PASS** | `assertBranchDayOpenForWrite` → 409 `day_closed`. Verified check 12 in close-day script. |
| **M** | Business-day records branch-scoped server-side? | **PASS** | All mutations use `branchId` from `getBranchIdForSession`. |

---

## Rule 6 Failure — Detail

### Symptom

If Kansanga opens Monday and staff forget to close, then on Tuesday calendar the UI shows `needsShopOpening(branch, tuesday)` (no row for Tuesday) and staff can call `openDay(branch, tuesday)`. Server accepts it. **Two open business days** can exist for one branch.

### Responsible code

```271:298:lib/server/services/day-closings-service.ts
  const existing = await prisma.dayClosing.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: parsed.date,
      },
    },
  });
  // ... checks only THIS date — no scan for other open dates
```

Same pattern in `openWithShift` (L376–403).

### Smallest safe fix (not implemented in this audit)

Before upsert in `openDay` and `openWithShift`:

1. `findMany` where `branchId`, `status=open`, `openedAt|reopenedAt` not null, `date !== parsed.date`
2. If any → `409` with message: *"Previous business day still open. Close [date] before opening [parsed.date]."*

**Schema change:** NO  
**Production data change:** NO (guard only prevents new bad states)

---

## What Already Matches (Evidence)

### Business date & after-midnight close

- `lib/day-closing/business-date.ts` — earliest open day for close target  
- `closeDay` uses PostgreSQL open records, not calendar hint alone  
- `verify:close-day-date` — **16/16 PASS** (same-day close, after-midnight close, post-close 409, cross-branch 403)

### Branch & staff authorization

- Open/close: staff only (owner operational actions blocked)  
- Branch: session-scoped via `getBranchIdForSession`  
- Staff payment: per-staff duplicate guard + branch auth (Fix #17/#24 — previously certified)

### Day state model

```462:493:prisma/schema.prisma
model DayClosing {
  date                String
  branchId            String
  status              String    @default("open")
  openedAt            DateTime?
  closedAt            DateTime?
  @@unique([branchId, date])
}
```

States: `waiting` (row, never opened) | `open` | `closed` — derived in `getBranchDayState`.

### Financial model

Not redesigned in this audit. Movie/accessory separation exists in daily operations / sales modules; open/close workflow does not break that separation.

---

## Tests Performed (This Audit)

| Test | Result |
|------|--------|
| Code trace (open/close UI → API → service → guards) | Done |
| `npm run verify:close-day-date` | **16/16 PASS** |
| Fixes #1–#26 full suite | **Not rerun** (previously certified) |
| Production live open/close mutation | **Not performed** (read-only) |

---

## Deferred — Not Go-Live Blockers

| Observation | Classification |
|-------------|----------------|
| UI `SHOP_OPEN_HOUR = 9` blocks Open Shop before 9 AM local | Schedule UX vs Rule 1 flexible 7–9 AM opening; **server does not enforce** — staff could not open via UI before 9 AM |
| UI `SHOP_CLOSE_HOUR = 23` — after 11 PM phase blocks **new** open attempts | Does not auto-close open DB day; Rule 2 allows closing until ~12 AM — **close path still works** via business-date resolution |
| `getStaffOnShiftAtBranch(branch, parsed.date)` on close uses calendar hint | Minor after-midnight edge if hint date ≠ open business date |
| Purchasing/stock writes lack `assertBranchDayOpenForWrite` | Outside explicit Sonic Media rules in this audit |
| Pre-existing local `npm run build` prerender failure | Does not affect deployed production operation (per go-live audit) |
| Production in-app backup failures (BigInt) | Safety net issue — see Go-Live Phase 1 report |

---

## Final Decision

**TARGETED FIX REQUIRED** — one item: **forgotten-close guard on open** (Rule 6 / Question C).

All other audited business-day rules **PASS** or are **deferred non-blockers**.

**Recommended next action:** Implement the single server guard above in a small focused change, add one verifier case, then proceed with real business use using the Go-Live Phase 1 manual checklist.

**For this audit task:** **NO CODE CHANGE MADE.**

---

*Audit only. No production data, schema, env, or migrations modified.*
