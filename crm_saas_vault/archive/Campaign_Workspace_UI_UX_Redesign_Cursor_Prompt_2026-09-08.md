# Cursor Prompt — Campaign Workspace UI/UX Redesign

## Objective

Perform a substantial UI/UX redesign of the Renzo CRM **Campaign detail/workspace** experience.

This is an **implementation task**, not a design-only exercise.

The current Campaign detail page is functionally useful, but its Overview tab is visually weak and behaves like a large editable database form instead of a polished marketing workspace.

The redesign should preserve the existing Campaign information architecture and business behavior while making the Campaign feel like a real primary business record that staff can understand at a glance.

Core design principle:

> **Primary business records are workspaces, not forms.**

Opening a Campaign should show the Campaign.

Editing a Campaign should be an explicit action.

Do not expose every editable field immediately just because the user has permission to edit it.

Preserve existing Campaign routes, API contracts, status model, tracking links, Campaign→Meta mappings, attribution behavior, content/tasks/assets/events relationships, and permissions unless a narrowly scoped UI change requires otherwise.

---

# 1. Read Before Coding

Before implementation:

1. Read `AGENTS.md`.
2. Read the latest:
   - Campaign workspace documentation;
   - M9 workspace/UI documentation;
   - mobile UI/UX audit/results if present;
   - friendly Campaign Tracking Link implementation/results if present;
   - Assets/Content redesign results if already completed.
3. Inspect:
   - `/marketing/campaigns`
   - `/marketing/campaigns/new`
   - `/marketing/campaigns/:id`
4. Inspect all current Campaign-related APIs and schema.
5. Inspect:
   - Campaign status lifecycle;
   - Campaign kind;
   - owner;
   - collaborators;
   - programs;
   - planned budget;
   - objective;
   - offer;
   - target audience;
   - description;
   - notes;
   - planned start/end;
   - actual start/end;
   - tracking links;
   - Campaign attribution counts;
   - Campaign-related Content;
   - Marketing Tasks;
   - Assets;
   - Events;
   - Performance.
6. Inspect current shared components:
   - AppRecordWorkspace;
   - AppRecordSelector;
   - AppRecordTabs;
   - AppPageHeader;
   - AppPanel;
   - AppBadge;
   - AppButton;
   - AppOverflowMenu;
   - responsive/mobile section-navigation patterns.
7. Preserve valid existing work already present in the branch.

Current repository reality is authoritative.

---

# 2. Keep the Existing Workspace Information Architecture

Preserve the current Campaign workspace sections:

```text
Overview
Content
Tasks
Assets
Tracking
Events
Performance
```

Do not remove or merge these sections merely to simplify the UI.

Preserve stable record URLs and existing `?tab=` behavior.

Desktop may continue to show normal tabs.

Phone/small-screen Campaign section navigation should use the accepted responsive behavior already established by the project.

Do not create a separate mobile route tree.

---

# 3. Current Problem

The current Overview tab behaves primarily like a long form.

The screenshot and current page structure show several problems:

- Campaign identity is visually weak.
- The main content occupies a narrow left column inside a wide viewport.
- Identity, Ownership, Plan, and Dates are presented as one long editable form.
- Section labels are too visually weak.
- Important Campaign information is not differentiated from ordinary configuration.
- Collaborators and Programs are displayed as scattered checkboxes.
- Four start/end date fields visually dominate the page.
- The primary Save action is a small button at the bottom.
- Tracking/copy-link behavior is understated even though it is operationally important.
- The page does not provide a useful "at a glance" Campaign summary.

The Overview tab should become an **operational Campaign summary**, not a permanent edit form.

---

# 4. Desired Workspace Header

Redesign the Campaign header so the user immediately understands:

```text
Which Campaign?
What status?
What kind/channel?
When is it running?
What are the most important current metrics?
What is the primary action?
```

Conceptual direction:

```text
← All Campaigns

September Campaign                              ACTIVE

Organic · Sep 8 – Sep 30
1 attributed household · $0 planned budget

[ Copy campaign link ]   [ Edit campaign ]   [ More ⋮ ]
```

Use actual current data and terminology.

Do not force every metric into the header.

The header should feel strong but not overloaded.

---

# 5. Friendly Tracking Link as a Primary Operational Action

If the friendly Campaign Tracking Link work has been implemented, the normal Campaign header should expose:

```text
Copy campaign link
```

as a real, prominent action.

It should copy the preferred friendly public URL, not the raw machine-generated query URL.

Example:

```text
https://app.renzogracieutah.com/t/september
```

If friendly-link work has not yet landed, preserve compatibility with the current link system and structure the UI so the friendlier URL can be used once available.

