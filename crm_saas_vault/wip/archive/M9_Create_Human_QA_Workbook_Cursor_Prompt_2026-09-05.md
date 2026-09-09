# Cursor Prompt — Create the Definitive M9 Human QA Workbook

**Project:** Renzo Gracie Kaysville  
**Branch:** `M9`  
**Required output:** `vault/wip/M9_QA.md`  
**Purpose:** Build Scott's definitive step-by-step human acceptance workbook for final M9 acceptance.  
**Scope:** Documentation/QA planning only. Do not modify application code. Do not merge M9. Do not mark M9 accepted.

## 1. Objective

Create `vault/wip/M9_QA.md`.

Scott will open this document in **Obsidian** while manually testing the running M9 application in a browser. It must function as an executable QA workbook, not a feature summary.

Scott should be able to start at the top, follow the tests in order, check off results, record defects, and reach a defensible M9 acceptance decision without needing prior ChatGPT/Cursor conversations.

For each substantial test, state:

1. Starting state/prerequisites.
2. Where to navigate.
3. Exact actions.
4. Expected behavior.
5. What must explicitly **not** happen.
6. Business rule being validated.
7. Evidence to capture on failure.
8. Whether failure is blocking or testing may continue.

Do not write vague items such as `- [ ] Test Events`. Write executable test cases.

## 2. Reconcile the current M9 state before writing

Before creating the workbook, inspect the repository and current M9 documentation.

At minimum inspect:

- `vault/wip/M9_Remaining_Human_QA.md`
- latest M9 implementation/handoff documents
- M9 Human QA correction handoffs
- latest UI/UX normalization handoff
- `vault/CRM.md`
- `vault/Decisions.md`
- `vault/Domain-Model.md`
- `vault/Implementation-State.md`
- `vault/Authentication.md`
- relevant Design System / Architecture documentation
- current `M9` code where necessary to verify actual routes, labels, Access Rights, status names, configuration fields, and workflow behavior

Repository code is authoritative for the actual current implementation when an old handoff describes an earlier state. Durable documentation is authoritative for settled business/product rules.

Do **not** simply convert `M9_Remaining_Human_QA.md` into checkboxes.

### Already-settled decisions that older WIP notes may still list as unresolved

Confirm these against durable documentation, then treat them as decided:

**Household status**
- Household/LeadHeader status is coarse and aggregate.
- Expected conceptual states: Active, Active · Mixed Outcomes, Joined, Lost, Closed · Mixed Outcomes.
- Person-level operational states such as Trial Scheduled, Trial Attended, and No-show remain on LeadLines and must not misleadingly become the household headline in mixed households.

**Content / Assets**
- A Content Item belongs to at most one Campaign.
- Do not test for Content ↔ Campaign many-to-many.
- Assets are reusable and may be used across Campaigns/Content Items through the established Asset usage model.

**Event duplicates**
- Public Event registration does **not** warn customers about suspected duplicates.
- Duplicate detection is staff-facing and advisory.
- Staff should see duplicate evidence through Roster/Process and may deliberately process despite a warning.
- Do not silently merge identities.

**Compensation**
- Generated Tracking Link acquisition credit uses the configured **Default tracked-acquisition credit owner**, not Campaign owner.
- This setting must be configured before compensation acceptance testing is valid.

If current durable documentation actually conflicts with one of these, report the conflict instead of inventing an expected result.

### Genuinely unresolved product decisions

Separate unresolved product decisions from failed tests.

The currently known potentially unresolved item is whether public Event registration should include consent checkboxes. Verify its current status. If still unresolved, place it in a **Product Decision Pending** section rather than inventing pass/fail behavior.

## 3. Obsidian-first design

Design `M9_QA.md` specifically for Obsidian.

Use:
- clear `#`, `##`, `###` hierarchy;
- `- [ ]` checkboxes;
- internal links such as `[[CRM]]`, `[[Decisions]]`, etc. where useful;
- a navigable section index near the top;
- Markdown tables;
- fenced code blocks for exact routes/values/scenarios;
- horizontal rules between major QA domains;
- stable test IDs;
- Obsidian callouts where they improve execution.

