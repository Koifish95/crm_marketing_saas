# M8 Household / Lead / Trial / Follow-Up End-to-End Scenario Test Prompt

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Purpose:** Build a comprehensive automated scenario-test suite for the post-M8 household acquisition model  
**Implementation agent:** Cursor  
**Date:** 2026-09-01  
**Business timezone:** `America/Denver`

---

# 1. Objective

Create a comprehensive automated test suite that exercises the acquisition system through realistic end-to-end business scenarios.

The goal is not merely to test isolated services. The goal is to prove that the current post-M8 household model behaves coherently across:

```text
LeadHeader
    ↓
LeadLines
    ↓
Trials
    ↓
Follow-Up Tasks
    ↓
Statuses / household display state
    ↓
Conversion / Lost
    ↓
Forecast / reporting-relevant outcomes
```

The suite must deliberately walk through the major valid lifecycle paths and important edge cases.

The most important questions these tests must answer are:

- Do LeadHeader and LeadLine states remain coherent?
- Do household-level and person-level statuses display as expected?
- Do Trials affect only the correct LeadLine?
- Do Follow-Up tasks consolidate correctly at the household level?
- Do reschedules preserve history and avoid duplicate work?
- Do mixed household outcomes behave correctly?
- Do conversions and lost outcomes interact correctly with open tasks?
- Do sibling LeadLines remain independent?
- Do household display statuses update correctly after every meaningful lifecycle event?
- Do public and staff-created households ultimately behave consistently?
- Are regression behaviors from M4/M5 preserved under the household model?

These tests should become durable regression coverage before M9 schema hardening.

---

# 2. Read Before Implementing

Before creating tests:

1. Read current M8 handoffs.
2. Read the household UX correction handoff.
3. Read the Trial/Follow-Up correction handoff if already present.
4. Inspect existing tests under M4, M5, M7, and M8.
5. Inspect current services for LeadHeader, LeadLine, Trial, FollowUpTask, Conversion, Lost outcome, household display status, forecast/pricing, reporting.
6. Reuse real service/API behavior rather than constructing fake final state directly when possible.
7. Do not duplicate existing tests unnecessarily.
8. Identify coverage gaps and add scenario-level tests that prove behavior across multiple services/workflows.

The intent is scenario coverage, not another layer of shallow unit tests.

---

# 3. Test Style

Prefer readable scenario tests with explicit business-language names, such as:

```text
single adult schedules, reschedules, attends, and converts
parent and child schedule together and household receives one follow-up
one sibling converts while another is lost
no-show then reschedule then attend then convert
all household lines lost closes household
reopening one lost line reactivates household
```

Each scenario should clearly show:

```text
GIVEN
initial household state

WHEN
business action occurs

THEN
expected LeadHeader state
expected LeadLine state
expected Trial state
expected Follow-Up state
expected household display status
expected historical records
```

Use helpers/fixtures where useful, but keep each scenario understandable.

---

# 4. Reusable Assertions

Create reusable assertion helpers if appropriate for:

- household display status;
- LeadLine status;
- active Conversion count;
- active Lost outcome;
- Trial history;
- pending household follow-up count;
- completed follow-up count;
- LeadLine/Trial associations on tasks;
- household terminal/active state;
- forecasted recurring value.

Use the application's canonical household-status logic. Do not invent a separate test-only algorithm.

---

# 5. Scenario Group A — Single-Person Household

## A1 — Adult lead, no Trial

Create one LeadHeader with one SELF LeadLine for Adult BJJ.

Assert:
- one LeadHeader;
- one LeadLine;
- SELF relationship;
- no Trial;
- no Conversion;
- no Lost outcome;
- household remains active/open;
- household display status is appropriate for a new household.

## A2 — Adult schedules first Trial

Schedule a valid Trial.

Assert:
- Trial belongs to correct LeadLine;
- appropriate line/household operational status;
- one relevant pending INITIAL_SCHEDULE household follow-up;
- due date follows the two-business-day rule;
- Trial history contains one scheduled Trial.

## A3 — Adult reschedules before follow-up completed

Assert:
- old Trial CANCELLED;
- new Trial SCHEDULED;
- both remain in history;
- no unnecessary duplicate household phone call;
- pending follow-up stays coherent with the replacement Trial.

