---
type: note
status: current
area: process
updated: 2026-09-04
tags:
  - m9
  - qa
  - acceptance
  - cursor-prompt
---

# Renzo Gracie Kaysville — M9 Human QA Correction Pass

**Date:** 2026-09-04  
**Branch:** `M9`  
**Mode:** Implementation / Acceptance Correction  
**Human acceptance gate:** Scott  
**Primary QA source:** `note.md` / the 2026-09-04 human QA findings  
**Do not merge M9.**

This prompt is a bounded acceptance-correction pass after M9 implementation and the Primary Record Workspace normalization.

The purpose is to fix the specific defects, UX gaps, and business-rule issues found during Scott's browser QA without reopening settled M8/M9 architecture.

---

# 1. Mandatory first step

Before changing code:

1. Confirm the current Git branch is exactly `M9`.
2. Inspect `git status` and `git log --oneline --decorate -n 20`.
3. Do not switch branches, create a new branch, merge, rebase, reset, force push, amend pushed commits, commit local SQLite/runtime data, commit secrets, or include unrelated changes.
4. Read this prompt completely before editing.
5. Read the current durable docs and latest M9 handoffs/review notes relevant to Household Lead / LeadLine lifecycle, Campaign workspaces, Acquisition Events, Event processing, Content / Assets, Compensation Attribution, Access Rights / Permissions, Primary Record Workspace UX, and current acceptance notes.
6. Inspect the actual implementation before assuming file names or behavior.

Repository code is authoritative where old handoff notes are stale.

---

# 2. Git / commit workflow

Use the existing `M9` branch.

This is not a single giant commit. Use detailed commits at functional boundaries.

For each bounded commit:

1. implement the intended correction;
2. run focused QA/tests;
3. inspect the diff;
4. fix defects discovered by QA;
5. rerun focused validation until clean;
6. run broader validation appropriate to the touched area;
7. inspect `git status`;
8. commit only intended changes;
9. push to `origin/M9`;
10. verify push success;
11. continue to the next correction group.

Do not wait for Scott between planned commits unless a genuine product contradiction appears.

At the end, run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

All four must pass unless a clearly pre-existing unrelated failure is proven and documented.

---

# 3. Locked product decisions from human QA

## 3.1 Household status is aggregate/coarse

LeadHeader / household status must communicate the household's aggregate acquisition state, not simply repeat one LeadLine's latest operational status.

Use the existing domain model and derive a coarse household status consistent with these rules:

- **Active** — all nonterminal members are still in the acquisition process and there are no terminal mixed outcomes requiring a special label.
- **Active · Mixed Outcomes** — at least one LeadLine is terminal (`JOINED` or `LOST`) and at least one other LeadLine remains active/nonterminal.
- **Joined** — all participating LeadLines are terminal and all are `JOINED`.
- **Lost** — all participating LeadLines are terminal and all are `LOST`.
- **Closed · Mixed Outcomes** — all participating LeadLines are terminal and the final outcomes contain a mixture of `JOINED` and `LOST`.

Operational person statuses such as `TRIAL_SCHEDULED`, `TRIAL_ATTENDED`, and `NO_SHOW` belong primarily to the individual LeadLine/member and must not become a misleading household headline when the household contains mixed person-level states.

Example:

```text
Parent A — JOINED
Child B — LOST
Child C — TRIAL_SCHEDULED

Household:
Active · Mixed Outcomes
```

A later No-show for Child C must not make the household badge simply say `No-show`.

Use existing terminology/style conventions where current code has equivalent labels. Do not create unnecessary new persisted statuses if household state is already derived.

---

## 3.2 Terminal LeadLines must not silently reopen from Trial outcomes

This is a confirmed lifecycle bug.

Recording a Trial outcome must not silently move a terminal LeadLine out of `JOINED` or `LOST`.

A Trial outcome may still be historically recorded where appropriate, but it must not automatically rewrite the person's final acquisition lifecycle.

Rules:

