---
type: note
status: current
area: process
updated: 2026-09-02
tags:
  - m8
  - handoff
  - ux
---

# M8 household LeadLine acquisition-story UX correction

Evidence for the 2026-09-02 Household Lead Detail correction. Code is authoritative.

## 1. Starting branch / commit / working tree

- Branch: `M8` (tracks `origin/M8`)
- Starting HEAD: `9de2b38` (`Clean up`)
- Working tree at start: clean
- No branch switch, merge, rebase, reset, or discard

## 2. UX problem

Lead Detail already has the correct `LeadHeader → LeadLines` model, but prospective members were compact database-like rows (`Self · Adult BJJ · Joined`). Staff had to open person details to understand Trial, Conversion, and Lost.

## Sprint plan

1. Shared LeadLine summary helpers + unit tests
2. Dominant LeadLine acquisition-story cards on Lead Detail
3. Compact household header, follow-up disclosure, Forecast `$0` vs active, notes/history disclosure
4. Remaining coverage, full gates, browser QA, finalize this handoff

---

## Sprint 1 — summary helpers

Authoritative selection lives in `shared/utils/lead-line-summary.ts` so Vue does not invent Trial/Conversion/Lost/Forecast rules.

- Latest Trial: earliest `SCHEDULED` if any; else latest `ATTENDED`/`NO_SHOW`. `CANCELLED` is never current.
- JOINED uses the unreverted Conversion snapshot. Forecast cents are null.
- LOST uses the unreopened Lost outcome, structured reason, and a ≤80-character note excerpt.
- Open lines may show offering + Forecast MRR when `includedInForecast` is true.

No UI change in this sprint. Browser QA: not required.

### QA

```text
pnpm exec vitest run tests/m8/lead-line-summary.test.ts tests/m6/labels.test.ts tests/m8/lead-detail-status.test.ts
Test Files  3 passed (3)
     Tests  20 passed (20)
Duration    4.72s
```

`pnpm exec eslint shared/utils/lead-line-summary.ts tests/m8/lead-line-summary.test.ts` passed.

### Files

- `shared/utils/lead-line-summary.ts` (new)
- `tests/m8/lead-line-summary.test.ts` (new)
- this handoff

## Sprint 2 — LeadLine acquisition-story cards

Prospective-member cards are now the main story: name + person status badge, relationship/age/program as metadata (status is not buried in that sentence), Latest Trial, then Outcome (JOINED/LOST) or Next (open). View details still expands Trial lifecycle, pricing, notes, convert/lost.

`formatDenverCardDate` / `formatDenverCardTime` in `shared/utils/time.ts` for card timestamps.

### QA

```text
pnpm exec vitest run tests/m8/lead-line-summary.test.ts tests/m8/lead-detail-status.test.ts tests/m6/labels.test.ts
Test Files  3 passed (3)
     Tests  20 passed (20)

pnpm exec vitest run tests/m8/staff-trial-workflow.test.ts tests/m8/household-follow-up.test.ts tests/m8/public-household-booking.test.ts
Test Files  3 passed (3)
     Tests  14 passed (14)

pnpm exec eslint app/pages/leads/[id].vue shared/utils/time.ts tests/m8/lead-detail-status.test.ts
passed
```

Browser/visual QA: no browser automation in this environment. Cards were not clicked. Deferred to sprint 4 with staff login on http://localhost:5000.

### Files

- `app/pages/leads/[id].vue`
- `shared/utils/time.ts`
- `tests/m8/lead-detail-status.test.ts`
- `vault/CRM.md`
- this handoff

---

## Sprint 3 — compact household context

Page order is now: compact household header → LeadLine cards → household follow-up → Forecast MRR → notes/status history.

### Household header

- Dropped the four-up “Open work / No phone / No email / No campaign” strip.
- Two columns: primary contact (phone/`tel:` and email/`mailto:` only when present) and source (campaign/UTM only when present).
- Created date sits under the household title. Derived household status remains the single header badge.
- Household edit, add person, and household workflow stay behind existing action buttons.

### Follow-up