## A4 — Adult attends

Mark ATTENDED.

Assert:
- correct Trial becomes ATTENDED;
- household stays active until converted/lost;
- obsolete pending confirmation work is cancelled according to accepted rules;
- history remains intact.

## A5 — Adult converts

Assert:
- exactly one active Conversion;
- line becomes terminal converted/joined;
- household derives correct joined/closed state;
- obsolete pending tasks are handled correctly;
- completed historical tasks remain;
- Conversion snapshot and reporting values are correct.

## A6 — Reverse Conversion

As ADMIN, reverse/correct the Conversion.

Assert:
- historical Conversion evidence is preserved;
- no second active Conversion remains;
- line becomes active/reopenable according to current lifecycle;
- household display status updates coherently.

---

# 6. Scenario Group B — Guardian + Child

## B1 — Guardian contact, child only

Create header as guardian contact and one CHILD LeadLine.

Assert:
- guardian is not incorrectly created as SELF;
- child is the only prospective member;
- contact information remains on header;
- Program belongs to child line.

## B2 — Child schedules, attends, converts

Walk through Schedule → Follow-Up → Attend → Convert.

Assert all Trial/Conversion state belongs to child line and parent remains contact-only.

## B3 — Child marked lost

Assert:
- Lost Reason required;
- Lost outcome belongs to child line;
- household closes appropriately;
- obsolete pending work closes;
- history preserved.

## B4 — Child reopened

Assert:
- prior Lost history remains;
- line active again;
- household active again;
- completed tasks remain historical.

---

# 7. Scenario Group C — Parent + Child Household

## C1 — Parent and child both prospective

Create one header, SELF parent line, CHILD child line, independent Programs.

Assert source/campaign attribution remains household/header-level.

## C2 — Both schedule Trials in same public booking

Assert:
- two Trial rows;
- correct line ownership;
- only one relevant pending household confirmation call;
- task represents both people/Trials;
- no duplicate call to primary contact.

## C3 — Same day, different classes

Assert independent valid class/time values and one coherent shared follow-up.

## C4 — Different dates

Assert independent dates and no ownership crossover.

## C5 — Parent converts, child remains active

Assert:
- parent converted;
- child active;
- household display status is active mixed outcomes or exact canonical equivalent;
- household not closed.

## C6 — Parent converts, child lost

Assert:
- parent Conversion preserved;
- child Lost preserved;
- all lines terminal;
- household display status = `Closed · mixed outcomes` or exact canonical equivalent;
- household must not show stale `Trial attended`.

## C7 — Reopen child

Assert parent remains converted, child reopens, household changes to active mixed outcomes, Lost history remains.

---

# 8. Scenario Group D — Multiple Children

## D1 — Guardian + two children

Assert guardian remains header-only and prospective-member count = 2.

## D2 — Both children schedule together

Assert two Trials and one household confirmation call.

## D3 — One child no-shows, sibling attends

Assert independent Trial states and no sibling contamination.

## D4 — One child converts, sibling no-shows

Assert household remains active and reporting person counts remain correct.

## D5 — Both lost

Assert both Lost outcomes preserved and household closes correctly.

---

# 9. Scenario Group E — Trial Edge Cases

## E1 — No-show → reschedule → attend → convert

Assert:
- first Trial remains NO_SHOW;
- second is a new Trial;
- person counted once per funnel stage;
- no unnecessary duplicate follow-up;
- final Conversion belongs to line.

## E2 — Cancel → new Trial

Assert cancelled Trial preserved, replacement valid, follow-up reconciled.

## E3 — Multiple historical Trials

Create 3+ Trials for one line.

Assert:
- full history preserved;
- next-intro logic selects earliest future SCHEDULED Trial only;
- reporting unique-person metrics do not double-count.

## E4 — Invalid arbitrary staff time

Attempt impossible class/date/time.

Assert:
- server rejects;
- no Trial;
- no Follow-Up;
- no partial state.

## E5 — Transaction rollback

Force Trial creation failure during household booking.

Assert no partial Header/Line/Trial/Follow-Up state remains.

---

# 10. Scenario Group F — Follow-Up Edge Cases

## F1 — One scheduled Trial

One pending initial household call.

