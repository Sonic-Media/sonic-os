# Sonic OS — Phase 2 Findings for Review

**Document type:** Shareable review summary (audit only — no production changes)  
**Prepared:** 2026-09-15  
**Repository:** Sonic-Media/sonic-os  
**Related PRs:** [#58 Capacitor mobile readiness audit](https://github.com/Sonic-Media/sonic-os/pull/58)

---

## Purpose

This document consolidates findings from:

1. **Phase 2 Capacitor mobile readiness audit** (full codebase review)  
2. **Figma plugin / MCP inspection attempt** (file: *Sonic OS — Mobile App V1*)

Nothing in this review modified production code, the database, authentication, or any Figma file.

---

## Executive summary (one page)

| Topic | Verdict |
|-------|---------|
| **Capacitor readiness** | **Conditionally ready** via **Remote WebView** loading deployed HTTPS Sonic OS (same origin for UI + API). **Not ready** for split shell + separate API without auth/CORS/CSRF redesign. |
| **Staff mobile UX** | ~**75%** ready (Today, sales, expenses, EOD structure is strong). |
| **Owner mobile UX** | ~**50%** ready (11-tab bottom nav overflow, admin tables). |
| **Critical staff gap** | **Movie revenue** on Staff Today is **display-only**; input exists in owner operations UI but is **not wired** to the staff Today workspace. |
| **Figma file access** | **Not verified** from Cloud Agent — Figma MCP was not connected/authenticated on the agent VM. |
| **Recommended architecture** | Keep Vercel Next.js + Neon as sole backend; Capacitor as native shell → production URL. |

---

## Part A — Capacitor mobile readiness

### A.1 Current architecture (unchanged recommendation)

- **Next.js 16** standalone server app on **Vercel**
- **53 REST API routes** under `app/api/` (no server actions)
- **PostgreSQL/Neon** via Prisma — mobile must **never** talk to DB directly
- **Auth:** httpOnly cookie `sonic-os-session-token` + DB session
- **Client:** ~44 client pages, contexts fetch `/api/*` with `credentials: "include"`

### A.2 Capacitor compatibility

| Finding | Severity | Notes |
|---------|----------|-------|
| No Capacitor packages or config | High | Nothing to ship to App Store/Play yet |
| Cannot static-export app | Critical | Needs live server + API |
| Relative API paths only | Critical | Works if WebView origin = API origin |
| No CORS configured | High | Blocks split-origin mobile shell |
| CSRF checks Origin/Referer | High | Same-origin WebView OK |
| Cookie auth (httpOnly, SameSite=lax, Secure in prod) | High | Must test on real iOS/Android WebViews |

**Recommended path:** Capacitor `server.url` → production/staging Sonic OS URL.

**Not recommended first:** Capacitor app on different origin calling Vercel API only.

### A.3 Authentication (document only — no changes proposed)

- Session is **server-authoritative**; localStorage is **not** used for login state
- Legacy localStorage keys are **purged on logout** (UX prefs only remain)
- Route protection is **client-side** in `app-shell.tsx`; API remains server-protected
- No OAuth — username/password via `/api/auth/session`

### A.4 UI / UX highlights

**Strengths**

- Mobile bottom nav, `max-w-lg` page container, bottom safe-area padding
- Bottom-sheet modals on several flows (e.g. stock dialog)
- Card layouts on main modules (expenses, sales, stock, staff, purchases)
- Cashiers see **2 nav items** (Today, Sales) — appropriate for staff phones

**Critical issues**

| Issue | Evidence |
|-------|----------|
| Owner **11-item bottom nav** overflows ~375px width | `nav-items.tsx`, `bottom-nav.tsx` |
| **No mobile sign-out/lock** menu | `UserAccountMenu` hidden below `lg` in `page-header.tsx` |
| **Movie revenue not enterable** on Staff Today | `staff-revenue-card.tsx` read-only; `operations-closing-panel.tsx` has input but staff workspace does not use it |

**High issues**

- Settings/admin tables (users, audit log, stock sub-pages) — horizontal scroll only, no mobile cards
- Owner 5-step close-day workspace dense on small screens
- 17 files use `window.confirm` / `alert` / `prompt` (poor native feel in WebView)

### A.5 Staff workflow priority (mobile Phase 2)

| Workflow | Readiness |
|----------|-----------|
| Login | Ready |
| Open shop / clock in | Ready |
| **Movie revenue** | **Critical gap** |
| Accessory sale | Ready |
| Expense | Ready |
| Daily wage | Ready |
| Today summary | Ready (movie shows “Pending” until revenue entered elsewhere) |
| End of day / submit closing | Ready |

### A.6 Offline / native / PWA

| Area | Finding |
|------|---------|
| Offline business data | **None** — all operations require live server |
| PWA manifest / service worker | **None** — only partial `appleWebApp` metadata in `app/layout.tsx` |
| Native plugins | **Not installed** — push, camera, etc. are Phase 3 opportunities |
| Performance | 12s polling on staff/owner dashboards (5–7 parallel API calls) — medium concern for battery |

### A.7 Security (no weakening proposed)

- httpOnly cookies + CSRF + branch RBAC remain required
- WebView exposes full financial UI — device passcode policy recommended for owners

### A.8 Required before first Capacitor build

1. Architecture sign-off: **Remote WebView**
2. **WebView cookie proof** on iOS + Android (staging/production)
3. Fix **movie revenue** on Staff Today
4. Fix **owner mobile navigation** (More drawer or reduced tabs)
5. Add **mobile account menu** (sign out / lock)
6. App icons + splash assets for store submission

### A.9 Validation run during audit

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | **PASS** |
| Production build (`npm run build`) | **FAIL** — pre-existing `_global-error` prerender issue on `main` |
| Capacitor install | **NOT RUN** (by design) |
| Device WebView test | **NOT RUN** |

**Full detail:** `docs/data-integrity/CAPACITOR-MOBILE-READINESS-AUDIT.md` (+ matching `.docx`)

---

## Part B — Figma plugin inspection

### B.1 Request

Inspect connected Figma files and locate:

**File name:** `Sonic OS — Mobile App V1`  
**Constraint:** Read-only — no Figma or code modifications.

### B.2 What was attempted (Cloud Agent session)

| Step | Result |
|------|--------|
| Search for Figma MCP tools in agent session | **No Figma namespace** in available MCP catalog |
| `~/.cursor/mcp.json` / project MCP config on agent VM | **Not present** |
| Figma MCP authentication | **Timed out / rejected** |
| Repo references to file name or Figma URLs | **None found** |

### B.3 Answers for review

| Question | Answer |
|----------|--------|
| **1. Can we access the file?** | **No** — not from this Cloud Agent run. Desktop Figma connection does not automatically attach to the cloud VM. |
| **2. Available pages?** | **Unknown** — not retrieved. |
| **3. Read/write native canvas?** | **Neither** in this session. When remote Figma MCP works: **read** via `get_design_context`, `get_metadata`, `get_screenshot`, etc.; **write** via remote tools such as `generate_figma_design`, `use_figma`, `create_new_file` (not desktop MCP). |
| **4. Target for next design task?** | **Not confirmed in Figma.** Product recommendation once access works: file **`Sonic OS — Mobile App V1`**, page/frame for **Staff Today** (daily operations — aligns with Capacitor staff-first priority). |

### B.4 How to unblock Figma inspection

Choose one:

1. **Cursor Desktop** with Figma MCP connected — re-run inspection in that session  
2. Enable **Figma MCP on Cloud Agent** environment (MCP config + OAuth on agent)  
3. Paste **Figma file or frame URL** (with `fileKey` and optional `node-id`) into chat  

---

## Part C — Recommended sequence (no implementation yet)

| Order | Action | Owner |
|-------|--------|-------|
| 1 | Review and approve **Remote WebView** architecture | Product / engineering |
| 2 | Connect Figma MCP or share **Mobile App V1** link; confirm pages/frames | Design + agent |
| 3 | Fix **Critical web/mobile UX** gaps (movie revenue, owner nav, mobile menu) | Engineering |
| 4 | Staging **WebView cookie auth** test (iOS + Android) | Engineering |
| 5 | `cap init` + icons/splash + internal TestFlight/APK | Engineering Phase 2 |

---

## Part D — What we should NOT change (unchanged constraints)

- Production database or branch production data  
- Authentication security model without explicit design  
- Financial calculations, business-day rules, closing logic  
- Direct database access from mobile  
- Destructive ops / reset authorization  

---

## Document index

| Document | Location |
|----------|----------|
| This review summary | `docs/data-integrity/PHASE-2-MOBILE-FIGMA-FINDINGS-FOR-REVIEW.md` |
| Capacitor full audit (MD) | `docs/data-integrity/CAPACITOR-MOBILE-READINESS-AUDIT.md` |
| Capacitor full audit (DOCX) | `docs/data-integrity/CAPACITOR-MOBILE-READINESS-AUDIT.docx` |
| Pull request | https://github.com/Sonic-Media/sonic-os/pull/58 |

---

## Sign-off block (for reviewers)

| Reviewer | Role | Date | Notes |
|----------|------|------|-------|
| | Product | | |
| | Engineering | | |
| | Design | | |

---

*End of review document.*
