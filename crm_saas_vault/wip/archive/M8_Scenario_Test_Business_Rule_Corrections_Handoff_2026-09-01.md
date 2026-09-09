---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - handoff
  - household
---

# M8 scenario-test business-rule corrections handoff

Correction pass after the household scenario-test suite. Approved decisions only: one SELF LeadLine per household; Forecast MRR excludes JOINED and LOST; INITIAL_SCHEDULE database uniqueness left unchanged.

## 1. Repository / branch / starting commit / ending commit

- Repository: `renzo_crm`
- Branch: `M8` (tracks `origin/M8`)
- Starting commit: `59b300f` (`Creating more tests`)
- Ending commit: still `59b300f`. This pass is **uncommitted** on the working tree. Do not treat HEAD as containing these corrections until they are committed.

The scenario-test suite from earlier on 2026-09-01 is also still uncommitted on this same working tree.

## 2. Approved decisions implemented

1. A household may contain **at most one** LeadLine with relationship `SELF`.
2. **JOINED** and **LOST** LeadLines contribute **$0** to active Forecast MRR. Conversion Snapshot MRR stays on the Conversion row. Actual collected revenue remains out of scope.
3. `follow_up_tasks_pending_initial_unique` remains a partial unique on `trialId`. Application-level household consolidation is unchanged. Database redesign is deferred to M9/PostgreSQL.

Attended/No-show timing was **not** changed.

## 3. Duplicate SELF root cause

Public `/trial` already rejected more than one SELF (Zod `publicHouseholdTrialSchema` plus `bookPublicHousehold`). Staff `addLeadLineToHousehold` / `insertLeadLine` did not. Staff Add Person could create `SELF` + `SELF` in one household while the public path could not.

## 4. Final SELF invariant

A LeadHeader may contain at most one LeadLine whose relationship is `SELF`.

SELF means that prospective member is the primary contact represented by the LeadHeader. Additional prospective members use `CHILD`, `SPOUSE`, or `OTHER`. Guardian-only households may contain **zero** SELF lines.

Existing development data was not rewritten.

## 5. Enforcement locations

Server/domain (authoritative):

- `assertSingleSelfLine` in `server/services/lead-lines.ts`
- Called from `insertLeadLine` (staff Add Person, staff New Lead default line, public `insertLeadLine` inside `bookPublicHousehold`)
- Called from `updateLeadLine` with `exceptLineId` so the existing SELF line can be edited, but another line cannot become SELF
- Public request still rejected by `shared/schemas/intro.ts` and `bookPublicHousehold` (`The primary contact can only be booked once.`)
- Staff HTTP: `POST /api/leads/:id/lines` and `PATCH /api/leads/:id/lines/:lineId` surface the domain error as HTTP 400

Message: `This household already has a primary contact (Self). Additional people must be Child, Spouse, or Other.`

## 6. UI behavior for Add Person

On Lead detail (`app/pages/leads/[id].vue`):

- Add Person relationship defaults to Child.
- Once a SELF line exists, the Self option is omitted and a hint explains that Self is already the primary contact.
- A watcher forces the selector off SELF if a SELF line is already present.

Hiding Self is convenience. The server still rejects a second SELF.

There is no in-page relationship editor for existing lines. PATCH remains protected anyway.

## 7. Forecast root cause

`forecastHousehold` priced every LeadLine that had an Offering or override, including LOST (and JOINED) lines. Pipeline totals therefore still included people who were no longer available to convert.

## 8. Final Forecast MRR definition

Forecast MRR is the recurring monthly value of acquisition opportunities **still available to convert**.

- Open / active LeadLines with a price contribute.
- JOINED / active Conversion LeadLines contribute **$0**.
- LOST LeadLines contribute **$0**.

Household first/additional rules, offering prices, and line overrides still apply when computing an open line’s amount. Ranking among priced lines in a program is **unchanged** (JOINED/LOST lines with a price still occupy a first/additional slot). Only eligibility for the **total** changed. Converting a remaining additional adult after the first adult has JOINED still snapshots additional-member price (Adult BJJ $155 in seed data), not a re-ranked first-member $175.

## 9. Final Conversion Snapshot MRR definition

Conversion Snapshot MRR is the integer-cent `conversions.monthlyCents` captured at join time. It is historical and immutable except for ADMIN reversal (the row is retained with `reversedAt`). Catalog price changes do not rewrite it. It is not added back into Forecast MRR.

