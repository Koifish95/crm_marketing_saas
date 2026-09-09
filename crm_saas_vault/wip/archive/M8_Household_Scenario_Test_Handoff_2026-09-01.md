---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - handoff
  - tests
---

# M8 household scenario test handoff

Evidence for the 2026-09-01 end-to-end scenario-test pass. Code and tests are authoritative.

**Superseded on duplicate SELF and LOST-in-forecast:** those were documented as current/accepted findings in this pass. They are **no longer accepted**. See [[wip/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]]. INITIAL_SCHEDULE database uniqueness on `trialId` remains unchanged on purpose. The Attended/No-show timing question was not changed.

## 1. Repository / branch / commit state

- Repository: `renzo_crm`
- Branch: `M8` (tracks `origin/M8`)
- Starting commit for this pass: `59b300f` (`Creating more tests`)
- Ending commit: **not created** — this pass is uncommitted
- Push status: not pushed
- Working tree: new scenario tests/helpers, conversion lost-guard, explicit h3 imports on Trial/convert HTTP handlers, vault coverage + this handoff
- Migrations: none

## 2. Purpose of the test pass

Prove the post-M8 household model behaves coherently across LeadHeader → LeadLine → Trial → FollowUpTask → household display status → Conversion/Lost → forecast/reporting, using realistic lifecycles rather than isolated unit checks.

## 3. Existing coverage reviewed

Read: `vault/wip/archive/M8_V2_Implementation_Handoff.md`, `vault/wip/archive/M8_Household_UX_Correction_Handoff.md`, `vault/wip/M8_Household_Trial_FollowUp_Correction_Handoff_2026-09-01.md`.

Existing tests already covered pieces of the model:

- M4 intro availability / rollback / HTTP auth
- M5 follow-up due dates / outcomes
- M7 RBAC HTTP for dashboard/leads/tasks at a coarse level
- M8 household create, conversion, pricing, reporting, public booking, staff Trial APIs, household follow-up consolidation, leads-list household status

Gaps: named lifecycle walkthroughs, full display-status matrix, public-vs-staff domain comparison, Trial/convert/reverse HTTP RBAC, lost-while-converted integrity.

## 4. New scenario-test architecture

Helpers live in `tests/m8/helpers/scenarios.ts`. Scenario files are grouped by letter:

| File | Groups |
|---|---|
| `scenarios-lifecycle.test.ts` | A, B, C |
| `scenarios-edges.test.ts` | D, E |
| `scenarios-follow-up.test.ts` | F |
| `scenarios-status-matrix.test.ts` | G |
| `scenarios-list-forecast-report.test.ts` | H, I, J, L |
| `scenarios-rbac-integrity.test.ts` | K, M |

Assertions use canonical `householdDisplayStatus` from `shared/utils/labels.ts`. Staff scheduling uses `scheduleTrialFromSlot` / public availability, not invented datetimes, except E3 next-intro which uses `createTrial` to control past/future timestamps.

## 5. Helpers / fixtures added

`createSingleAdultHousehold`, `createGuardianChildHousehold`, `createParentChildHousehold`, `createTwoChildHousehold`, `scheduleValidTrialForLine`, `completeHouseholdFollowUp`, `convertHouseholdLine`, `markLineLost`, plus slot/program/offering/admin helpers and reusable assertions (`expectHouseholdStatus`, `expectPendingInitialCount`, conversion/lost/trial counters).

## 6. Scenario groups implemented

A–M as specified. Combined walkthroughs were used where the prompt itself named full lifecycles (A2–A6, C2–C7, D2–D5). Coverage matrix lists every ID.

## 7. Household-status matrix results

Table-driven `householdDisplayStatus` matches:

- Converted + Lost → `Closed · mixed outcomes`
- Converted + Active → `Active · mixed outcomes`
- All joined → `Joined`
- All lost → `Lost`
- Two active lines with mixed operational statuses still show the **header** operational status (for example Trial scheduled), not a mixed derived key

Live DB: New, Trial scheduled, Active mixed, Closed mixed + list filter `CLOSED_MIXED` does not include leftover `TRIAL_ATTENDED`.

## 8. Trial lifecycle results

Staff can schedule from configured slots; invalid slots leave no Trial/Follow-Up; reschedule preserves CANCELLED history; attend/no-show/cancel update the correct LeadLine; subsequent Trial after no-show/cancel works; siblings stay independent; next-intro is earliest future SCHEDULED.

## 9. Follow-Up consolidation results

One pending INITIAL_SCHEDULE per household for overlapping work. Public parent+child → one call with two confirmation intros. Later Trial absorbed. Completed confirmation not rewritten. Reschedule does not duplicate. Cancel-one keeps; cancel-all cancels. Converted sibling does not destroy remaining child confirmation.

## 10. Mixed household outcome results

Parent JOINED + child open → Active · mixed, `closedAt` null. Parent JOINED + child LOST → Closed · mixed, not stale Trial attended. Reopen child → Active · mixed, Lost history kept. Two children: independent Trial outcomes; both lost closes household.

## 11. Conversion / Lost results

