# M8 UX Correction Pass — Household Booking + Lead Detail Restructure

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone context:** M8 V2 correction pass  
**Implementation agent:** Cursor  
**Date:** 2026-09-01  
**Primary objective:** Fix the public booking and internal Lead-detail UX so the implemented `LeadHeader` / `LeadLine` household model is actually usable and understandable.

---

# 1. Why this correction exists

M8 V2 correctly introduced a household-oriented data model:

```text
LeadHeader
├── shared household/contact information
├── source / campaign / attribution
├── shared follow-up relationship
└── LeadLines[]
      ├── prospective member A
      ├── prospective member B
      └── prospective member C
```

However, browser review exposed that the UI still behaves like the old model where one Lead = one prospective person.

Two major UX defects are now clear:

1. Public `/trial` still begins with a program choice like:

```text
Adult Jiu-Jitsu
Kids Jiu-Jitsu
```

That no longer works for a household where a parent wants to book for both themselves and a child.

2. Internal Lead detail now exposes too many line/header/task/trial controls at once and reads like a dense form rather than a household record with distinct prospective-member lines.

This correction should **preserve the M8 V2 schema and business logic** unless a concrete implementation defect requires a narrow adjustment.

Do not redesign the data model from scratch.

---

# 2. Read before editing

Before changing code:

1. Read `M8_V2_Functional_Completion_Household_Reporting_Meta_Cursor_Prompt_2026-08-31.md`.
2. Read `M8_V2_Implementation_Handoff.md`.
3. Inspect the current `/trial` implementation.
4. Inspect current Lead detail page and LeadLine components/services.
5. Inspect current Trial, Follow-Up, Conversion, Lost, forecast/pricing, and attribution services.
6. Inspect existing M4/M5/M8 tests.
7. Confirm current branch and working tree.
8. Preserve all accepted server-side business rules.

Repository reality is authoritative for implementation details.

---

# 3. Scope

This pass focuses on:

- public `/trial` booking UX,
- household + multiple-person booking,
- internal LeadHeader / LeadLine information architecture,
- reducing Lead-detail clutter,
- preserving line-level outcomes,
- preserving header-level contact/follow-up semantics,
- clarifying header status behavior,
- regression testing around the changed UI/workflow.

Do **not** modify Reports, Catalog, Campaigns, or Meta beyond what is strictly necessary for regression compatibility in this pass.

Those areas will be reviewed separately afterward.

---

# 4. Public `/trial` — new first-step model

The first choice should no longer be Adult vs Kids.

Replace the current opening decision with a household-size/booking-shape decision.

Recommended customer-facing wording:

```text
Who would you like to book for?

[ One person ]
[ Multiple family members ]
```

Avoid internal jargon such as `LeadHeader`, `LeadLine`, or `Household record` on the public form.

Use friendly language.

---

# 5. Public `/trial` — One person flow

For **One person**:

```text
Who would you like to book for?
      ↓
One person
      ↓
Contact information
      ↓
Prospective member information
      ↓
Program selection
      ↓
Date
      ↓
Eligible class/time
      ↓
Consent
      ↓
Submit
```

The person may be:

- the contact themselves,
- a child whose parent/guardian is the contact.

The UI should handle both cleanly.

If the participant is the contact, create a `SELF` LeadLine.

If the contact is only the guardian, create the guardian/contact on the LeadHeader and the participant as a `CHILD` LeadLine.

Do not create fake prospective-member lines for non-participating guardians.

---

# 6. Public `/trial` — Multiple family members flow

For **Multiple family members**:

Start with shared household/contact information.

Then allow adding one or more prospective members.

Conceptually:

```text
Primary contact
├── First name
├── Last name
├── Phone
└── Email

Prospective members
├── Person 1
│   ├── First name
│   ├── Last name
│   ├── Relationship
│   ├── Program
│   ├── Date
│   └── Eligible class/time
│
├── Person 2
│   ├── First name
│   ├── Last name
│   ├── Relationship
│   ├── Program
│   ├── Date
│   └── Eligible class/time
│
└── [ Add another person ]
```

The UI must support the primary contact also being a prospective member.

Provide a simple option such as:

```text
[ ] I am also participating
```

or an equivalent clear interaction.

If selected, create a `SELF` line using the contact's identity and allow Program/Trial selection for that person.