- `JOINED` requires the existing explicit conversion-reversal/correction path before the person may re-enter the prospect lifecycle.
- `LOST` requires the existing explicit reopen/correction path before the person may re-enter the prospect lifecycle.
- Recording `ATTENDED`, `NO_SHOW`, `CANCELLED`, or another Trial outcome is not an implicit reopen action.
- Household derived state must remain correct after recording Trial history on a terminal person.

Required regression scenario:

```text
Household
├── Person A = JOINED
└── Person B = LOST

Household = Closed · Mixed Outcomes

Record a later/outstanding Trial outcome for either person.

Expected:
- Trial history updates as allowed.
- Person A remains JOINED.
- Person B remains LOST.
- Household remains Closed · Mixed Outcomes.
```

Also test:

```text
JOINED + LOST + active person
→ Active · Mixed Outcomes
```

and confirm one active person's No-show does not overwrite the aggregate household state.

---

## 3.3 Compensation credit rule

Current system behavior that derives SYSTEM compensation credit from Campaign owner is no longer correct for Renzo.

The business rule for the current Renzo deployment is:

> Any qualifying prospect attributable to a tracking link generated by this application receives compensation/acquisition credit for the configured tracked-acquisition credit owner, regardless of who owns or manages the Campaign.

For Renzo today, that configured credit owner is Scott.

Do not hard-code Scott's user ID or name.

Implement/configure this as a customer/system setting concept equivalent to `Default Tracked Acquisition Credit Owner`, or reuse the existing settings infrastructure if an appropriate key already exists.

Rules:

- App-generated Tracking Link evidence → default tracked-acquisition credit owner.
- Campaign owner is operational ownership only; it does not determine compensation ownership.
- Walk-in/manual/offline leads with no qualifying generated tracking link remain unassigned unless manually assigned by ADMIN.
- Follow-Up assignee does not determine compensation.
- Later Campaign ownership changes do not rewrite historical compensation ownership.
- Existing ADMIN-only correction/history rules remain.
- Existing per-LeadLine compensation model remains.
- Existing earned compensation snapshot at Joined remains immutable historical evidence except through the approved correction mechanism.
- Do not broaden this into accounting.

If current architecture also uses Event/Campaign evidence independently of a Tracking Link, preserve deterministic evidence rules carefully. The key business requirement is that generated-link attribution credits the configured tracked-acquisition owner, not Campaign owner.

Document the exact setting key/configuration behavior used.

Prefer existing `app_settings` / configuration infrastructure if it can cleanly represent this.

---

## 3.4 Event duplicate detection is staff-only and advisory

Public Event signup should continue allowing duplicate-looking registrations.

Do not expose an internal duplicate warning to the customer.

Possible duplicates are staff-facing information, not blockers.

A staff member must be able to deliberately process the registration even if the system detects a likely duplicate.

The warning must remain visible through:

```text
Roster
→ Process Preview
→ Process Decision
→ Process Result
→ Resulting Lead / Household
```

Where applicable, show:

- `Possible Duplicate` badge or equivalent;
- what matched: normalized phone, normalized email, or both;
- link(s) to suspected matching records;
- whether the suspected match is another registration on the same Event, an existing CRM household, or a processed registration linked to a household;
- the proposed action in Process Preview.

Staff must be able to:

- match to an existing household when appropriate;
- deliberately create a new Lead/household despite the warning when they confirm it is a different person/household;
- continue processing rather than being blocked solely by duplicate evidence.

Do not silently merge identities.

Do not silently create duplicates without warning.

Preserve the duplicate evidence/history when the Event registration becomes associated with or creates a Lead so the warning does not disappear at the Event boundary.

Reuse the existing Lead possible-duplicate architecture where appropriate rather than inventing a disconnected duplicate system.

---

## 3.5 Asset reuse vs Content reuse

Locked rule:

### Asset
Reusable across many Campaigns / Content Items.

A good photo/video/logo/creative file may be used repeatedly.

Use the existing Asset + `asset_usages` model.

The UI should make reuse/usage relationships visible where practical.

### Content Item
Belongs to at most one Campaign in the current model.

Do not make Content ↔ Campaign many-to-many in this pass.

A Content Item is a specific managed marketing execution containing things such as caption/body, channels, publisher, approval state, planned publication, and publication history.