One active Conversion per line. Snapshot cents frozen after offering price change. Reverse restores a non-terminal line and keeps the Conversion row. Lost requires a reason. **New:** JOINED / active Conversion cannot be marked lost until reversal.

## 12. Pricing / forecast results

Adult standard 17500. Household first+additional 17500+15500 from the configured rule. Override + reason persist. Mixed converted/lost household still has a live forecast total because the current forecast engine prices any line with an offering, including LOST. Documented, not changed.

## 13. Leads list / Pipeline results

One LeadHeader = one row. Prospect count = line count. Mixed programs summarized. Search by contact and child name. Program filter matches any line. Source/campaign header-level. Next intro = earliest future SCHEDULED. Past Trials ignored. Status filter uses derived household keys.

## 14. Public vs staff consistency results

Equivalent SELF+CHILD households from public booking and staff create+schedule share: two lines, Trial ownership, one pending household call, Trial scheduled display. Attribution/UTM only on the public path, as expected.

## 15. RBAC results

STAFF can create Lead, schedule Trial, mark attended, convert. VIEWER cannot read/mutate CRM leads. Unauthenticated 401 on internal Lead/Follow-Up APIs. STAFF 403 on Conversion reverse. ADMIN can reverse.

HTTP handlers used in this suite now import `defineEventHandler` / auth helpers from h3 explicitly so Vitest can load them (Nuxt auto-imports are not present in the test runner).

## 16. Reporting-regression results

Household count = headers. Prospective members = unique lines. Reschedule does not double-count funnel people. Attended/converted unique by line. Conversion snapshot MRR sums. Program grouping uses lines. Campaign/source roll through header attribution (existing `reporting.test.ts` plus scenario L).

## 17. Invalid-state / data-integrity results

- Two active Conversions: rejected
- Lost while converted: **now rejected** (was possible)
- Trial attached to another household’s line: rejected
- Duplicate SELF via staff add-person: **currently allowed** (public schema still rejects two SELF members)
- `closedAt` while a sibling is active: services keep `closedAt` null
- Duplicate leftover pending initials: `ensureInitialFollowUpTask` consolidates to one pending
- Unique DB index for pending INITIAL_SCHEDULE remains per `trialId`, not `leadId`

## 18. Bugs discovered

1. `markLeadLineLost` allowed JOINED lines, leaving an active Conversion and Lost outcome on the same person.
2. Staff `addLeadLineToHousehold` does not prevent a second SELF line (product question, not changed).
3. Forecast includes priced LOST lines (current engine; not changed).
4. Several Trial/convert Nitro handlers relied on Nuxt auto-imports and could not be loaded in Vitest until explicit h3 imports were added.

## 19. Bugs fixed

Lost-on-converted rejected in `server/services/conversion.ts`. Explicit h3/auth imports on:

- `server/api/leads/index.post.ts`
- `server/api/leads/[id].get.ts`
- `server/api/leads/[id]/trials.post.ts`
- `server/api/trials/[id]/outcome.post.ts`
- `server/api/leads/[id]/lines/[lineId]/convert.post.ts`

No product behavior change from the import-only edits.

## 20. Unresolved product questions

Answered in the 2026-09-01 business-rule correction pass (see [[wip/M8_Scenario_Test_Business_Rule_Corrections_Handoff_2026-09-01]]):

- Staff second SELF: **rejected** (same as public).
- Forecast JOINED/LOST: **excluded** from active Forecast MRR.
- INITIAL_SCHEDULE `UNIQUE(leadId)`: **not added**; deferred to M9/PostgreSQL.

Still open (not changed):

- Should Attended/No-show be allowed on class day before start time in the UI?

## 21. Tests / files changed

New: `tests/m8/helpers/scenarios.ts` and six `tests/m8/scenarios-*.test.ts` files (27 new tests).

Modified production: `server/services/conversion.ts` (lost guard); five Nitro handlers (explicit imports).

Vault: `CRM.md`, `Decisions.md`, `Home.md`, `Implementation-State.md`, coverage matrix, this handoff.

## 22. Exact QA command results

| Command | Result |
|---|---|
| `pnpm test` | **153 passed** (34 files) |
| `pnpm lint` | passed (Node CJS/ESM experimental warning only) |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

Prior suite was 126 tests / 28 files. This pass added 27 tests / 6 files.

## 23. Path to coverage matrix

`vault/wip/M8_Household_Scenario_Test_Coverage_2026-09-01.md`

## 24. Remaining human browser scenarios

API tests do not prove UI usability. Scott should still click:

- Staff New lead → View details → Schedule trial from real class times
- Attended / No-show buttons appearing only after class start
- Reschedule / Cancel labels on an upcoming intro
- Parent + child public `/trial` picker usability
- `/tasks` “Confirm intros” list readability
- Leads list / Pipeline visual household status (not leftover Trial attended)
- Mobile/responsive household detail
- Dashboard upcoming intros still naming the contact (known gap)

## 25. Final recommendation

**READY FOR HUMAN QA**

Domain lifecycles for household Trial/Follow-Up/Conversion/Lost/display status now have durable scenario coverage, the lost-vs-conversion contradiction is closed, and the automated suite is green. Human QA is still required for button visibility, layout, and the known dashboard/New-lead household gaps.
