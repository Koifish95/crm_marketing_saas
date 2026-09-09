---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - tests
---

# M8 household scenario test coverage

Pass/fail below is from the 2026-09-01 scenario-test pass. Service/API tests do not prove UI usability.

| Scenario ID | Scenario name | Entry path | Household shape | Trial path | Follow-Up path | Terminal outcome | Expected household status | Automated test file | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Adult lead, no Trial | Staff | 1 SELF Adult | none | none | open | New | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Also covered by `household.test.ts` |
| A2 | Adult schedules first Trial | Staff | 1 SELF Adult | valid slot | 1 pending INITIAL_SCHEDULE | open | Trial scheduled | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Due date = two business days 5pm Denver |
| A3 | Adult reschedules before follow-up completed | Staff | 1 SELF Adult | cancel+new | same pending task | open | Trial scheduled | `tests/m8/scenarios-lifecycle.test.ts` | Pass | History keeps CANCELLED row |
| A4 | Adult attends | Staff | 1 SELF Adult | ATTENDED | pending cancelled | open | Trial attended | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Household not closed |
| A5 | Adult converts | Staff | 1 SELF Adult | attended then convert | none pending | JOINED | Joined | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Snapshot 17500 cents |
| A6 | Reverse Conversion | Service/ADMIN | 1 SELF Adult | history kept | n/a | reopened | Trial attended | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Conversion row retained with reversedAt |
| B1 | Guardian contact, child only | Staff | header + 1 CHILD | none | none | open | New | `tests/m8/scenarios-lifecycle.test.ts` | Pass | No fake SELF parent line |
| B2 | Child schedules, attends, converts | Staff | header + 1 CHILD | child-owned | 1 household call then cancelled | JOINED | Joined | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Contact remains header |
| B3 | Child marked lost | Staff | header + 1 CHILD | after reverse | obsolete closed | LOST | Lost | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Lost reason required |
| B4 | Child reopened | Staff | header + 1 CHILD | history kept | completed history unchanged | open | Contacted | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Lost outcome reopenedAt set |
| C1 | Parent and child both prospective | Staff | SELF + CHILD | none yet | none | open | New | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Source on header |
| C2 | Both schedule Trials | Staff | SELF + CHILD | two Trials | one pending, two intros | open | Trial scheduled | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Also `household-follow-up.test.ts` |
| C3 | Same day, different classes | Staff | SELF + CHILD | independent slots same date | shared pending | open | Trial scheduled | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Adult Gi + kids class same Denver date |
| C4 | Different dates | Staff | SELF + CHILD | parent rescheduled | same pending | open | Trial scheduled | `tests/m8/scenarios-lifecycle.test.ts` | Pass | No ownership crossover |
| C5 | Parent converts, child active | Staff | SELF + CHILD | parent ATTENDED | child still scheduled | mixed | Active · mixed outcomes | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Household not closed |
| C6 | Parent converts, child lost | Staff | SELF + CHILD | mixed | obsolete if no scheduled left | closed mixed | Closed · mixed outcomes | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Must not show Trial attended |
| C7 | Reopen child | Staff | SELF + CHILD | parent JOINED | n/a | mixed open | Active · mixed outcomes | `tests/m8/scenarios-lifecycle.test.ts` | Pass | Lost history remains |
| D1 | Guardian + two children | Staff | header + 2 CHILD | none | none | open | New | `tests/m8/scenarios-edges.test.ts` | Pass | Prospect count 2 |
| D2 | Both children schedule together | Staff | 2 CHILD | two Trials | one household call | open | Trial scheduled | `tests/m8/scenarios-edges.test.ts` | Pass | |
| D3 | One no-show, sibling attends | Staff | 2 CHILD | independent | cancelled when none remain scheduled | open | No-show (header) | `tests/m8/scenarios-edges.test.ts` | Pass | Sibling states independent |
| D4 | One converts, sibling no-shows | Staff | 2 CHILD | mixed | n/a | mixed open | Active · mixed outcomes | `tests/m8/scenarios-edges.test.ts` | Pass | Report people=2 converted=1 |
| D5 | Both lost | Staff | 2 CHILD | after reverse of joined child | n/a | LOST | Lost | `tests/m8/scenarios-edges.test.ts` | Pass | Both Lost outcomes kept |
| E1 | No-show → reschedule → attend → convert | Staff | 1 SELF | 2 Trials | new pending after no-show | JOINED | Joined | `tests/m8/scenarios-edges.test.ts` | Pass | Funnel unique person = 1 |
| E2 | Cancel → new Trial | Staff | 1 SELF | CANCELLED + SCHEDULED | new pending | open | Trial scheduled | `tests/m8/scenarios-edges.test.ts` | Pass | |
| E3 | Multiple historical Trials | Service | 1 SELF | 3 Trials | consolidated pending | open | Trial scheduled | `tests/m8/scenarios-edges.test.ts` | Pass | next-intro = earliest future SCHEDULED |
| E4 | Invalid arbitrary staff time | Staff | 1 SELF | rejected | none | open | New | `tests/m8/scenarios-edges.test.ts` | Pass | No partial state |
| E5 | Transaction rollback | Public | parent+child | forced fail | none leftover | n/a | n/a | `tests/m8/scenarios-edges.test.ts` | Pass | Also `public-household-booking.test.ts` |
| F1 | One scheduled Trial | Staff | 1 SELF | 1 | 1 pending | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F2 | Two Trials together | Public | SELF + CHILD | 2 | 1 pending, 2 intros | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F3 | Add Trial while pending exists | Staff | SELF + CHILD | 2 sequential | absorb | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | dueAt unchanged in prior suite |
| F4 | New Trial after completed confirmation | Staff | SELF + CHILD | sequential | new pending, old COMPLETED | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F5 | Reschedule one of several | Public | SELF + CHILD | reschedule | same task | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F6 | Cancel one linked Trial | Public | SELF + CHILD | cancel parent | shared remains | open | Trial scheduled | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F7 | Cancel all relevant Trials | Public | SELF + CHILD | cancel both | pending CANCELLED | open | operational | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| F8 | Mixed active/terminal siblings | Public | SELF + CHILD | convert parent | keep for child | mixed | Active · mixed outcomes | `tests/m8/scenarios-follow-up.test.ts` | Pass | |
| G | Display status matrix | Unit + Staff | combinations | n/a | n/a | various | exact labels | `tests/m8/scenarios-status-matrix.test.ts` | Pass | Uses `householdDisplayStatus` |
| H1–H12 | Leads list / Pipeline | Staff | mixed | past+future | n/a | open | derived | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | Also `leads-list-household.test.ts` |
| I1 | Single adult standard forecast | Staff | 1 Adult | none | n/a | open | New | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | 17500 from catalog |
| I2 | Household family pricing | Staff | 2 Adult | none | n/a | open | New | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | 17500+15500 rule |
| I3 | Line override | Staff | 2 Adult | none | n/a | open | New | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | Military 10000 |
| I4 | Conversion snapshot frozen | Staff | 2 Adult | convert then price change | n/a | mixed | mixed | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | Also `conversion.test.ts` |
| I5 | Mixed converted/lost vs forecast | Staff | 2 Adult | convert+lost | n/a | mixed closed | Closed · mixed | `tests/m8/scenarios-list-forecast-report.test.ts` plus `tests/m8/scenarios-self-forecast-rules.test.ts` | Pass | **Corrected:** LOST and JOINED contribute $0 to Forecast MRR; Conversion snapshot remains |
| J | Public vs staff consistency | Public + Staff | SELF + CHILD | both schedule | one pending each | open | Trial scheduled | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | UTM only on public |
| K | RBAC Trial/convert/reverse | HTTP | 1 SELF | STAFF workflow | n/a | reverse | Trial attended after reverse | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | VIEWER 403, public 401, STAFF cannot reverse |
| L | Reporting unique people | Public | SELF + CHILD | reschedule+attend+convert+lost | n/a | closed mixed | Closed · mixed | `tests/m8/scenarios-list-forecast-report.test.ts` | Pass | Also `reporting.test.ts` |
| M1 | Two active Conversions | Service | 1 SELF | convert twice | n/a | JOINED | Joined | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | Unique index + DomainError |
| M2 | Lost while converted | Service | 1 SELF | convert then lost | n/a | JOINED | Joined | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | **Bug fixed this pass** |
| M3 | Trial on wrong household | Service | two headers | invalid line id | none | open | New | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | |
| M4 | Duplicate SELF | Staff | 2 SELF attempted | n/a | n/a | open | New | `tests/m8/scenarios-self-forecast-rules.test.ts` plus `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | **Corrected:** second SELF is rejected on staff service and HTTP; public already rejected |
| M5 | closedAt while active sibling | Staff | SELF + SPOUSE | convert one | n/a | mixed | Active · mixed | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | |
| M6 | Leftover duplicate pending initials | Service | SELF + SPOUSE | extra insert | reconcile to 1 | open | Trial scheduled | `tests/m8/scenarios-rbac-integrity.test.ts` | Pass | Unique index is still per trialId (intentionally unchanged; M9) |
| M7 | Trial bypassing availability | Service | 1 SELF | `createTrial` raw datetime | creates follow-up | open | Trial scheduled | existing `household.test.ts` | Pass | Staff HTTP rejects; internal helper remains |

## Important scenarios NOT automated

| Scenario | Why deferred |
|---|---|
| Attended / No-show button visibility after class time | Vue gating (`scheduledAt <= now`); needs browser |
| Schedule-picker date-first usability | Human UI; prior `/trial` date bugs were UI-only |
| Compact LeadLine cards vs focused intro layout | Visual IA |
| Follow-up queue “Confirm intros” readability on `/tasks` | UI copy/layout |
| Leads list / Pipeline visual columns | Service coverage exists; rendering is human |
| Dashboard upcoming intros still named as contact | Known UX gap; not this suite’s product change |
| Staff New lead still one-person form | Known UX gap |
| Responsive/mobile household detail | Browser |
| Race inserting two pending INITIAL_SCHEDULE rows | Unique index is per `trialId` by design this pass; app reconciles after the fact. M9/PostgreSQL may evaluate a precise partial unique or locking strategy — not `UNIQUE(leadId)`. |
| Holiday/exception calendar interaction beyond existing M4 tests | Covered in M4 intro tests, not re-walked here |

## Additional high-value cases

- Duplicate SELF: **OLD** staff add-person allowed a second SELF; **NEW** rejected consistently (public, staff service, staff HTTP, relationship PATCH). Guardian-only households may still have zero SELF.
- Forecast MRR: **OLD** priced LOST lines that still had an Offering; **NEW** JOINED and LOST contribute $0 to active Forecast MRR. Conversion Snapshot MRR is unchanged historical value. Actual collected revenue remains out of scope.
- `tests/m8/scenarios-self-forecast-rules.test.ts` covers the corrected SELF and Forecast MRR rules, including reopen/reverse restoring forecast and reports/CSV using Conversion Snapshot MRR.
- Converted line cannot be marked lost until Conversion reversal (`M2` fix from the scenario pass).
- INITIAL_SCHEDULE database uniqueness: **UNCHANGED**. Still partial unique on `trialId`. Application-level household consolidation remains. Deferred to M9/PostgreSQL hardening.