If reusable copy/templates become necessary later, that should be a separate explicit feature such as Content Template or Duplicate Content, not a many-to-many Campaign relationship added during this QA correction.

---

# 4. Straightforward QA corrections to implement

## 4.1 Consent copy: text and/or call

Change labels only unless the actual code proves a real data-model issue.

Suggested wording:

- Public Trial: `It's ok to text or call me about this intro.`
- Staff Lead creation: `OK to text or call`
- Keep email consent wording separate.

Do not add a third consent column in this pass.

---

## 4.2 `AppConfirm` dialogs must be centered

Confirmed global defect: native `<dialog showModal>` instances rendered through `AppConfirm` open at the top-left because Tailwind v4 Preflight resets margin.

Fix the primitive once.

Preferred correction:

- center the modal with `m-auto` on the dialog or equivalent durable styling;
- preserve backdrop behavior;
- preserve current focus/modal semantics;
- verify it applies to Campaign copy confirm, Event Process confirm, and other existing confirms.

Do not create page-specific centering hacks.

---

## 4.3 Campaign copy-link must not collapse the header

After Copy Default Tracking Link, the raw URL is being placed into a header flex region and forces the identity/title column to collapse.

Preferred behavior:

- use a short notice such as `Copied the default tracking link.` rather than showing the raw URL in the header success alert;
- place the alert outside the constrained identity/action header row or in a safe workspace message region;
- ensure any place where the actual long URL is displayed uses safe wrapping such as `break-all`, `min-w-0`, and `max-w-full` as appropriate;
- recheck Campaign Tracking-tab copy;
- recheck Event Copy Public URL;
- ensure long tracking URLs cannot crush record titles/navigation.

Fix the actual flex/min-content problem.

---

## 4.4 Event Roster attendance needs save feedback

Keep immediate-save behavior.

Do not add a second Save button.

For the Attendance select:

- show per-row `Saving...` while request is in flight;
- disable/protect the control from accidental double-submit as appropriate;
- show a brief `Saved` confirmation on success;
- use `aria-live` or equivalent accessible feedback;
- show an inline row-level error on failure;
- do not rely only on a page-level alert.

Apply the same feedback pattern to Exclude-from-processing if it uses the same immediate-save UX.

---

## 4.5 Event Process tab must show who is in the batch

Current Process view is counts-only and is not sufficient for safe staff operation.

Do not create a second independent Roster.

Reuse `preview.rows` plus Event/Roster data to render a clear batch preview.

Keep the top summary counts, then show actual groups/people.

At minimum distinguish:

- NEW
- MATCH
- AMBIGUOUS
- ALREADY_PROCESSED
- EXCLUDED
- CANCELLED / not included where applicable

For each row/group, show enough information to understand:

- contact/household name;
- participants;
- attendance context if relevant;
- registrations represented by the group;
- suspected/current CRM match;
- whether it is new or existing;
- existing household link when available;
- duplicate warnings/match reason where applicable;
- proposed processing action.

Ambiguous choices remain explicit.

Do not change Preview → Review → Execute.

Empty state before Preview should clearly instruct staff to run Preview.

Add explanatory copy equivalent to:

```text
One Event Follow-Up call is created per household for this Event.
```

---

## 4.6 Visually show Event processing state

### Roster
Make `Processed` / `Not processed` visually obvious.

Where processed, show:

- Processed badge/state;
- linked Household / Lead when available;
- relevant participant/LeadLine links where practical.

Where not processed, clearly say so.

### Process tab
Include `ALREADY_PROCESSED` rows/groups in the preview/detail.

After execution, show what was created or matched and provide links to resulting households.

Do not make staff infer process state only from raw IDs/timestamps.

---

## 4.7 Content → Campaign navigation

If a Content Item has `campaignId`, show an obvious Campaign relationship on Content detail.

At minimum:

```text
Campaign: <Campaign Name>
```

where the Campaign name links to:

```text
/marketing/campaigns/:id
```

Prefer placing this in the Content detail header/context area or another obvious location consistent with Marketing Task/Asset behavior.