Useful callouts:

```md
> [!info]
> Business-rule context.

> [!tip]
> Efficient testing guidance.

> [!warning]
> Important precondition or regression risk.

> [!failure]
> What constitutes failure and what evidence to capture.

> [!success]
> Expected successful behavior.
```

Do not overuse callouts. Do not require community plugins.

## 4. Acceptance dashboard

Near the top, create a compact acceptance dashboard covering:

- Environment / prerequisites
- Authentication / Permissions
- Campaigns
- Content
- Marketing Tasks
- Assets
- Acquisition Events
- Household Leads / LeadLines
- Trials
- Follow-Up
- Conversion / Lost
- Attribution / Compensation
- UI/UX / Responsive
- End-to-End Regression

Also include unchecked top-level gates:

```md
- [ ] All blocking tests passed
- [ ] All discovered blocking defects resolved
- [ ] Permissions pass completed
- [ ] Event → Household → Trials → consolidated Follow-Up path passed
- [ ] Default tracked-acquisition credit owner configured and verified
- [ ] Compensation attribution passed
- [ ] Aggregate Household status scenarios passed
- [ ] Final end-to-end scenario passed
- [ ] UI/UX acceptance pass completed
- [ ] M9 ready for Scott's acceptance decision
```

Do not mark anything complete yourself.

## 5. Prerequisites and reusable test data

Document what must be running/configured and what accounts are needed.

Include current roles/Access Rights needed for:
- ADMIN
- STAFF with Marketing rights
- STAFF with no Marketing rights
- VIEWER
- `VIEW_MARKETING`
- `VIEW_MARKETING_REPORTS`
- Event processing
- Compensation Attribution

Explicitly require the ADMIN setting **Default tracked-acquisition credit owner** before Compensation QA.

Create a small reusable fictional dataset so Scott does not invent data repeatedly. Include:
- Campaign
- Tracking Link
- Campaign owner
- tracked-acquisition credit owner
- Content Item
- Asset
- Marketing Task
- Event
- multiple Event Sessions
- guardian/header person
- Adult BJJ prospect
- Kids BJJ prospect
- duplicate registration
- Trials
- Follow-Ups
- Joined outcome
- Lost outcome
- mixed household outcome

Use clearly fake data. Reuse the scenario where safe. Clearly mark tests that require fresh records.

## 6. Test-case format

Use stable IDs such as:

`AUTH-01`, `PERM-01`, `CAM-01`, `CONTENT-01`, `TASK-01`, `ASSET-01`, `EVENT-01`, `LEAD-01`, `TRIAL-01`, `FOLLOW-01`, `CONV-01`, `COMP-01`, `UX-01`, `E2E-01`.

Major tests should resemble:

```md
### EVENT-04 — Multiple intros consolidate into one Household Follow-Up

**Purpose**
Validate household-level outreach consolidation.

**Starting state**
- ...
- ...

**Steps**
1. ...
2. ...

**Expected**
- [ ] ...
- [ ] ...

**Must not happen**
- [ ] ...
- [ ] ...

> [!failure]
> Capture route, record names/IDs, screenshot, and exact state before continuing.
```

Use the application's actual terminology and routes. Verify labels against current code rather than guessing.

## 7. Authentication and Access Rights — BLOCKING

Create a thorough permissions pass.

Test:
- ADMIN
- STAFF with expected Marketing rights
- STAFF with **no Marketing Access Rights**
- VIEWER
- `VIEW_MARKETING`
- `VIEW_MARKETING_REPORTS`
- navigation visibility
- read vs manage actions
- direct protected-route behavior where human-testable
- Campaign Performance access
- Marketing command-center information
- Event management
- Event processing
- Compensation Attribution management

Explicitly verify the intended distinction between `VIEW_MARKETING` and `VIEW_MARKETING_REPORTS` from current code/docs.

UI hiding alone is not proof of authorization.

## 8. Campaign QA