- No pending tasks: compact empty state `No open follow-up calls.` plus **Schedule follow-up** and **Show completed calls (n)** when history exists. The add-call form is hidden until Schedule is opened (`aria-expanded`).
- Pending tasks stay prominent (due, overdue stripe, assignee, confirm-intros, complete/assign/cancel). **Add another call** discloses the same form. Completing a new call closes the form.

### Forecast

- Open Forecast MRR `$0` (including fully terminal Josh/Jaime): one muted line, not a large zero card. JOINED snapshot is not presented as open opportunity.
- Active forecast (Emily, `$175`): **Household forecast** panel with household total, enrollment/upfront, and per-person breakdown of `includedInForecast` rows.

### Notes / history

- Add-note form stays visible.
- Existing notes and status history are behind **Show household notes (n)** / **Show status history (n)** with `aria-expanded`.

Bugfix in this sprint: imported `nextScheduledTrial` was shadowed by a Vue computed of the same name. The import is aliased to `earliestScheduledTrial` so card “Schedule trial” still uses the shared helper.

### QA

```text
pnpm exec vitest run tests/m8/lead-line-summary.test.ts tests/m8/lead-detail-status.test.ts tests/m6/labels.test.ts tests/m8/household-follow-up.test.ts tests/m8/scenarios-self-forecast-rules.test.ts
Test Files  5 passed (5)
     Tests  31 passed (31)
Duration    18.55s

pnpm exec eslint app/pages/leads/[id].vue tests/m8/lead-detail-status.test.ts
passed (after --fix for vue/html-indent on the completed-calls list)
```

`lead-detail-status` now also asserts mixed closed households have no email/campaign/UTM and `forecastHousehold.monthlyCents === 0`.

Browser/visual QA (no Playwright/browser MCP in this environment). Substitute: logged in as ADMIN (`admin` / `setup`) against the running `pnpm dev` on http://localhost:5000, then fetched Lead Detail HTML.

| Household | API | SSR markup |
|---|---|---|
| Josh Coy `#1` JOINED + Jaime LOST, closed, pending 0, forecast `$0` | 200 | `No open follow-up calls.` + Schedule follow-up; `Open Forecast MRR $0`; no `Household forecast` panel; no `Open work`; status-history disclosure present |
| Emily Coy `#2` open, pending 0, forecast `$175` | 200 | Schedule follow-up empty state; `Household forecast` panel; no `$0` line |
| Lead One `#3` open, 1 pending, forecast `$0` (no offering) | 200 | `Add another call`; no empty-state Schedule copy; compact `$0` forecast |

Did not click disclosure controls, did not resize to tablet/mobile, and did not visually inspect padding/wrapping. That remains sprint 4.

Diff review: only the Lead Detail page, the mixed-household status test, `vault/CRM.md`, and this handoff. No `.env`, SQLite, logs, or generated artifacts.

### Files

- `app/pages/leads/[id].vue`
- `tests/m8/lead-detail-status.test.ts`
- `vault/CRM.md`
- this handoff

---

## Sprint 4 — remaining coverage, gates, browser QA

- Vue uses `householdFollowUpMode` / `householdForecastMode` / `openForecastBreakdownRows` from `shared/utils/lead-line-summary.ts` instead of page-local forecast filtering.
- Open LeadLine cards hide Forecast MRR when the amount is `$0` (Lead One had no offering; household still shows the compact `$0` line).
- Tests cover ACTIVE mixed (open + JOINED + LOST), compact follow-up empty vs open, and `$0` vs active forecast row filtering.
- Gate fixes unrelated to Lead Detail copy, required for `pnpm lint` / `pnpm typecheck`:
  - `scripts/listen-port.mjs`: `no-useless-assignment` on Nuxt lock PID (pre-existing).
  - `nuxt.config.ts`: removed `vite.server.port` (Nuxt types omit it; `devServer.port` and `scripts/run-nuxt.mjs --port` still bind 5000).

### Full gates (after these edits)

```text
pnpm test
Test Files  38 passed (38)
     Tests  184 passed (184)
Duration    181.15s

pnpm lint
passed

pnpm typecheck
passed

pnpm build
Nuxt 4.5.2 production build complete (node-server)
```

### Browser QA

Headless Chrome (system install) via puppeteer-core in `%TEMP%\renzo-lead-detail-qa` — not a repo dependency. Logged in as ADMIN on http://localhost:5000. Screenshots were **not** committed (disposable). Path: `C:\Users\Scoy9\AppData\Local\Temp\renzo-lead-detail-qa\shots\`.