## F2 — Two Trials scheduled together

One consolidated pending household call.

## F3 — Add another Trial while compatible pending call exists

No duplicate call; existing pending work associates the new relevant Trial according to current rule.

## F4 — New Trial after prior confirmation completed

Completed task unchanged; new pending call may be created when appropriate.

## F5 — Reschedule one of several linked Trials

No unnecessary duplicate task; shared task remains if relevant.

## F6 — Cancel one linked Trial

Shared task remains if another Trial still requires confirmation.

## F7 — Cancel all linked relevant Trials

Pending shared task becomes obsolete/cancelled.

## F8 — Mixed active/terminal siblings

Converted line should not receive unnecessary confirmation work while active sibling retains relevant work.

---

# 11. Scenario Group G — Household Display Status Matrix

Create a table-driven suite for combinations including:

```text
1 active NEW line
1 TRIAL_SCHEDULED line
1 TRIAL_ATTENDED line
1 converted line
1 lost line

2 active lines
converted + active
lost + active
converted + lost
converted + converted
lost + lost
converted + lost + active
converted + converted + lost
```

Assert the exact canonical household display label for every combination.

Critical examples:

```text
Converted + Lost
→ Closed · mixed outcomes

Converted + Active
→ Active · mixed outcomes
```

The purpose is to prevent future screens from showing arbitrary Trial/LeadLine statuses as household status.

---

# 12. Scenario Group H — Leads List / Pipeline

Test household-facing semantics:

1. one LeadHeader = one row;
2. Prospect count = LeadLine count;
3. one Program household;
4. mixed Programs household;
5. household status matches canonical display status;
6. primary-contact search;
7. LeadLine/person-name search if supported;
8. Program filter matches if ANY line has the Program;
9. Source/Campaign remain header-level;
10. Next Intro = earliest future scheduled Trial across lines;
11. past Trials are ignored;
12. Pipeline does not categorize household using arbitrary person/Trial state.

---

# 13. Scenario Group I — Pricing / Forecast / Conversion

## I1 — Single adult standard forecast

Verify configured standard amount.

## I2 — Household family pricing

Use configured first/additional pricing, not hardcoded assumptions.

Verify household forecast total.

## I3 — Line override

Verify line and household forecast update and override reason persists where applicable.

## I4 — Conversion snapshot

Convert, then change Offering/configuration pricing.

Assert historical Conversion amount does not change.

## I5 — Mixed converted/lost household

Verify forecast/current opportunities and historical Conversion values remain conceptually distinct.

Do not treat actual payment as tracked.

---

# 14. Scenario Group J — Public vs Staff Consistency

Create equivalent household/domain outcomes via:

1. public `/trial`;
2. staff Lead creation + staff Trial scheduling.

Assert materially consistent resulting domain state:

- LeadHeader;
- LeadLines;
- Trial ownership;
- Follow-Up behavior;
- household status;
- attribution differences only where expected.

---

# 15. Scenario Group K — RBAC

Verify at least:

- STAFF can perform operational Trial workflow;
- STAFF can convert where current permissions allow;
- STAFF cannot perform ADMIN-only Conversion reversal;
- VIEWER cannot mutate;
- PUBLIC cannot access internal Lead/Trial/Follow-Up APIs;
- ADMIN can perform configuration/reversal operations.

Preserve M7 behavior.

---

# 16. Scenario Group L — Reporting Regression

Using scenario fixtures, verify:

- household count = LeadHeader count;
- prospective-member count = LeadLine count;
- Trial scheduled = unique qualifying LeadLines;
- Trial attended = unique qualifying LeadLines;
- Conversion = unique converted LeadLines;
- multiple Trials/reschedules do not double-count people;
- mixed outcomes aggregate correctly;
- forecasted MRR sums correctly;
- Conversion snapshot MRR sums correctly;
- Program grouping uses LeadLines;
- Campaign/source grouping rolls through LeadHeader attribution.

---

# 17. Scenario Group M — Invalid / Contradictory State

Attempt invalid state via services/API where possible:

- two active Conversions for one LeadLine;
- Lost and active Conversion simultaneously where prohibited;
- Trial associated to wrong household/line;
- duplicate SELF line where prohibited;
- household closed while active line remains;
- Trial mutation bypassing availability;
- duplicate pending household confirmation tasks for overlapping work.