Do not modify attribution architecture as part of this task unless necessary for the already-approved friendly-link implementation.

---

# 6. Overview = Readable Campaign Brief

The default Overview state should be **read-only / presentation-first**.

Do not immediately render all Campaign inputs.

Use clear summary sections.

Recommended structure:

## Campaign Plan

Purpose:

> What are we trying to accomplish?

Display:

- Objective
- Offer
- Target audience
- Programs
- Description

Conceptually:

```text
CAMPAIGN PLAN

Objective
Generate free-trial signups during September

Offer
Free introductory Jiu Jitsu class

Target audience
Adults and parents near Kaysville

Programs
Adult BJJ · Kids BJJ

Description
General September acquisition campaign used to establish
our initial marketing baseline.
```

If a field has no value, use a restrained empty-state treatment such as:

```text
Not set
```

Do not render empty editable fields by default.

---

# 7. Ownership Summary

Use a distinct Ownership section.

Display:

- owner;
- collaborators;
- publisher if Campaign-level publisher exists in current model;
- any other currently meaningful Campaign responsibility.

Conceptual direction:

```text
OWNERSHIP

Owner
Scott Coy

Collaborators
Marta Rodrigues
Pedro Rodrigues
```

Do not permanently display every possible user as a checkbox.

If no collaborators:

```text
No collaborators assigned
```

---

# 8. Schedule Summary

Normal Overview should summarize dates in human-readable form.

Example:

```text
SCHEDULE

Planned
Sep 8 – Sep 30

Actual
Sep 8 – Present
```

Do not show four raw date/time input fields unless the user enters Edit mode.

Preserve actual underlying planned/actual timestamps.

Use America/Denver display rules as established by the project.

---

# 9. Campaign Activity Summary

Add a compact operational summary using current supported data.

Potential items:

```text
Content
3 items

Tasks
2 open

Assets
7

Events
1

Tracking
Default link active

Performance
1 attributed household
```

Only show values the current APIs can support reliably.

Do not invent metrics.

Each summary item should link/open its corresponding Campaign section where useful.

This should help Overview function as the Campaign's home page.

---

# 10. Optional High-Level Acquisition Metrics

If current Campaign response data already makes these values cheap and reliable, consider a compact Campaign outcome summary such as:

```text
Leads
Trials
Attended
Joined
```

or:

```text
Attributed households
Joined
Planned budget
Meta spend
```

Do not duplicate the full Performance page.

Overview should show only high-level orientation.

Detailed analytics remain in:

```text
Performance
```

Do not invent expensive new reporting queries for this UI task unless the repository already exposes the data cleanly.

---

# 11. Explicit Edit Mode

The largest interaction change:

> Viewing and editing should be separate states.

Provide an explicit:

```text
Edit campaign
```

action.

When the user enters Edit mode, expose the editable Campaign form.

Edit mode may remain on the same route.

Do not create a new route unless the current architecture strongly favors one.

Conceptually:

```text
CAMPAIGN DETAILS

Identity
Name
Status
Kind
Primary channel

Ownership
Owner
Collaborators
Programs

Campaign Plan
Objective
Offer
Target audience
Description
Notes

Schedule
Planned start
Planned end
Actual start
Actual end

[ Discard changes ]                 [ Save changes ]
```

When saved successfully:

- persist existing fields;
- exit Edit mode;
- return to readable Overview;
- show clear save feedback.

---

# 12. Save / Discard Hierarchy

Do not leave a tiny Save button buried at the bottom.

Inside Edit mode:

- Save changes = primary;
- Discard changes = secondary;
- destructive Campaign cancellation/lifecycle behavior must not be confused with cancelling form edits.

Be careful with terminology.

If `CANCELLED` is a Campaign business status, do not use a generic "Cancel" button that ambiguously means both:

```text
discard form edits
```

and:

```text
cancel the Campaign
```

Use explicit labels.

Business lifecycle transitions belong in a deliberate status/workflow control.

---

# 13. Campaign Status / Lifecycle UX

Do not treat Campaign status as an arbitrary ordinary dropdown if the existing server has meaningful lifecycle rules.

Inspect current behavior.

Use one of:

- explicit status select in Edit mode;
- deliberate workflow transition control;
- another established pattern.

The Campaign header should always display current status clearly.

If Cancelled/Completed are terminal or sensitive states under current rules, place them appropriately in `More` or a deliberate workflow control rather than alongside harmless edits.

Do not change the underlying status enum or business lifecycle.

---

# 14. Programs Selection UX

Current scattered checkboxes are visually weak.

Improve program selection in Edit mode.

Recommended pattern:

```text
Programs

[✓ Adult BJJ]  [ Kids BJJ ]  [ Striking ]  [ Wrestling ]
```