Viewports: desktop 1280, narrow 900, mobile 390. `documentElement.scrollWidth` overflow: **false** on every shot.

| Scenario | Result |
|---|---|
| Josh Coy `#1` JOINED + Jaime LOST, CLOSED mixed, no pending, Forecast `$0` | Header `Closed · mixed outcomes`; Josh Joined + Conversion `$175/month`; Jaime Lost + `Reason: Not ready`; latest Trials Attended; compact follow-up empty + Schedule + Show completed (2); compact `$0` forecast; notes empty; status history disclosed |
| Josh **View details** | Expands intro history, offering, person notes, Converted MRR, Reverse conversion. Jaime card stays collapsed |
| Emily Coy `#2` open, Forecast `$175` | Card Next: intro scheduled + offering + `$175.00/mo`; **Household forecast** panel + per-person `$175.00/mo`; empty follow-up |
| Emily **Schedule follow-up** | Button becomes Close scheduling; datetime-local + optional note + Add call appear |
| Lead One `#3` pending confirmation | Upcoming phone call, Confirm intros, Assign/Complete/Cancel, **Add another call**; compact household `$0` forecast |
| Mobile 390 Josh | Menu chrome; stacked header/contact; cards remain readable; actions wrap; `$0` forecast one-liner; no horizontal overflow |

Local sqlite only had these three households. Guardian-only, 4+ people, and live open+JOINED+LOST mixed were not clicked in the browser; they are covered by unit/scenario tests.

### Files

- `shared/utils/lead-line-summary.ts`
- `tests/m8/lead-line-summary.test.ts`
- `app/pages/leads/[id].vue`
- `scripts/listen-port.mjs` (lint gate)
- `nuxt.config.ts` (typecheck gate)
- this handoff

---

## Final page (prompt §19)

### Hierarchy

1. Compact household header (name, derived status, contact/source when present, household actions)
2. Prospective-member acquisition-story cards (dominant)
3. Household follow-up (open work prominent; empty compact + disclosure)
4. Forecast MRR (active panel vs `$0` one-liner)
5. Household notes + status history (lists disclosed)

### LeadLine cards

| Kind | Card |
|---|---|
| Open | Name + person status; relationship/age/program metadata; Latest Trial or `No intro scheduled.`; Next (intro scheduled vs needs intro/decision); offering; Forecast MRR only when cents > 0 |
| JOINED | Latest Trial; Outcome joined date + Conversion snapshot offering/amount (not Forecast MRR) |
| LOST | Latest Trial; Outcome lost date + structured reason + ≤80-char note excerpt |
| Mixed household | Each card keeps its own state; household badge is derived (`Closed · mixed outcomes` / `Active · mixed outcomes`) |

`View details` still expands full Trial/pricing/convert/lost. Selection: `shared/utils/lead-line-summary.ts`. Labels: `householdDisplayStatus`.

### API / components

No new endpoints. Existing `GET /api/leads/:id` and `GET /api/leads/:id/forecast` (`includedInForecast`). Page: `app/pages/leads/[id].vue`. Shared: `lead-line-summary.ts`, `formatDenverCardDate` / `formatDenverCardTime`.

### Tests added or changed

- `tests/m8/lead-line-summary.test.ts` (new in sprint 1; sprint 4 presentation/mixed)
- `tests/m8/lead-detail-status.test.ts` (card summaries + missing optional fields + `$0` forecast)

Existing M8 scenario / follow-up / RBAC / forecast suites were re-run as part of `pnpm test` (184).

### Known defects / deferred

- No 4-person, guardian-only, or open+JOINED+LOST household existed in the running local sqlite for click-through; Scott should still walk those if present in his data.
- VIEWER was not logged in visually; mutation blocking remains in `tests/m8/scenarios-rbac-integrity.test.ts`.
- Nuxt DevTools overlay appeared on one narrow screenshot; not product UI.
- Dashboard / Reports / Settings were not redesigned (out of scope).
- Do not start M9, PostgreSQL, SMS, email, WhatsApp, or production deploy from this work.

### Invariants preserved