Assert constraints/services reject or reconcile invalid state.

---

# 18. Test Helpers

Create reusable realistic helpers where useful:

```text
createSingleAdultHousehold()
createGuardianChildHousehold()
createParentChildHousehold()
createTwoChildHousehold()
scheduleValidTrialForLine()
completeHouseholdFollowUp()
convertLine()
markLineLost()
```

Prefer real service/API workflows. Do not hide business logic by directly constructing final database state except when specifically testing lower-level constraints.

---

# 19. Required Coverage Matrix

Create:

```text
vault/wip/M8_Household_Scenario_Test_Coverage_2026-09-01.md
```

Required columns:

```text
Scenario ID
Scenario name
Entry path: Public | Staff | Service
Household shape
Trial path
Follow-Up path
Terminal outcome
Expected household status
Automated test file
Pass/Fail
Notes
```

Include every implemented scenario.

Also include:

```text
Important scenarios NOT automated
```

Explain why each requires human browser QA or is otherwise deferred.

---

# 20. Human-Test Recommendations

After automated tests, provide a concise manual browser checklist focused on:

- actual button visibility;
- labels;
- card/section layout;
- multi-person household usability;
- shared Follow-Up context readability;
- responsive/mobile behavior;
- schedule-picker usability;
- Leads list/Pipeline visual correctness.

Do not claim service/API tests prove UI usability.

---

# 21. Additional Scenario Discovery

After implementing this requested suite, inspect the domain and ask:

> What realistic household acquisition path is still not covered?

Add only high-value missing scenarios.

Prioritize anything likely to expose:

- incorrect household status;
- sibling state contamination;
- duplicate follow-up work;
- Trial-history corruption;
- Conversion/Lost contradictions;
- reporting double-counting;
- public/staff domain inconsistency.

Document additional cases in the coverage matrix.

---

# 22. Do Not Redefine Product Behavior Through Tests

This task is primarily to test the current accepted model.

If a scenario exposes apparently wrong behavior:

1. do not silently rewrite logic just to make the test green;
2. compare against accepted project decisions;
3. document the failure;
4. only fix clear bugs that contradict already accepted rules;
5. if a business rule is genuinely ambiguous, list it for Scott/ChatGPT rather than inventing it.

Tests validate the product; they do not redefine it.

---

# 23. Full QA

Run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Report:

- total test files;
- total tests;
- pass/fail count;
- new scenario tests added;
- regressions found;
- bugs fixed;
- unresolved behavior questions.

---

# 24. Required Technical Handoff

Create:

```text
vault/wip/M8_Household_Scenario_Test_Handoff_2026-09-01.md
```

Include:

1. repository/branch/commit state;
2. purpose of the test pass;
3. existing coverage reviewed;
4. new scenario-test architecture;
5. helpers/fixtures added;
6. scenario groups implemented;
7. household-status matrix results;
8. Trial lifecycle results;
9. Follow-Up consolidation results;
10. mixed household outcome results;
11. Conversion/Lost results;
12. pricing/forecast results;
13. Leads list/Pipeline results;
14. public vs staff consistency results;
15. RBAC results;
16. reporting-regression results;
17. invalid-state/data-integrity results;
18. bugs discovered;
19. bugs fixed;
20. unresolved product questions;
21. tests/files changed;
22. exact QA command results;
23. path to coverage matrix;
24. remaining human browser scenarios;
25. final recommendation:
   - READY FOR HUMAN QA
   - NOT READY FOR HUMAN QA

Do not merely paste console logs.

---

# 25. Final Cursor Response

When complete, report:

- scenario test files created;
- number of scenarios added;
- total test count/pass count;
- key edge cases covered;
- business-rule defects discovered;
- corrections made;
- unresolved behavior questions;
- exact paths to:
  - `vault/wip/M8_Household_Scenario_Test_Coverage_2026-09-01.md`
  - `vault/wip/M8_Household_Scenario_Test_Handoff_2026-09-01.md`
- final Git commit/push status.

The main goal is confidence.

After this pass, future changes to household/Trial/Follow-Up code should fail tests when they accidentally break a real acquisition workflow.