Use selectable chips/cards if they fit the current design system.

Requirements:

- entire target comfortably clickable/tappable;
- selected state obvious without color alone;
- keyboard accessible;
- supports current Program list;
- no business-rule changes.

Do not permanently display Programs as edit controls in read-only Overview.

Read-only Overview should show compact badges/text.

---

# 15. Collaborator Selection UX

Do not permanently show every user as a checkbox.

Use a scalable collaborator interaction.

Preferred pattern:

```text
Collaborators

[ Marta Rodrigues × ]
[ Pedro Rodrigues × ]

[ + Add collaborator ]
```

The Add interaction may use:

- searchable dropdown;
- popover;
- responsive sheet;
- existing user selector pattern.

Preserve existing Campaign collaborator relationships.

Do not invent a new role/permission model.

On read-only Overview, show collaborator names cleanly.

---

# 16. Owner Selection

Owner remains a single Campaign responsibility.

In read-only mode:

```text
Owner
Scott Coy
```

In Edit mode:

use the current owner selector or an improved searchable selector if shared components already support it.

Do not confuse Campaign owner with compensation owner.

Preserve the M9 rule:

```text
Campaign ownership != compensation attribution ownership
```

Do not modify compensation behavior.

---

# 17. Primary Channel

Inspect the actual meaning of `primary channel`.

If currently free text, keep the existing data model unless there is already a configured/enum source.

Do not silently invent a channel taxonomy during this UI task.

In read-only Overview, show it only when useful.

---

# 18. Planned Budget

Normal Overview should not display a raw empty numeric field.

Use human-readable summary:

```text
Planned budget
$0
```

or:

```text
No planned budget
```

depending on existing semantics.

Remember that `$0` is valid for Organic Campaigns.

Do not equate `$0` with missing data incorrectly.

Editing retains the supported budget input.

---

# 19. Notes

Notes are secondary.

Do not give Notes equal visual weight to Objective, Offer, and Audience on read-only Overview.

Possible treatment:

```text
Notes
Show notes
```

or a compact lower section.

In Edit mode, provide the full textarea.

Do not remove notes.

---

# 20. Description

Description belongs in the readable Campaign Plan section.

Use normal readable text rather than a disabled-looking textarea.

If long, allow natural wrapping and reasonable max width.

---

# 21. Mobile Behavior

Campaign must remain phone-friendly.

## Header

On phone:

```text
September Campaign
ACTIVE

Organic
Sep 8 – Sep 30

[ Copy link ] [ Edit ] [ More ]
```

Actions may stack/wrap deliberately.

Do not squeeze three desktop buttons into one tiny row.

## Overview

Single column.

Readable sections:

```text
Campaign Plan
Ownership
Schedule
Activity
```

No giant editing form unless Edit mode is opened.

## Edit Mode

Single column.

Programs use touch-friendly selections.

Collaborator picker uses a phone-friendly sheet/dropdown.

Dates stack.

Save action must remain easy to reach.

No horizontal scrolling.

## Campaign Sections

Use the project's accepted phone behavior for the seven workspace sections.

All seven remain discoverable.

---

# 22. Desktop Behavior

Desktop should use more width than the current narrow left-column form.

Do not stretch text to the full viewport.

Use a balanced workspace width.

Possible Overview layout:

```text
Main column:
Campaign Plan
Activity / Performance summary

Side column:
Ownership
Schedule
Tracking summary
```

or another clean composition consistent with the existing design system.

Do not use a two-column layout if it creates awkward empty cards.

Edit mode may use two-column field groups where sensible.

Preserve desktop tab efficiency.

---

# 23. Visual Hierarchy

Establish:

```text
Campaign
  ↓
Workspace section
  ↓
Summary group
  ↓
Field/value
```

Do not render:

```text
tiny uppercase heading
tiny divider
tiny fields
tiny checkbox group
tiny divider
tiny fields
```

as the dominant pattern.

Use:

- stronger section headings;
- real whitespace;
- readable values;
- restrained metadata;
- selective borders;
- existing Renzo navy/blue/paper visual language.

Do not redesign the brand.

---

# 24. Accessibility

Preserve/improve:

- semantic headings;
- button semantics;
- status text;
- keyboard navigation;
- focus states;
- collaborator selection accessibility;
- program-chip accessibility;
- mobile section navigation;
- More menu semantics;
- labels in Edit mode;
- touch targets.

Do not make selection depend on color alone.

---

# 25. Preserve Existing Functionality

Before implementation, inventory and preserve all current Campaign capability.

At minimum:

- Campaign name;
- kind;
- status;
- primary channel;
- owner;
- collaborators;
- Programs;
- planned budget;
- objective;
- offer;
- target audience;
- description;
- notes;
- planned start/end;
- actual start/end;
- tracking links;
- friendly tracking link if implemented;
- copy-link behavior;
- Content relationship;
- Tasks relationship;
- Assets relationship;
- Events relationship;
- Performance relationship;
- Meta mapping relationship;
- attribution counts;
- permissions/RBAC.

Do not accidentally simplify away capability.

---

# 26. Scope Constraints

This task is specifically:

```text
Campaign workspace/header
+
Campaign Overview
+
Campaign edit experience
+
Campaign field-selection UX
```

Do not:

- redesign Content again unless a shared component requires a harmless integration update;
- redesign Assets again;
- redesign Marketing Tasks;
- redesign Event workspace broadly;
- change Campaign schema unnecessarily;
- change Campaign attribution;
- change Meta integration;
- change compensation rules;
- modify M10 infrastructure;
- change NGINX/Docker/DNS;
- add campaign automation;
- add automatic publishing.

---

# 27. QA Requirements

Test multiple Campaign states and shapes.

## Campaign states

- Draft
- Planned
- Active
- Completed
- Cancelled

## Campaign types

- Organic
- Paid

## Data cases

- no owner;
- owner set;
- no collaborators;
- multiple collaborators;
- no Programs;
- multiple Programs;
- `$0` planned budget;
- non-zero budget;
- no dates;
- planned dates only;
- planned + actual dates;
- no objective/offer/audience;
- complete Campaign brief;
- long description;
- long notes;
- friendly Tracking Link;
- no attributed households;
- attributed households;
- no related Content/Tasks/Assets/Events;
- populated related records.

## Functional

Verify:

- enter Edit mode;
- edit each field;
- save;
- discard changes;
- status changes according to existing rules;
- Program assignment;
- collaborator add/remove;
- owner change;
- planned budget;
- dates;
- copy tracking link;
- tabs/sections;
- mobile section navigation;
- permissions;
- direct API rules remain unchanged.

## Responsive

Test at:

```text
320
360
375
390
412
430
768
1280+
```

No horizontal page scroll.

Desktop tabs remain efficient.

## Regression

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Fix regressions caused by this task.

Do not weaken tests.

---

# 28. Git Discipline

Before editing:

```bash
git branch --show-current
git status
git log -1 --oneline
git remote -v
```

Do not overwrite unrelated work.

Inspect:

```bash
git status
git diff
```

before commit.

Use a scoped descriptive commit.

Suggested:

```text
feat(marketing): redesign campaign workspace overview and editing UX
```

Push after successful QA.

---

# 29. Required Return Document

Create:

```text
vault/wip/Campaign_Workspace_UI_UX_Redesign_Results_2026-09-08.md
```

Document:

## Starting State

- branch;
- starting HEAD;
- relevant dirty work.

## Original Problems

Explain the previous form-first Campaign experience.

## Final Header

- identity;
- status;
- metadata;
- tracking-link action;
- Edit;
- More.

## Overview

Document:

- Campaign Plan;
- Ownership;
- Schedule;
- Activity;
- high-level metrics if implemented.

## Edit Mode

Document:

- activation;
- field grouping;
- Program selection;
- collaborator selection;
- owner;
- budget;
- plan fields;
- dates;
- save/discard behavior;
- status behavior.

## Mobile

Document final phone behavior.

## Desktop

Document desktop layout.

## Components / Files Changed

List relevant files.

## QA

Record exact results:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also document browser/mobile visual QA actually performed.

Distinguish:

```text
CODE-VERIFIED
AUTOMATED-TESTED
BROWSER-VERIFIED
HUMAN-QA-PENDING
```

## Git

- commit;
- push;
- ending HEAD.

## Deviations

Explain anything requested but not implemented.

## Remaining Issues

Only real remaining issues.

---

# 30. Definition of Done

The Campaign workspace is complete when opening a Campaign immediately answers:

```text
What campaign is this?
Is it active?
What are we trying to accomplish?
Who owns it?
Who is collaborating?
Which Programs are promoted?
When is it running?
What is the tracking link?
What work/content/assets/events exist?
How is it performing?
```

without presenting the user with a large edit form by default.

Editing should be deliberate:

```text
View Campaign
→ Edit Campaign
→ Save
→ return to readable Campaign Overview
```

The final experience should feel like a **marketing Campaign workspace**, not a database maintenance screen.

At completion:

```text
IMPLEMENT
→ QA
→ TEST
→ REVIEW DIFF
→ COMMIT
→ PUSH
→ WRITE RESULTS HANDOFF
→ STOP
```

Do not begin unrelated UI work.