Do not duplicate the contact manually when the self-participant option is used.

---

# 7. Public `/trial` — program and class selection

Program selection is now **per prospective member**.

Do not force one Program for the whole household.

Each LeadLine can independently choose:

```text
Adult Jiu-Jitsu
Kids Jiu-Jitsu
other active eligible Programs
```

Then only show valid dates/classes for that line's Program/age/eligibility using the accepted M4 availability rules.

The existing date-first, valid-slot behavior remains authoritative.

No arbitrary class/time input.

---

# 8. Public `/trial` — atomicity

Household booking must be transactional.

A successful submission should conceptually commit:

```text
LeadHeader
+
LeadLine 1
+ Trial 1 where selected
+
LeadLine 2
+ Trial 2 where selected
+
...
+
required FollowUpTask workflow
+
Campaign / attribution data
```

If required creation fails partway through, do not leave a partial household with only some people/trials/tasks created.

Reuse existing transaction/service architecture.

Add a failure-path automated test.

---

# 9. Public `/trial` — attribution

Preserve M8 attribution behavior.

Campaign/tracking/UTM attribution belongs on the LeadHeader.

All LeadLines under that household must remain reportable through the header relationship.

Do not duplicate UTMs onto every line unless existing implementation already requires it for a specific technical reason.

---

# 10. Public `/trial` — confirmation

The confirmation state should acknowledge the household booking clearly.

For multiple people, summarize each booked person and class/date/time.

Example conceptually:

```text
You're booked.

Matt Smith
Adult Jiu-Jitsu — Tuesday 6:00 PM

Sam Smith
Kids Jiu-Jitsu — Wednesday 5:00 PM

We'll follow up using the contact information you provided.
```

Do not expose internal IDs.

---

# 11. Internal Lead detail — redesign principle

The Lead detail page should feel like a **household/business document**, not one giant edit form.

The user should immediately understand:

1. Who is this household/contact?
2. Who are the prospective members?
3. Where is each person in the funnel?
4. What is the household forecast?
5. What follow-up work exists?

Do not show every editable field for every line simultaneously by default.

---

# 12. Lead detail — top/header section

Create a strong LeadHeader summary area at the top.

Conceptually:

```text
------------------------------------------------------------
HOUSEHOLD / LEAD
------------------------------------------------------------
Matt Smith Household                         Active

Primary Contact
Matt Smith
801-555-1234
matt@example.com

Source        Campaign
Meta          Summer Trial Campaign

Created       Household Status
Sep 1         Active

[ Edit household ]  [ Add person ]  [ Add follow-up ]
------------------------------------------------------------
```

Use current M6 design primitives.

The exact layout can adapt to responsive constraints, but the information hierarchy should remain clear.

---

# 13. Lead detail — household status

The current prominent generic header `Status` selector is dangerous in a multi-line household because household members can have different outcomes.

Example:

```text
Dad      → Converted
Son      → Lost
Daughter → Trial Scheduled
```

Therefore:

- household status should be primarily **derived/display-oriented**,
- line-level actions should drive Converted/Lost outcomes,
- do not encourage staff to casually set the entire household to JOINED/LOST,
- preserve any compatibility behavior required by the backend only where necessary,
- remove or demote misleading header-level outcome controls from the primary UI.

If legacy single-line header status editing must remain temporarily for compatibility, it should not dominate the multi-line workflow.

Document any remaining compatibility behavior in the handoff.

---

# 14. Lead detail — Prospective Members section

Below the header, add a dedicated **Prospective Members** section.

Each LeadLine should appear as a clear card/row.

Conceptually:

```text
PROSPECTIVE MEMBERS

Matt Smith
SELF | Adult Jiu-Jitsu | Trial Scheduled
Forecast: $175/mo

[ View details ] [ Schedule / Reschedule ] [ Convert ] [ Mark lost ]

------------------------------------------------------------

Sam Smith
CHILD | Kids Jiu-Jitsu | Trial Scheduled
Forecast: $150/mo

[ View details ] [ Schedule / Reschedule ] [ Convert ] [ Mark lost ]
```

At-a-glance line data should include where available:

- name,
- relationship,
- Program,
- current line status/outcome,
- next/current Trial,
- Offering,
- forecasted monthly amount,
- concise action buttons.