## 10. Actual revenue remains out of scope

No payments, billing, invoices, AR, cash receipts, collections, or recognized revenue were added. User-facing copy avoids “Revenue” for these figures. Neither Forecast MRR nor Conversion Snapshot MRR means cash collected.

## 11. Canonical forecast implementation changed

`server/services/forecast.ts` (`forecastHousehold`).

Consumers inherit the same engine: Lead detail `GET /api/leads/:id/forecast`, conversion snapshot source amounts, and any other caller of `forecastHousehold`. Leads list, dashboard period totals, and Reports/CSV do **not** compute pipeline Forecast MRR themselves. Dashboard / Reports `newMrrCents` remain **Conversion Snapshot MRR** for the period.

New line field: `includedInForecast`.

## 12. User-facing forecast / MRR labels changed

| Surface | Before (misleading or mixed) | After |
|---|---|---|
| Lead detail household panel title amounts | Forecasted monthly recurring value (JOINED/LOST still priced) | **Forecast MRR** copy: open opportunities only; JOINED/LOST excluded; not cash |
| LeadLine card amount | Shown for terminal lines too | Hidden when the line is JOINED/LOST; remaining cards say **Forecast MRR** |
| LeadLine conversion block | `Conversion $X/mo` | **Converted MRR $X/mo** plus existing snapshot note |
| Dashboard conversions hint | Forecasted monthly | `$X converted MRR this month` |
| Reports headline stat | New MRR / mixed | **New converted MRR** — snapshots, not pipeline forecast or cash |
| Reports source/program/offering/Meta tables | MRR | **Converted MRR** |
| Reports offering panel | offering MRR | Converted MRR by membership offering; snapshot values, not pipeline forecast |
| `REPORT_FORMULAS.periodMrr` | period MRR | Conversion Snapshot MRR wording |

**Not renamed (documented, not a product decision this pass):**

- CSV machine columns `newMrrCents` / `monthlyCents` (values are Conversion Snapshot MRR)
- Catalog page “forecasted acquisition value” (list prices, not pipeline Forecast MRR)
- Lead detail “Forecasted enrollment / upfront value”

## 13. Reporting / export effects

Reports and CSV still sum Conversion snapshots (`newMrrCents` / `monthlyCents`) for joins in range. They never treated LOST offering prices as period MRR. After this pass they also do not contradict Forecast MRR: a lost child’s $150 is not Forecast MRR and is not Conversion Snapshot MRR unless that child actually converted.

Lost/JOINED lines no longer inflate household Forecast MRR on Lead detail. Period converted MRR is unchanged in meaning.

## 14. Tests added / changed

**Added** `tests/m8/scenarios-self-forecast-rules.test.ts` (7 tests):

SELF: no-SELF household can add SELF; guardian-only zero SELF; staff rejects second SELF; CHILD/SPOUSE/OTHER remain valid; staff HTTP POST/PATCH reject second SELF; public booking still rejects two SELF members; relationship update to SELF rejected when SELF exists.

Forecast: active standard, household, and override prices; JOINED $0; LOST $0; converted + remaining open; converted + all remaining lost = $0; snapshot frozen through offering change; reports/CSV keep the Conversion snapshot; reopen LOST restores forecast; reverse Conversion restores forecast; all-lost $0; all-converted $0.

**Changed** (expectations, not deleted coverage):

- `tests/m8/scenarios-list-forecast-report.test.ts` I5: mixed converted+lost household Forecast MRR is **$0** (was “still includes priced LOST”).
- `tests/m8/scenarios-rbac-integrity.test.ts` M4/M6: second SELF is **rejected**; leftover pending-initial consolidation uses a **SPOUSE** line.

**Kept** household confirmation tests in `tests/m8/scenarios-follow-up.test.ts` and `tests/m8/household-follow-up.test.ts`: overlapping pending consolidates; completed history permits a later new call; reschedule does not duplicate; cancel-one keeps the shared task; cancel-all cancels obsolete pending work.

## 15. INITIAL_SCHEDULE DB constraint decision

Unchanged. `follow_up_tasks_pending_initial_unique` remains:

```
UNIQUE(trialId) WHERE purpose = 'INITIAL_SCHEDULE' AND status = 'PENDING' AND trialId IS NOT NULL
```