If the Content detail was opened from Campaign context and `?campaignId=` is present, a `Back to Campaign` action may be used as additional convenience, but do not rely solely on browser history.

Keep Content single-Campaign as decided above.

---

## 4.8 Asset usage visibility

Because Assets are intentionally reusable, staff should be able to understand where an Asset is being used.

Audit the current Asset library/detail representation.

Without creating a full Asset workspace, expose usage information where practical:

- Campaigns using the Asset;
- Content Items using the Asset;
- direct `assets.campaignId` relationship;
- `asset_usages` relationships.

Provide links back to related Campaign / Content records where authorized.

Do not redesign the Asset schema.

Do not make Content many-to-many.

---

# 5. Duplicate registration implementation details

## 5.1 Public Event signup

Allow submission even when phone/email resembles an existing registration or CRM household.

No customer-facing duplicate warning in this pass.

Do not block the customer.

## 5.2 Staff Roster warning

For each Event Registration, detect/display possible duplicates using normalized contact information consistent with existing matching logic.

Show a staff-only warning when appropriate.

Examples:

```text
Possible Duplicate
Phone matches another registration on this Event.
```

```text
Possible Duplicate
Email matches Smith Household.
[Open Household]
```

If multiple suspected matches exist, present them clearly.

## 5.3 Process Preview

Duplicate/match context must be carried into the Process preview.

Do not make staff rediscover the issue by moving back to Roster.

For each relevant group, show:

- possible duplicate badge;
- what matched;
- links;
- proposed action.

Staff must explicitly confirm ambiguous identity resolution.

## 5.4 Process despite warning

Possible duplicate is advisory.

Staff may deliberately attach to an existing household or create a new household despite the warning.

Do not silently override that deliberate selection.

## 5.5 Resulting Lead duplicate visibility

When staff deliberately creates a new Lead/household despite a suspected duplicate, preserve the possible-duplicate relationship/warning in the resulting CRM record using the existing Lead duplicate mechanism where possible.

The Lead workspace should continue showing the suspected matching household link.

---

# 6. Compensation Attribution implementation details

Audit the current system before changing behavior.

Known current behavior from QA:

```text
SYSTEM credit → Campaign owner
```

for Campaign/Tracking/Event evidence.

That is no longer the desired Renzo rule for generated tracking links.

Implement the customer-configurable tracked-acquisition credit owner using the existing configuration architecture.

Recommended conceptual setting:

```text
compensation.tracked_acquisition_owner_user_id
```

Exact naming should follow current conventions.

Requirements:

- ADMIN/configuration-safe;
- validate referenced user appropriately;
- do not hard-code Scott;
- generated Tracking Link evidence should establish compensation attribution to this configured user;
- preserve `origin = SYSTEM` vs manual override distinction;
- preserve method/evidence such as Tracking Link / Campaign / Event;
- Campaign owner remains operational ownership and must not be used as compensation owner merely because they own the Campaign;
- manually entered/offline/walk-in Leads remain unassigned unless manually assigned under current ADMIN rules;
- historical attribution corrections remain auditable;
- compensation earned snapshots remain tied to the attribution at conversion time.

If current data already contains SYSTEM attributions credited by Campaign owner, do not silently rewrite historical records unless there is an explicit safe migration/backfill rule already approved.

For this QA pass, prioritize correct behavior going forward.

If you believe existing QA/dev records should be corrected automatically, report the issue in the handoff instead of inventing a historical rewrite.

Add focused tests.

---

# 7. Household lifecycle implementation details

Inspect:

- Trial outcome services;
- LeadLine status transition services;
- household derived-status helper(s);
- header compatibility/status logic.

Do not patch only the UI label.

The domain behavior must prevent terminal-state leakage.

Required behavior:

```text
JOINED LeadLine
+ old/current Trial set to NO_SHOW
→ Trial record may reflect outcome where valid
→ LeadLine stays JOINED
→ household state derived accordingly
```

```text
LOST LeadLine
+ Trial set to ATTENDED/NO_SHOW
→ LeadLine stays LOST
→ explicit reopen still required
```