Do not expose all detail fields inline.

---

# 15. LeadLine detail interaction

Clicking/viewing a LeadLine should reveal focused detail using one of:

- expandable section,
- drawer/panel,
- modal,
- dedicated nested route,

whichever best matches current architecture and M6 design.

The focused line detail should contain concepts such as:

```text
Person
Program
Offering
Pricing / discount
Trials
Outcome
Conversion
Lost reason
Line notes
```

Do not make staff scroll through all other household lines to operate on one person.

Prefer a clear focused interaction over dense inline editing.

---

# 16. Lead detail — household forecast

Keep a household-level acquisition forecast summary, but make it visually separate from individual line details.

Show concepts such as:

```text
Forecasted monthly recurring value
Forecasted enrollment/upfront value
```

Make it explicit that this is forecasted acquisition value, not collected cash.

Individual LeadLine cards may also show their own forecasted monthly amount.

---

# 17. Lead detail — Follow-Up

Follow-Up remains primarily household/header level.

Place it in a dedicated household section after the prospective-member section.

Show:

- open/pending tasks,
- due state,
- assignee,
- linked line(s) where applicable,
- completion controls,
- completed history in a less prominent view.

Do not interleave Follow-Up controls inside every LeadLine card unless the task is clearly line-specific.

---

# 18. Lead detail — Trials

Trials are line-specific.

Present Trials inside the relevant LeadLine detail or grouped clearly by person.

Do not show one ambiguous household Trial list without obvious line ownership.

Preserve:

- schedule,
- reschedule,
- attended,
- no-show,
- cancel,
- history.

---

# 19. Lead detail — Notes

Differentiate:

- household/shared notes,
- line-specific notes.

Household notes belong in a shared LeadHeader section.

Line notes belong in the focused LeadLine detail.

Do not make these concepts visually ambiguous.

---

# 20. Lead detail — attribution

Show attribution/campaign information at the household/header level.

Do not repeat the same source/campaign/UTM data on every line.

A compact summary is sufficient on the main page.

Deeper campaign detail can remain on Campaign/Reports pages.

---

# 21. Add-person workflow

From the LeadHeader page, staff should be able to add another prospective member cleanly.

`Add person` should collect only line-specific data:

- name,
- relationship,
- Program,
- DOB/age where applicable,
- Offering if appropriate,
- optional line note.

Do not ask for household contact/source/campaign fields again.

After creation, the new line should appear in Prospective Members.

---

# 22. Responsive/mobile behavior

The Lead detail currently becomes extremely dense.

This correction must improve narrow-width/mobile usability.

Requirements:

- header stacks cleanly,
- line cards remain readable,
- actions wrap intelligently,
- no horizontal overflow,
- focused line detail is usable on mobile,
- public multi-person booking remains understandable on mobile.

Do not solve desktop layout by creating unusable mobile forms.

---

# 23. Preserve server-side rules

Do not move business logic into Vue just to simplify the UI.

Server remains authoritative for:

- Trial availability,
- LeadLine ownership,
- conversion/lost rules,
- follow-up creation/cancellation,
- pricing/forecast calculations,
- household closure,
- attribution persistence,
- RBAC,
- transactional behavior.

The UI should call existing/shared server workflows.

---

# 24. Automated tests — public household booking

Add/update tests for:

1. One-person adult booking.
2. Parent-only contact + child booking.
3. Primary contact participating as SELF.
4. Primary contact + one child both participating.
5. Multiple children under one contact.
6. Different Programs in the same household.
7. Each person gets the correct eligible Trial.
8. Multiple lines persist under one LeadHeader.
9. Required Follow-Up workflow is created correctly.
10. Attribution remains on LeadHeader.
11. Transaction rollback on partial failure.
12. No fake guardian line when guardian is not participating.
13. No duplicate SELF line when contact participates.

---

# 25. Automated tests — Lead detail / status behavior

Add/update tests for:

- multi-line household API response shape,
- mixed outcomes,
- derived/appropriate household status,
- line-level Convert/Lost actions,
- one active line while sibling terminal,
- all lines terminal,
- reopen Lost line,
- add person,
- line-specific Trials,
- household Follow-Up with optional line linkage,
- household notes vs line notes where APIs differ,
- legacy single-line compatibility where intentionally retained.