Cover:
- Campaign index
- create Campaign
- `/marketing/campaigns/new`
- landing in `/marketing/campaigns/:id`
- workspace
- Overview/editing
- searchable record selector
- selector search/switching
- Previous/Next
- Tracking Links/default link
- Draft/Planned link copy if current behavior permits
- copy confirmation
- long tracking URL does not collapse layout
- Content tab
- Tasks tab
- Assets tab
- Events tab
- Performance
- Campaign → filtered Leads
- Meta mapping display
- Meta mapping writes remain ADMIN-controlled in Meta Settings
- `VIEW_MARKETING` vs detailed Performance
- responsive/layout behavior

## 9. Content QA

Cover:
- global Content list
- creation
- list/detail workflow
- detail route
- searchable selector
- Campaign relationship
- Content → Campaign navigation
- editing
- approval/publication behavior currently implemented
- Campaign-context creation
- Asset attachment/reuse
- Content remains associated with at most one Campaign

## 10. Marketing Tasks QA

Cover:
- global Marketing Tasks page
- creation header
- compact/scannable list
- at-a-glance information
- click → detail
- stable detail route
- searchable selector
- Campaign relationship
- Campaign-context creation
- editing
- status/completion
- assignee/due date
- navigation to related Campaign
- permissions
- responsive presentation

## 11. Asset QA

Cover:
- Asset library
- current create/upload behavior
- Campaign association where supported
- Content usage
- reuse of one Asset in multiple places
- `Used in` visibility
- Campaign/Content links
- removal of one usage does not incorrectly delete or re-parent the reusable Asset
- permissions

## 12. Acquisition Event QA — BLOCKING

Make this one of the most detailed sections.

Cover:
- Event index/create/workspace
- selector
- Overview
- Sessions
- Roster
- Process
- public Event page
- public registration
- multiple participants
- registration questions
- Attendance
- `Saving...` / `Saved` / error feedback
- Exclude from processing
- processed/not-processed visibility
- Process Preview
- actual people/groups visible
- NEW
- MATCH
- AMBIGUOUS
- ALREADY_PROCESSED
- excluded/cancelled behavior
- resulting Household links
- execution
- re-preview/re-process idempotency
- one Event Follow-Up per household

### Duplicate path

Explicitly test:
1. Submit a public registration.
2. Submit a plausible duplicate using matching phone/email.
3. Confirm the public user is **not** warned about an internal duplicate.
4. Open staff Roster.
5. Confirm staff sees Possible Duplicate.
6. Confirm match reason is visible.
7. Confirm suspected registration/household links are available.
8. Open Process Preview.
9. Confirm duplicate context remains visible.
10. Confirm staff can deliberately match existing or create new where current workflow permits.
11. Confirm duplicate context survives into the resulting Lead where applicable.

Duplicate evidence is advisory, not an automatic blocker or silent merge.

## 13. Required Event → Household → Trials → Follow-Up path — BLOCKING

This path is explicitly still awaiting browser QA.

Document the exact current UI steps for:

```text
Process Event registration containing child
→ open resulting Household
→ Add Person: Self
→ header/guardian name should prefill
→ make Self an Adult BJJ prospect as appropriate
→ schedule Adult Trial
→ schedule Child Trial
→ inspect Follow-Up
```

Expected:
- [ ] Add Self uses the household/header person's name as designed.
- [ ] Adult and child remain distinct LeadLines.
- [ ] Trials remain person-specific.
- [ ] Exactly **one** applicable open household Follow-Up exists after consolidation.
- [ ] Follow-Up clearly lists/references both intros.
- [ ] Follow-Up purpose is understandable to staff.
- [ ] Redundant Event Follow-Up does not remain as a competing open task.
- [ ] Household history remains understandable.

## 14. Household Lead / LeadLine QA

Cover:
- Lead index
- Household workspace
- Members-first default
- selector
- Previous/Next
- filtered navigation context
- `?line=` deep linking if still implemented
- header
- Add Person
- Add Self
- guardian/nonparticipant
- Adult prospect
- Child prospect
- multiple LeadLines
- person-level Trials
- household Follow-Up
- attribution
- compensation display
- notes/history
- duplicate warning
- Campaign relationship

### Aggregate Household status