LeadHeader vs LeadLine ownership; at most one SELF (server); household follow-up (no `UNIQUE(leadId)`); Forecast MRR excludes JOINED/LOST; Conversion snapshot is historical; Trials are not overwritten on reschedule; money integer cents; time via `shared/utils/time.ts`; Meta V1 untouched.

### Sprint commits

| Sprint | SHA | Message |
|---|---|---|
| 1 | `a95ada1c6936b9a01b17756ee614376b6c0dbdd6` | Add LeadLine acquisition-summary helpers for household Lead Detail. |
| 2 | `930fba431bdb4d8120cf773a2cc6ed8b0a5f6bc6` | Show each prospective member's Trial and outcome on household Lead Detail. |
| 3 | `45d1b36c3e316fc0f35b54721e1bb56283c6128a` | Keep household context compact so LeadLine stories stay the main Lead Detail view. |
| 4 | `99d93cdf0e67d1e0318943cf98725f9871aaed7d` | Finish Lead Detail acquisition-story coverage and required QA gates. |

Starting HEAD: `9de2b38`. Branch `M8` tracks `origin/M8`. No force-push.

### Git completion (verified 2026-09-02)

After sprint 4 was committed and pushed:

- Local `M8` HEAD: `99d93cdf0e67d1e0318943cf98725f9871aaed7d`
- `origin/M8` (after `git fetch origin M8`): `99d93cdf0e67d1e0318943cf98725f9871aaed7d`
- Local `M8` and `origin/M8` pointed at the **same commit**
- Working tree: **clean** (`git status` showed `## M8...origin/M8` with no staged or unstaged files)
- Sprint 4 push result: `45d1b36..99d93cd  M8 -> M8` to `https://github.com/Koifish95/renzo-crm.git` (fast-forward, not force)

Each sprint was **pushed before the next sprint began**. History on `M8` after `9de2b38` is exactly these four commits, in order, and each push fast-forwarded `origin/M8` to that sprint’s HEAD:

| After sprint | Pushed HEAD | Origin fast-forward |
|---|---|---|
| 1 | `a95ada1` | `origin/M8` advanced to `a95ada1` before sprint 2 edits |
| 2 | `930fba4` | `origin/M8` advanced to `930fba4` before sprint 3 edits |
| 3 | `45d1b36` | `930fba4..45d1b36  M8 -> M8` before sprint 4 edits |
| 4 | `99d93cd` | `45d1b36..99d93cd  M8 -> M8` before this handoff correction |

This file’s Sprint 4 row originally said `(this commit)` because the SHA is only known after `git commit`. The placeholder is replaced above with `99d93cd…`. Any extra commit that only updates this handoff is recorded in the agent return, not in application code.

---

## Scott’s human acceptance checklist

Walk `/leads/:id` as staff (`admin` / `setup` in development) at desktop, ~900px, and ~390px.

- [ ] Household Detail still uses `LeadHeader → LeadLines` (household contact/follow-up/notes vs person Trial/Conversion/Lost).
- [ ] Header shows shared contact, source/campaign when present, and derived household status — not a fake shared Program.
- [ ] LeadLine cards are the main story; status is a badge, not `Self · Adult BJJ · Joined`.
- [ ] Each person is understandable without opening details: name, relationship, Program, current state, latest Trial or no-Trial, JOINED snapshot or LOST reason or next step.
- [ ] Mandatory Josh/Jaime household: Josh JOINED Adult BJJ with snapshot; Jaime LOST Kids BJJ age 5 with reason; household `Closed · mixed outcomes`; Forecast `$0`; no open follow-up.
- [ ] Mixed open + JOINED + LOST (if you have one) keeps each person’s state independent.
- [ ] Follow-up empty state is compact; Schedule follow-up reveals the form; open/overdue calls stay actionable.
- [ ] Active Forecast shows total + people; `$0` is one line; JOINED snapshot is not treated as open opportunity.
- [ ] Notes/history stay available without filling the first screen.
- [ ] Convert, lost, reverse, schedule/reschedule, follow-up complete/assign still work and match ADMIN/STAFF/VIEWER rules.
- [ ] Padding, wrapping, and badges look correct; no horizontal overflow.
- [ ] Handoff is this file; branch `M8` is pushed.