---

# 26. Regression requirements

Run all existing M4/M5/M7/M8 tests.

Explicitly verify no regression to:

- date-first availability,
- server-side slot validation,
- rescheduling,
- Follow-Up task idempotency,
- Overdue / Due Today / Upcoming semantics,
- conversion snapshots,
- lost/reopen,
- pricing/forecast logic,
- Campaign attribution,
- reporting APIs,
- RBAC/security.

---

# 27. Manual/browser QA required by Cursor if possible

If the environment supports browser testing, exercise at minimum:

## Public

- one-person Adult booking,
- one-person Kids booking,
- parent + child,
- parent + child where parent also joins,
- two children,
- different Programs,
- mobile width.

## Internal Lead

- open multi-line household,
- verify header clarity,
- verify line cards,
- open one line detail,
- schedule/reschedule Trial,
- convert one line,
- mark sibling Lost,
- verify mixed household state,
- add another line,
- verify Follow-Up layout,
- verify forecast summary,
- mobile width.

If browser QA cannot be run, say so explicitly in the handoff.

---

# 28. Quality gates

Before completion run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also run migration/schema checks if changed.

Do not report ready with failing gates unless a failure is demonstrably external and documented.

---

# 29. Git discipline

- Work only on the intended M8 branch/current correction branch.
- Inspect status before editing.
- Do not reset unrelated work.
- Do not commit secrets.
- Do not commit `vault/.obsidian/*` local state.
- Keep this correction focused.
- Commit and push the correction when complete.

---

# 30. Explicit non-goals for this correction

Do not use this pass to redesign:

- Reports,
- Catalog,
- Campaigns,
- Meta,
- PostgreSQL,
- Docker/Pi deployment,
- member management,
- billing,
- messaging automation.

Only touch those areas if required to keep regression behavior working.

After this pass, Reports/Catalog/Campaigns/Meta will be reviewed separately.

---

# 31. Completion handoff

Create:

```text
M8_Household_UX_Correction_Handoff.md
```

Include:

1. branch/commit state,
2. files changed,
3. public `/trial` redesign summary,
4. one-person flow,
5. multiple-family-member flow,
6. SELF/contact behavior,
7. atomic booking behavior,
8. LeadHeader page restructure,
9. LeadLine presentation/detail behavior,
10. header-status UI changes,
11. Follow-Up placement,
12. Trial placement,
13. notes separation,
14. forecast presentation,
15. responsive/mobile changes,
16. API/service changes,
17. migration/schema changes if any,
18. tests added/changed,
19. exact QA command results,
20. browser QA results or explicit limitation,
21. known defects,
22. deferred issues,
23. final commit hash/push status.

Finish with one of:

```text
M8 HOUSEHOLD UX CORRECTION READY FOR HUMAN VERIFICATION
```

or

```text
M8 HOUSEHOLD UX CORRECTION NOT READY FOR HUMAN VERIFICATION
```

---

# 32. Acceptance criteria

This correction is ready for human verification only when:

- [ ] `/trial` no longer assumes one household = one Program/person.
- [ ] User can choose One person or Multiple family members.
- [ ] Primary contact can also participate as SELF.
- [ ] Non-participating guardian is not forced into a LeadLine.
- [ ] Multiple LeadLines can choose independent Programs and valid Trials.
- [ ] Multi-person public booking is transactional.
- [ ] Attribution remains on LeadHeader.
- [ ] Lead detail has a clear household/header section.
- [ ] Lead detail has a distinct Prospective Members section.
- [ ] Each LeadLine is readable at a glance.
- [ ] Detailed line editing is focused, not all inline.
- [ ] Mixed Converted/Lost/Active line states are understandable.
- [ ] Header outcome/status controls no longer mislead staff.
- [ ] Trials are visibly associated with the correct person.
- [ ] Follow-Up remains household-oriented with optional line links.
- [ ] Household vs line notes are visually distinct.
- [ ] Forecast values are clear and labeled as forecasted.
- [ ] Add-person workflow is clean.
- [ ] Desktop and mobile layouts are usable.
- [ ] Existing M4/M5/M7/M8 rules remain intact.
- [ ] Full automated test suite passes.
- [ ] Lint/typecheck/build pass.
- [ ] Completion handoff is supplied.