Create explicit tests for:
- all active
- all Joined
- all Lost
- Joined + Lost
- Joined + active
- Lost + active
- Joined + Lost + active

Use the durable coarse aggregate-status rule for expected results.

Verify a person-level No-show does not overwrite a truthful mixed household headline.

## 15. Trial QA — BLOCKING lifecycle regression

Cover scheduling, rescheduling, Attended, No-show, follow-up effects, intended status regression, and terminal-person protection.

Construct:

```text
Person A = JOINED
Person B = LOST
Household = Closed · Mixed Outcomes
```

Then record Trial outcomes against terminal people wherever current UI permits.

Expected:
- [ ] JOINED stays JOINED.
- [ ] LOST stays LOST.
- [ ] Trial history may update appropriately.
- [ ] Neither person silently reopens.
- [ ] Household remains Closed · Mixed Outcomes.

Also verify explicit Lost reopen and conversion reversal still work only through their intended correction actions.

## 16. Follow-Up QA

Cover:
- Trial-generated Follow-Up
- Event-generated Follow-Up
- Event Follow-Up yielding/consolidating when intro confirmation becomes actionable
- one open household Follow-Up where required
- both intros listed when appropriate
- purpose/context visible
- due-date behavior
- completion/outcome/note
- reschedule behavior
- global queue
- Household tab
- Overdue / Due Today / Upcoming exclusivity
- no duplicate display across queue categories
- permissions

## 17. Conversion / Lost QA

Cover:
- independent LeadLine conversion
- Membership Offering/snapshot behavior
- Lost
- Lost reason/note
- mixed outcomes
- explicit reopen
- conversion reversal
- history/audit
- Household aggregate status after each operation
- other LeadLines remain unaffected

## 18. Attribution and Compensation QA — BLOCKING

Before this section:

```text
ADMIN
→ Settings
→ Default tracked-acquisition credit owner
→ configure intended test user
```

Create:

```text
Campaign owner = User A
Default tracked-acquisition credit owner = User B
```

Generate/use an application Tracking Link and create a prospect through that tracked path.

Expected:
- [ ] Campaign remains owned by User A.
- [ ] Compensation Attribution credits User B.
- [ ] Campaign ownership does not control compensation ownership.

Also test:
- Tracking Link evidence
- Event/tracking evidence as currently implemented
- manual/walk-in Lead without qualifying generated-link evidence remains UNASSIGNED
- Follow-Up assignee does not become compensation owner
- ADMIN manual correction
- attribution history
- Joined conversion snapshots correct earned compensation owner
- later Campaign owner changes do not rewrite historical earned credit

Clearly note that historical SYSTEM rows created before the corrected rule may still reference Campaign owners. Historical backfill is optional/deferred unless current code/docs say otherwise.

## 19. UI/UX normalization QA

Perform a deliberate visual acceptance pass over:
- Campaign
- Event
- Lead
- Content
- Marketing Task

Check:
- page → section → subsection → record hierarchy is obvious
- long forms are semantically grouped
- related fields visually belong together
- individual records are distinguishable
- secondary metadata recedes appropriately
- warnings/statuses/actions have intentional hierarchy
- selector looks polished and remains fully functional
- selected record is clear
- Previous/Next remains available but secondary
- long URLs/text do not destroy layout
- no giant uninterrupted wall of fields
- spacing communicates relationships
- nested cards/borders are not excessive
- dialogs are centered
- immediate-save feedback is visible

Test practical widths:
- wide desktop
- normal laptop
- narrow/tablet-like
- phone

Separate cosmetic defects from blocking workflow defects.

## 20. Cross-module end-to-end acceptance — BLOCKING

Finish with at least one clean, fresh end-to-end acquisition scenario:

```text
Campaign
→ Tracking Link
→ Event or Trial registration
→ Household
→ LeadLines
→ Follow-Up
→ Trial
→ Attended
→ Joined
→ Compensation Attribution
→ Campaign outcome/performance context
```

Write exact steps using current screens/routes.

At every boundary, specify expected records, relationships, status, and attribution.

This test must prove the application works as one acquisition system rather than as isolated modules.

## 21. Defect recording

Include this reusable section/template:

```md
## Defects Found

### BUG-M9-___ — Short title

**Test:**  
**Severity:** Blocking / Major / Minor / Cosmetic  
**Route:**  
**Record(s):**  

**Expected:**  

**Actual:**  

**Reproduction:**
1.
2.
3.

**Evidence:**
- Screenshot:
- Console/error:
- Notes:

**Status:** Open
```

Also distinguish:

### Stop testing immediately when
- data integrity is at risk
- lifecycle transition corrupts state
- authorization is bypassed
- processing destructively mutates/duplicates records
- continuing would contaminate later tests

### Continue and record when
- cosmetic/layout issue
- copy problem
- isolated convenience/navigation issue
- defect does not contaminate later state

## 22. Product Decision Pending

Include a dedicated section for genuinely unresolved product questions discovered during reconciliation.

At minimum verify whether this remains unresolved:

```text
Should public Event registration include consent checkboxes?
```

If unresolved, document current behavior and the decision needed. Do not grade it pass/fail and do not answer it.

## 23. Final M9 Acceptance Gate

End with:

```md
## Final M9 Acceptance Gate

### Blocking acceptance
- [ ] Permissions pass completed
- [ ] Event → Household → Adult + Child Trials → one Follow-Up path passed
- [ ] Default tracked-acquisition credit owner configured
- [ ] Generated-link compensation attribution passed
- [ ] Terminal LeadLine regression passed
- [ ] Aggregate Household status scenarios passed
- [ ] Event duplicate workflow passed
- [ ] Cross-module end-to-end scenario passed
- [ ] No unresolved data-integrity defects
- [ ] No unresolved authorization defects
- [ ] All blocking defects resolved

### Final review
- [ ] Campaign workflow accepted
- [ ] Content workflow accepted
- [ ] Marketing Tasks workflow accepted
- [ ] Assets workflow accepted
- [ ] Event workflow accepted
- [ ] Household Lead workflow accepted
- [ ] Trial workflow accepted
- [ ] Follow-Up workflow accepted
- [ ] Conversion/Lost workflow accepted
- [ ] Attribution/Compensation workflow accepted
- [ ] UI/UX accepted
- [ ] Deferred items documented

## Scott's M9 Decision

- [ ] ACCEPT M9
- [ ] DO NOT ACCEPT M9

**Date:**

**Blocking issues remaining:**

**Deferred non-blocking issues:**

**Product decisions remaining:**

**Notes:**
```

Do not select either decision.

## 24. Accuracy requirements

The workbook must reflect the **actual current M9 application**.

Before naming routes, buttons, tabs, Access Rights, statuses, settings, or workflow actions, verify them against current code/docs.

Do not fabricate labels.

Do not mark a test passed because automated tests exist. Automated evidence and Scott's human acceptance are separate.

## 25. Scope restrictions

For this request:
- Do not modify application code.
- Do not fix defects.
- Do not change schema.
- Do not change business rules.
- Do not change permissions.
- Do not merge M9.
- Do not mark M9 accepted.
- Do not invent product decisions.

The requested repository change is `vault/wip/M9_QA.md`, plus only a minimal documentation/index link if genuinely necessary for discoverability.

## 26. Git handling

Remain on `M9`.

Before work:

```text
git branch --show-current
git status
```

After creating the workbook:
1. inspect the diff;
2. ensure no unrelated files changed;
3. commit the QA document with a descriptive message;
4. push to `origin/M9`;
5. verify push success.

Suggested commit:

```text
Add definitive M9 human acceptance QA workbook.
```

Do not merge.

## 27. Return report

After creating and pushing `vault/wip/M9_QA.md`, report:

1. exact output path;
2. branch;
3. commit hash/message;
4. push status;
5. sources/docs inspected;
6. code areas inspected to verify expected behavior;
7. stale/conflicting QA information corrected while constructing the workbook;
8. genuinely unresolved product decisions;
9. any areas difficult to translate into deterministic human QA;
10. recommendations for improving the QA process itself.

Do not merely say the file was created.

Scott/ChatGPT will review both `M9_QA.md` and this return report before final M9 acceptance testing.