Derived household status should use person-level terminal/nonterminal state rather than one header operational fallback when mixed states exist.

Add deterministic tests for:

- all joined;
- all lost;
- joined + lost;
- joined + active;
- lost + active;
- joined + lost + active;
- active household with all nonterminal people;
- terminal line Trial outcome does not reopen;
- active person's No-show does not collapse an Active · Mixed Outcomes household into plain No-show.

Do not remove existing person-level statuses from the member cards.

---

# 8. Permissions

Preserve current M9 Access Rights.

Do not change permission design merely because these corrections touch the screens.

- Event management continues using existing Event rights.
- Process execution continues using `PROCESS_EVENT_REGISTRATIONS`.
- Campaign/Content/Asset access continues using existing Marketing rights.
- Compensation attribution changes follow existing ADMIN / `MANAGE_COMPENSATION_ATTRIBUTION` rules.
- Customer-facing public routes must not expose staff duplicate information.

UI hiding is not security.

---

# 9. Documentation updates

Update durable docs where these corrections change accepted behavior.

At minimum evaluate:

- `vault/CRM.md`
- `vault/Domain-Model.md`
- `vault/Design-System.md`
- `vault/Architecture.md`
- `vault/Decisions.md`
- `vault/Implementation-State.md`
- M9 operational/handoff documentation where appropriate.

Document durable rules including:

1. household state is aggregate/coarse;
2. terminal LeadLines do not reopen from Trial outcomes;
3. Event duplicate detection is staff-facing advisory evidence and may be deliberately overridden;
4. generated Tracking Links use configured tracked-acquisition compensation owner rather than Campaign owner;
5. Assets are reusable via usage relationships;
6. Content remains single-Campaign;
7. Event Process preview must show actual batch records, not only counts;
8. immediate-save controls require explicit save/error feedback;
9. Content detail provides clear Campaign navigation.

Do not rewrite historical handoffs to make them appear as if they always described the corrected behavior.

---

# 10. Suggested commit boundaries

## Commit A — Global UX primitive fixes

- center `AppConfirm`;
- Campaign/Event long copied-link notification/layout fix;
- consent wording;
- immediate-save feedback pattern for Event Roster controls.

Suggested message:

```text
Fix M9 acceptance UX feedback, dialogs, and long-link layout.
```

## Commit B — Event roster/process clarity and duplicate evidence

- Process tab actual batch list;
- processed-state visibility;
- same-Event/existing-household duplicate warnings;
- persistent duplicate context;
- one follow-up per household explanatory copy;
- staff can still deliberately create new/match existing;
- resulting Lead warning preserved where applicable.

Suggested message:

```text
Make Event processing transparent and preserve duplicate warnings through Lead creation.
```

## Commit C — Household terminal lifecycle and aggregate status

- prevent Trial outcomes from reopening JOINED/LOST;
- aggregate household status behavior;
- regression tests across mixed household combinations.

Suggested message:

```text
Protect terminal LeadLine outcomes and derive truthful household status.
```

## Commit D — Compensation credit rule

- configured tracked-acquisition owner;
- generated Tracking Link → configured owner;
- Campaign owner no longer drives compensation credit;
- manual/offline behavior unchanged;
- tests and docs.

Suggested message:

```text
Credit generated-link acquisitions to the configured compensation owner.
```

## Commit E — Content/Campaign and reusable Asset navigation

- Content → Campaign link;
- optional Back to Campaign context;
- Asset usage visibility/links;
- preserve Content single-Campaign;
- preserve Asset reusable usages.

Suggested message:

```text
Improve Campaign navigation and reusable Asset usage visibility.
```

## Commit F — Documentation and final QA handoff

- durable docs;
- final implementation handoff;
- exact QA results;
- known limitations;
- browser checklist.

Suggested message:

```text
Document M9 acceptance corrections and final QA state.
```

Push every commit to `origin/M9`.

Additional narrow fix commits are allowed if QA finds defects.

---

# 11. Full final QA

After all implementation commits are complete, run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Record exact results.

Also inspect:

```text
git status
git log --oneline --decorate -n 30
```

Confirm:

- branch is still `M9`;
- all intended commits are pushed;
- `origin/M9` matches expected HEAD;
- no local DB/runtime/secrets/unrelated files were committed;
- working tree status is clearly reported.

Do not merge M9.

Do not mark M9 accepted.

Scott will perform browser acceptance.

---

# 12. Required final handoff document

Create a new Markdown handoff in:

```text
vault/wip/
```

Use a descriptive name similar to:

```text
M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04.md
```

This document will be reviewed by ChatGPT/Scott, so make it detailed.

It must include:

## Git / repository
- branch;
- starting HEAD;
- ending HEAD;
- remote status;
- each commit hash/message from this correction pass;
- working-tree status;
- explicit confirmation that `M9` was not merged.

## What was implemented
For each correction group, explain:
- files/services/components changed;
- actual implemented behavior;
- any deviations from this prompt and why;
- routes/API changes;
- permission enforcement;
- tests added.

## QA evidence
Report exact results for:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also list focused test files/commands used during development.

## Errors / problems encountered
Do not hide implementation difficulties.

Report:
- test failures encountered;
- unexpected schema/service behavior;
- routing problems;
- type errors;
- migration/config issues;
- edge cases found;
- anything that required a workaround;
- whether any errors remain.

## Thoughts while coding
Include meaningful architectural observations discovered from the actual codebase, such as:
- duplicated logic;
- brittle areas;
- technical debt exposed;
- places where current architecture worked especially well;
- places where future cleanup would be valuable.

Do not pad this section with generic commentary.

## Suggestions
Provide bounded recommendations for future work that arose from implementation.

Clearly separate:

```text
Required before M9 acceptance
```

from:

```text
Suggested later improvement
```

Do not implement unrelated suggestions during this pass.

## Known limitations
Explicitly list anything intentionally not solved.

## Scott browser QA checklist
Provide a concise but thorough manual test plan for:

### Household
- mixed outcomes;
- JOINED/LOST terminal protection;
- active mixed status;
- No-show on active member;
- Trial outcome on terminal member.

### Event
- duplicate registration allowed publicly;
- duplicate warning visible to staff;
- duplicate links;
- Roster save feedback;
- processed/not processed clarity;
- Process preview shows people;
- MATCH/NEW/AMBIGUOUS/ALREADY_PROCESSED;
- deliberate create-new despite duplicate warning;
- resulting Lead duplicate warning;
- one Event Follow-Up per household.

### Campaign / Content / Asset
- copy Draft tracking link;
- no header collapse;
- centered confirmation;
- Content → Campaign navigation;
- Asset usage visibility.

### Compensation
- Campaign owner A;
- generated Tracking Link;
- configured tracked-acquisition credit owner B;
- resulting compensation attribution credits B;
- walk-in/manual without link remains unassigned;
- ADMIN manual correction still works.

---

# 13. Stop conditions

Stop and ask Scott only if implementation reveals a genuine product contradiction that cannot be resolved from this prompt and current durable docs.

Examples:

- enforcing the compensation rule requires choosing between two incompatible business meanings not resolved here;
- duplicate override would require destructive household merge behavior;
- terminal lifecycle fix conflicts with an established accepted conversion-reversal rule;
- household aggregate status requires a new persisted state model rather than a derived display and cannot be implemented safely without redesign;
- a schema migration is truly necessary for one of the locked requirements.

Do not stop for ordinary implementation decisions.

Inspect the repository, use existing patterns, implement the simplest consistent approach, thoroughly test, commit, push, and continue.

---

# 14. Completion condition

Do not stop after one correction group.

Continue until:

- all approved QA corrections above are implemented;
- all four locked product decisions are reflected in the code where applicable;
- focused QA is complete;
- full `test/lint/typecheck/build` passes;
- every bounded commit is pushed to `origin/M9`;
- durable documentation is updated;
- the final detailed handoff exists in `vault/wip/`;
- Git status/final HEAD are reported;
- Scott has a browser QA checklist.

Then stop and return the final implementation summary.

Do not merge `M9`.
Do not mark M9 accepted on Scott's behalf.