Application code still consolidates overlapping pending household confirmation work.

## 16. Why UNIQUE(leadId) was not added

A household legitimately needs **multiple** INITIAL_SCHEDULE tasks over its lifetime. Example: September 1 Trial → confirmation call, call completed September 2, September 20 a new child Trial → a **new** household confirmation is valid. `UNIQUE(leadId)` would block that.

## 17. M9 / PostgreSQL hardening note

During M9, evaluate a **precise** database invariant (partial unique on pending household confirmation, transactional locking, or other PostgreSQL protection). Do not guess that implementation now. Recorded on [[Milestones]] and [[Database]].

## 18. Unresolved Attended / No-show timing question

Unchanged. Staff UI still shows Attended/No-show when `scheduledAt <= now`. Whether class-day-before-start should be allowed remains a human-QA / product discussion item. Not answered here.

## 19. Files changed (this correction pass)

Domain / API:

- `server/services/lead-lines.ts`
- `server/services/forecast.ts`
- `server/services/reports.ts` (formula wording)
- `server/api/leads/[id]/lines/index.post.ts`
- `server/api/leads/[id]/lines/[lineId].patch.ts`

UI:

- `app/pages/leads/[id].vue`
- `app/pages/dashboard.vue`
- `app/pages/reports/index.vue`

Tests:

- `tests/m8/scenarios-self-forecast-rules.test.ts` (new)
- `tests/m8/scenarios-list-forecast-report.test.ts`
- `tests/m8/scenarios-rbac-integrity.test.ts`

Vault:

- `vault/CRM.md`, `vault/Decisions.md`, `vault/Domain-Model.md`, `vault/Database.md`, `vault/Implementation-State.md`, `vault/Milestones.md`, `vault/Home.md`
- `vault/wip/M8_Household_Scenario_Test_Coverage_2026-09-01.md`
- `vault/wip/M8_Household_Scenario_Test_Handoff_2026-09-01.md` (supersession notes)
- this file

Earlier uncommitted scenario-pass files (helpers, other `scenarios-*.test.ts`, conversion lost-guard, extra Nitro h3 imports) remain on the working tree from the previous pass; they are not re-listed as this correction’s exclusive diffs.

## 20. Schema / migrations changed

**None.** No `pnpm db:generate` / `pnpm db:migrate`. No rewrite of existing household rows.

## 21. `pnpm test`

**160 passed** (35 files). Duration ~158s. Baseline before this correction pass was 153 / 34. No regression of that baseline; 7 tests added in the new file.

## 22. `pnpm lint`

Passed. Node CJS/ESM experimental warning from ESLint only (known; not a failure).

## 23. `pnpm typecheck`

Passed (`nuxt typecheck`).

## 24. `pnpm build`

Passed (`nuxt build` / Nitro node-server). Client and server built; “Build complete.”

## 25. Remaining human QA

API tests are not browser QA. Still needed:

- Add Person: Self disappears after a SELF exists; submitting Self via API still 400
- Lead detail Forecast MRR drops after convert/lost; Converted MRR snapshot remains
- Reports / dashboard “converted MRR” vs Lead detail “Forecast MRR”
- Attended/No-show still gated on class start (unchanged)
- Public `/trial` still cannot book two different people as Self
- Staff New lead remains a one-person form (known gap; not this pass)
- Dashboard upcoming intros still named as header contact (known gap)
- No Playwright; UI was not clicked in a real browser this session

## 26. Additional issues discovered but not changed

- Attended/No-show before class start: left as-is.
- CSV column names still `newMrrCents` / `monthlyCents` (Conversion Snapshot values; renaming would break exports).
- Catalog “forecasted acquisition value” is list-price copy, not pipeline Forecast MRR. Left as-is rather than inventing a catalog rename.
- After the first adult converts, a remaining adult **without** an override still prices as additional-member ($155) because JOINED lines still occupy household ranking slots. Totals exclude them. Documented in §8; not a new product rule.
- Whether LOST lines should also drop out of first/additional **ranking** (not just the total) was not decided. Current engine keeps ranking unchanged.
- Staff New lead is still one person per submit.
- Dashboard pipeline counts remain header-oriented.
- Race inserting two pending INITIAL_SCHEDULE rows is still possible at the DB unique-on-`trialId` layer; app reconciles.

Do not treat any of those as implemented rules.
