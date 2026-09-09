# Cursor Prompt — Whole-Project Mobile UI/UX Implementation

## Objective

Implement the full-project mobile UI/UX overhaul defined by:

```text
vault/wip/Full_Project_Mobile_UI_UX_Current_State_and_Phone_Readiness_Audit_2026-09-07.md
```

Treat that audit as the primary discovery artifact for this work.

The application is live. DEV, STAGE, and PROD are Internet-accessible over HTTPS, and the first real customer-acquisition campaign is beginning. Phone usability is therefore an operational requirement, not optional polish.

The goal is to make the **entire application deliberately phone-friendly** while preserving the accepted desktop/laptop experience and all existing business behavior.

This is a responsive redesign of one application.

Do **not** create:

- separate mobile routes;
- a separate mobile application;
- duplicate mobile business logic;
- a new visual identity;
- speculative domain changes.

---

# 1. Read Before Changing Code

Before implementation, read:

1. `AGENTS.md`
2. `vault/wip/Full_Project_Mobile_UI_UX_Current_State_and_Phone_Readiness_Audit_2026-09-07.md`
3. `Design-System`
4. `Implementation-State`
5. latest M9 UI/workspace documentation
6. latest M10 closure/launch handoff
7. current code for every component/route being changed

Current code wins when stale documentation disagrees.

Do not expose secrets or inspect production data unnecessarily.

---

# 2. Accepted Product Decisions

Do not stop to re-ask these.

## Navigation

Use the existing **drawer-based staff navigation**.

Do **not** implement bottom navigation in this pass.

Reduce unnecessary phone-header chrome where practical, especially environment switching.

All existing destinations must remain reachable according to authorization.

## Public Trial Flow

Keep `/trial` as a **single-page progressive flow**.

Do not turn it into a wizard unless implementation evidence proves the compact redesign cannot work. If that occurs, stop and document the blocker rather than changing the product flow unilaterally.

## Sticky Public CTA

Do not automatically add a fixed/sticky Book button.

First compact the form and class/date selection.

Only introduce a sticky CTA if it is clearly needed after the redesign and can be implemented without keyboard/safe-area problems.

## Campaign Workspace

Implement deliberate phone handling for the seven Campaign sections.

Preserve `?tab=` URLs and desktop tabs.

On phone/small layouts, use an explicit overflow/section-selection pattern rather than relying on invisible horizontal overflow.

## Lead Pipeline

Default the Leads page to the normal **List** presentation on phones.

Pipeline may remain available as an optional horizontally scrolling board.

## Admin-heavy Screens

The audit recommended deferring extensive route-specific redesign of Users, Reports, Compensation, and deep Settings until after core workflows.

For this implementation, however, the objective is the **entire project**.

Therefore:

- Tier 1 routes receive the highest UX standard.
- Tier 2 routes receive deliberate phone layouts.
- Tier 3/admin routes must at minimum become cleanly usable without broken/squeezed layouts.
- Do not leave operational tables phone-hostile merely because they are lower priority.

## One Responsive Application

Do not create `/m/*`, mobile-specific business endpoints, duplicated state, or alternate mobile domain behavior.

## Business Logic

Do not change business rules.

This project is primarily UI/UX/responsive work.

---

# 3. Non-Negotiable Domain Boundaries

Preserve existing behavior for:

- Trial creation;
- Trial scheduling;
- Trial rescheduling;
- Trial attendance;
- Trial no-show;
- FollowUpTask lifecycle;
- Household Lead behavior;
- LeadLine behavior;
- Event processing;
- public never-merge behavior;
- duplicate warnings;
- campaign attribution;
- tracking links;
- compensation;
- pricing/money-in-cents rules;
- America/Denver time behavior;
- authentication;
- username/email login;
- session handling;
- RBAC;
- Access Rights;
- Meta behavior;
- environment behavior.

The server remains authoritative.

Do not reproduce server scheduling/business rules in Vue for convenience.

---

# 4. Execution Model

Implement this as a structured series of sub-milestones.

Use the current working branch unless repository state or project instructions explicitly identify another active branch.

Before implementation:

```bash
git status
git branch --show-current
git log -1 --oneline
```

Document the starting branch and HEAD.

Do not discard unrelated existing work.

The audit notes that `/users` currently contains uncommitted redesign work. Preserve and integrate existing valid work rather than overwriting it.

For **each sub-milestone**:

1. implement only that sub-milestone;
2. review the diff;
3. run relevant targeted tests;
4. run:
   - `pnpm test`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`
5. perform available non-destructive QA;
6. document results;
7. commit with a descriptive commit message;
8. push the current branch;
9. STOP if QA fails or there is a material architectural/product ambiguity;
10. otherwise continue to the next sub-milestone.

Do not combine the entire redesign into one giant commit.

---

# 5. Sub-Milestone MOBILE-A — Responsive Foundations

Start with shared design-system leverage.

Primary files likely include:

```text
app/assets/css/main.css
app/components/AppButton.vue
app/components/AppField.vue
app/components/AppFieldGroup.vue
app/components/AppPanel.vue
app/components/AppStat.vue
```

Inspect before editing.

## Controls

Make primary interactive controls comfortably touchable.

Target approximately:

```text
44 × 44 CSS px
```

for normal buttons and major interactive controls.

The audit found `.btn` at approximately 40px.

Increase shared touch sizing without making desktop comically large.

## Form Input Typography

Normal form controls must use approximately **16px text on phones**.

Do not rely on 14px inputs.

This avoids cramped mobile entry and iOS automatic zoom behavior.

Do not disable browser zoom.

## Input Height

Give `.control` a deliberate minimum touch height.

Ensure:

- inputs;
- selects;
- date controls;
- password controls;
- text fields

feel consistent.

## Panel Density

Current `AppPanel` phone padding is too large relative to 320–390px screens.

Reduce phone padding while preserving accepted larger-screen spacing.

Align panel headers and bodies consistently.

Avoid:

```text
page gutter
→ huge panel gutter
→ nested card gutter
→ nested field gutter
```

consuming most of a 320px viewport.

## AppStat

Reduce unnecessary phone padding/density.

Maintain clear numbers and labels.

## Checkboxes / Radios

Create or standardize comfortable touch rows.

The entire label/row should be tappable where appropriate.

Do not depend on a tiny native checkbox/radio as the only target.

## Typography

Preserve the existing Renzo design language.

Do not introduce a new typography system.

## MOBILE-A QA

At minimum inspect:

- `/login`;
- `/trial`;
- `/dashboard`;
- one staff edit form;
- desktop baseline.

Confirm shared changes do not cause widespread desktop regression.

Commit and push.

---

# 6. Sub-Milestone MOBILE-B — Application Shell and Navigation

Primary files:

```text
app/layouts/internal.vue
app/layouts/default.vue
app/layouts/auth.vue
AppEnvSwitcher
AppEnvBanner
```

## Internal Phone Navigation

Retain:

```text
Menu
→ drawer
```

Do not add bottom navigation.

Improve:

- drawer ergonomics;
- scroll behavior;
- overlay behavior;
- body scroll locking while drawer is open;
- touch sizing;
- header height;
- spacing;
- current-route clarity.

All authorized routes must remain reachable.

## Environment Switcher

The audit identified environment controls as excessive phone chrome.

On small screens:

- do not allow the environment switcher to dominate the persistent header;
- prefer keeping environment switching available inside the drawer/settings area;
- preserve clear environment identity, especially DEV/STAGE;
- do not make it easy to confuse PROD/STAGE/DEV.

`AppEnvBanner` may remain important for non-production identity.

## Public Header

On conversion routes:

```text
/trial
/events/:slug
```

remove/demote Staff Login from the primary public header.

A prospect booking from Instagram should not be presented with staff-oriented competition.

Keep staff login discoverable through appropriate non-conversion entry points such as `/`.

## Auth Shell

Preserve the clean centered phone-friendly auth layout.

Benefit from global control sizing.

## Safe Areas

Do not add safe-area complexity unless fixed/sticky controls actually require it.

## MOBILE-B QA

Test:

- staff drawer open/close;
- route-change close;
- overlay;
- long navigation list;
- DEV/STAGE environment identity;
- PROD;
- `/trial`;
- `/events/:slug`;
- `/login`;
- desktop rail at `lg+`.

Commit and push.

---

# 7. Sub-Milestone MOBILE-C — Public Acquisition Experience

This is the **highest-priority mobile conversion work**.

Primary surfaces:

```text
/trial
/events/:slug
IntroSlotPicker
TrialPersonBooking
HouseholdPersonFields where shared
public layout
```

## Public `/trial`

Optimize for:

```text
social link
→ understand offer
→ enter contact
→ choose participant(s)
→ choose real class
→ submit
→ understand confirmation
```

### Phone Input

Every phone field must use appropriate semantics:

```html
type="tel"
inputmode="tel"
autocomplete="tel"
```

where appropriate.

Email fields should use:

```html
type="email"
autocomplete="email"
```

Use appropriate `autocomplete` for names where safe and semantically correct.

Apply the same principle across the application, not only `/trial`.

### IntroSlotPicker

This is a major shared problem.

Current behavior can render up to approximately 14 vertically stacked date buttons per participant.

Redesign it for phones.

Preferred direction:

- compact date chips;
- compact multi-column date choices;
- or a horizontally navigable week/date strip with obvious discoverability.

Preserve:

```text
date
→ available class/time
```

and server-authoritative availability.

Do not replace valid class availability with arbitrary `datetime-local`.

Do not hide dates/classes that are actually available.

### Multiple Participants

Family booking must remain understandable.

Avoid visually repeating huge nested cards.

Clearly preserve:

- participant identity;
- program;
- age/experience;
- selected date;
- selected class.

The user should always know which person they are scheduling.

### CTA

Keep the primary booking CTA obvious and full width on phones.

If disabled because no valid class is selected, explain why near the CTA.

Example concept:

```text
Choose a class time to continue.
```

Do not leave an unexplained disabled button.

### Consent

Make consent rows comfortably tappable.

### Error Handling

Preserve entered information after validation/server errors.

Bring errors into useful proximity where practical.

Do not replace existing server validation.

### Confirmation

The success state is the prospect's receipt.

Keep it calm, clear, phone-readable, and honest.

Do not promise SMS/email if the application does not send it.

## Public Event Registration

Bring `/events/:slug` to the same phone-quality standard.

Improve:

- phone/email/name input semantics;
- participant sections;
- session selection;
- dynamic questions;
- consent;
- CTA;
- confirmation.

Do not turn event registration into a generic marketing landing page.

## `/`

Preserve the simple entry page but establish clear hierarchy:

```text
Book
```

should be the prospect-oriented primary action.

Staff sign-in is secondary.

## MOBILE-C QA

Required scenarios:

1. single adult trial;
2. child trial;
3. household/family with at least two participants;
4. validation failure;
5. duplicate-submit protection remains;
6. event with one participant;
7. event with multiple participants;
8. event custom questions if available;
9. campaign `?c=` attribution query survives;
10. 320px;
11. 360/375px;
12. 390px;
13. 430px;
14. 768px;
15. desktop.

Do not claim visual QA if no browser/device inspection was actually performed.

Commit and push.

---

# 8. Sub-Milestone MOBILE-D — Core Staff Daily Workflow

Focus on:

```text
/dashboard
/tasks
/leads
/leads/new
/leads/:id
```

The target phone workflow is:

```text
open app
→ understand today's work
→ find/open household
→ tap phone number
→ understand next Trial
→ mark outcome / complete follow-up
→ add note
→ move on
```

## Dashboard

Prioritize:

- overdue;
- due today;
- next work;
- useful acquisition status.

Reduce card bloat.

Do not make a coach scroll through oversized metrics before reaching work.

## Follow-Up `/tasks`

This is already one of the stronger phone pages.

Improve rather than rewrite.

Ensure:

- phone number is a prominent `tel:` action;
- due/overdue is visually obvious;
- Complete is the primary operational action;
- Cancel/destructive action is secondary/overflow where appropriate;
- six view chips do not form an awkward multi-line mess.

Use either:

- a deliberate horizontally scrollable chip row with discoverability;
- or another compact selector.

Preserve task semantics.

## Leads Index

Search must remain immediately visible.

Do not hide search behind Filters.

Move secondary filters into a compact phone pattern:

```text
Search
Filters (N)
```

with active-filter indication.

Create/reuse a responsive FilterSheet/Drawer if justified.

Normal List should be the default phone presentation.

Pipeline remains optional.

## Phone Links

Where a phone number appears in a staff operational view, make it directly callable with `tel:` unless there is a specific reason not to.

At minimum:

- Lead index cards;
- Household header;
- Follow-Up;
- Event roster/contact areas.

## New Lead

Keep the form single-page.

Improve:

- phone keyboard;
- spacing;
- participant grouping;
- duplicate warning placement;
- extra-person disclosure.

Do not change duplicate semantics.

## Household Workspace `/leads/:id`

This is one of the largest mobile problems.

Preserve the M9 workspace and stable route.

### Header

First glance should prioritize:

1. household identity;
2. household status;
3. phone/email;
4. next Trial;
5. members;
6. one relevant action.

Do not allow attribution/UTM/admin metadata to dominate the phone header.

### Tabs

Household has four tabs.

Keep them as deliberate touch-friendly tabs.

Shorten labels if necessary while preserving meaning.

`Notes & History` may display as `Notes` on phone if the underlying tab remains the same.

### Member / LeadLine Cards

Redesign action hierarchy.

Do not display:

```text
View details
Schedule
Convert
Mark lost
Reschedule
Cancel
Attended
No-show
...
```

as a wall of equal buttons.

For each person:

- show current status;
- show next/current Trial;
- expose the **single most relevant operational action**;
- move secondary/destructive actions into `More`.

Examples:

```text
Scheduled today
Primary: Mark attended
More: No-show / Reschedule / Cancel / Convert / Lost
```

or:

```text
No trial
Primary: Schedule trial
More: Convert / Lost / Details
```

Do not change the conditions under which those actions are valid.

### Trial Scheduling

Use the improved shared `IntroSlotPicker`.

Do not bury another giant date picker inside an already dense person card.

Use progressive disclosure, sheet, or a focused in-page editor.

Only one large editor should be active at a time on phone.

### Follow-Up / Notes

Make short phone updates easy.

Do not expose enormous forms when a one-line note is sufficient.

## MOBILE-D QA

Required:

- lead search;
- filter;
- open household;
- call;
- household with one member;
- household with multiple members;
- scheduled Trial;
- Attended;
- No-show;
- reschedule;
- cancel;
- convert access still exists;
- lost access still exists;
- complete Follow-Up;
- add note;
- 320–430px;
- desktop regression.

Commit and push.

---

# 9. Sub-Milestone MOBILE-E — Shared Workspace and Interaction Primitives

Now generalize proven patterns.

Primary candidates:

```text
AppRecordSelector
AppRecordTabs
AppOverflowMenu
FilterSheet / responsive filters
responsive record-list/card patterns
```

Do not over-abstract.

## AppOverflowMenu

Extract the valid `/users` More-menu concept into a reusable primitive.

Desired behavior:

- desktop: anchored menu/popover;
- phone: touch-friendly sheet/menu;
- keyboard accessible;
- screen-reader meaningful;
- supports destructive styling;
- closes reliably;
- does not depend on hover.

Adopt it where action density is already known to be a problem.

## AppRecordSelector

Desktop behavior may remain popover-based.

On phone/small layouts, use a deliberate sheet/full-screen search experience if that produces better ergonomics.

Preserve:

- record search;
- selection;
- previous;
- next;
- stable navigation.

## AppRecordTabs

Standardize:

- four-or-fewer sections: touch-friendly tabs may remain;
- larger section sets: explicit overflow/section chooser on phone;
- desktop remains the accepted visible tab experience.

Do not hide valid sections.

## Filters

If MOBILE-D introduced a filter sheet, formalize it only after verifying that the abstraction genuinely serves multiple routes.

## Responsive Operational Lists

Reuse the established:

```text
cards < md
table md+
```

pattern where appropriate.

Do not force analytical tables into cards when horizontal analysis is genuinely useful.

## MOBILE-E QA

Exercise all consumers after abstraction.

Do not allow a “shared component cleanup” to silently change route behavior.

Commit and push.

---

# 10. Sub-Milestone MOBILE-F — Marketing and Acquisition Operations

Cover the complete Marketing area.

## Marketing Command Center

Make summary information phone-readable.

Do not require horizontal scrolling to understand basic campaign outcomes.

Prioritize KPI/summary cards.

Detailed analytical tables may remain available below or behind a deliberate full-table view.

## Campaign Index

Existing phone cards are a good base.

Refine spacing/actions only as needed.

## Campaign Workspace

Campaign has seven sections:

```text
Overview
Content
Tasks
Assets
Tracking
Events
Performance
```

Desktop:

- preserve visible tabs.

Phone:

- use the shared large-section navigation pattern from MOBILE-E;
- keep all sections discoverable;
- preserve `?tab=`;
- make Overview the natural landing context.

First glance:

1. campaign name/status;
2. active dates;
3. objective/offer;
4. tracking-link action;
5. next work;
6. key results.

Do not put every metric in the header.

## Content / Marketing Tasks / Assets

Indexes already have phone-card patterns.

Ensure:

- comfortable cards;
- one obvious action;
- compact metadata;
- focused detail routes remain useful;
- selectors use the improved responsive selector.

## Acquisition Events

### Index

Retain card-first phone behavior.

### Event Workspace

Four sections can remain tabs.

Day-of phone priority is:

```text
event
→ session
→ roster
→ attendance/process
```

Roster is already one of the stronger mobile related-record patterns.

Improve:

- contact tap actions;
- attendance controls;
- checkbox touch areas;
- status clarity.

Collapse or progressively disclose the Walk-In creation form so it does not permanently occupy the top of a long roster.

## Compensation

Make the ledger usable on a phone.

Operational payment rows should not require a wide horizontal table.

Use phone cards below `md` while preserving desktop table efficiency.

## MOBILE-F QA

Test:

- campaign list;
- campaign section switching;
- tracking link copy;
- Content;
- Marketing Tasks;
- Assets;
- Event list;
- Event roster;
- attendance save;
- Walk-In disclosure;
- Compensation;
- desktop Campaign tabs.

Commit and push.

---

# 11. Sub-Milestone MOBILE-G — Reports, Users, Security, and Settings

These are lower-frequency phone workflows but still part of the application.

They must be usable.

## Reports

Do not attempt to reproduce a desktop BI canvas at 360px.

Phone priority:

- filters;
- KPI summaries;
- funnel/conversion headline numbers;
- short useful summaries.

Wide analytical tables may remain horizontally scrollable when analysis genuinely requires width.

Provide a deliberate boundary between:

```text
mobile summary
```

and:

```text
full analytical table
```

Do not convert every report table into a giant stack of cards.

## Users

Preserve existing uncommitted valid redesign work.

Below `md`, replace the seven-column operational table with user cards.

First glance:

1. display name;
2. role;
3. active state;
4. username/email;
5. Edit/Manage;
6. More.

Preserve:

- Edit;
- Access;
- Role;
- Reset;
- Revoke;
- Deactivate/reactivate.

Do not remove dangerous actions; move them into deliberate hierarchy.

Username editing must remain available.

## Security

A security log may legitimately retain more analytical/table characteristics.

On phone:

- show a readable event summary;
- actor;
- action;
- timestamp;
- expandable detail if needed.

Avoid forcing a huge raw table into 320px.

## Settings Hub

Keep it simple.

Cards/links should remain easy to tap.

## Intro Availability

Ensure weekly schedule editing stacks cleanly.

Do not change scheduling semantics.

## Catalog

Current 5/6-column editable grids are not appropriate on phones.

Stack configuration records into logical editable cards below a suitable breakpoint.

Do not expose six tiny fields in one phone row.

## Meta / Access / Environment

Make controls comfortably touchable and readable.

Do not redesign their underlying workflows unless necessary for responsive usability.

Environment restore remains intentionally cautious and destructive operations remain clearly marked.

## MOBILE-G QA

Test each ADMIN page at 390px plus desktop.

Ensure no capability disappears merely because it is lower frequency.

Commit and push.

---

# 12. Sub-Milestone MOBILE-H — Whole-Application QA and Polish

Perform a complete final responsive pass.

Do not introduce major new architecture in MOBILE-H.

Fix inconsistencies discovered during QA.

## Required Viewports

At minimum:

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

Portrait phone is primary.

Check at least one short-height phone condition.

## Required Public Scenarios

- `/`;
- single adult Trial;
- child Trial;
- family Trial;
- validation error;
- Trial confirmation;
- public Event;
- multi-participant Event;
- campaign attribution query.

## Required STAFF Scenarios

- login;
- forced password if safely testable;
- dashboard;
- Follow-Up;
- call via `tel:`;
- Lead search;
- Lead filters;
- household;
- multiple members;
- schedule Trial;
- reschedule;
- Attended;
- No-show;
- complete Follow-Up;
- note.

## Required Marketing

- Campaign list;
- Campaign workspace;
- every Campaign section reachable on phone;
- Content;
- Tasks;
- Assets;
- Events;
- Roster;
- Process;
- Compensation.

## Required ADMIN

- Users;
- Access Rights;
- Security;
- Reports;
- Catalog;
- Intro Availability;
- Meta;
- Environment.

## Stress Cases

Test:

- long household name;
- long email;
- long Campaign name;
- many badges;
- mixed household;
- multiple household members;
- empty state;
- large list;
- validation errors;
- long Event roster;
- DEV/STAGE environment banner;
- 7 Campaign sections;
- destructive More menu;
- selector search.

## Interaction Checks

Verify:

- no important hover-only controls;
- no inaccessible action hidden without alternative;
- no accidental horizontal page scroll;
- no nested-scroll trap;
- no fixed element covering form controls;
- no tiny destructive action beside a primary action;
- no 14px form input regression;
- no broken browser zoom;
- no inaccessible menu/dialog introduced;
- keyboard focus remains visible;
- menu/dialog escape/close works where appropriate.

## Desktop Preservation

Re-test desktop.

Specifically verify:

- desktop staff rail;
- desktop tables;
- desktop workspace headers;
- Campaign visible tabs;
- record selectors;
- forms;
- reports;
- Users;
- Event roster.

Phone improvements must not degrade established desktop workflows.

---

# 13. Accessibility Requirements

Preserve and improve:

- semantic labels;
- native input behavior;
- keyboard navigation;
- visible focus;
- screen-reader labels;
- heading hierarchy;
- dialog semantics;
- menu semantics;
- tab semantics;
- error announcements;
- color-independent status meaning;
- browser zoom.

Do not disable zoom.

Do not use color alone for status.

Where icon-only controls remain, provide accessible labels.

---

# 14. Performance Guardrails

Do not add a heavy UI framework just to solve responsive behavior.

Do not add a charting library solely for phone Reports.

Do not introduce large client bundles unnecessarily.

Avoid:

- duplicate mobile DOM trees where one responsive structure works;
- excessive watchers;
- repeated availability requests created by the redesign;
- expensive resize listeners per component.

If a sheet/menu requires viewport awareness, centralize it appropriately.

Do not prematurely implement virtualization unless real list performance is currently poor.

---

# 15. Explicit Anti-Patterns

Do not:

- add `overflow-x-auto` everywhere;
- shrink operational text to make desktop layouts fit;
- use 12–14px form controls;
- create an eight-item bottom bar;
- create separate mobile routes;
- duplicate business logic;
- duplicate Trial availability logic;
- add fixed-height content cards;
- create nested scrolling regions unnecessarily;
- squeeze desktop tables into 360px;
- cover content with sticky controls;
- create hover-only actions;
- put giant forms in confirmation dialogs;
- add custom breakpoints for individual phone models;
- change domain behavior while doing CSS;
- add page-specific CSS patches when a shared primitive is the real problem;
- disable pinch zoom;
- promise communications the system does not send;
- change public duplicate/merge semantics;
- hide functionality from ADMIN simply because it is awkward on phone.

---

# 16. Documentation Requirements During Implementation

Update durable design-system documentation when a new shared responsive rule becomes accepted.

Examples:

- touch-target standard;
- phone input typography;
- operational cards below `md`;
- tab-overflow behavior;
- selector-sheet behavior;
- action-overflow behavior;
- filter-sheet behavior.

Do not clutter durable documentation with temporary implementation notes.

Use WIP documentation for temporary QA/progress.

---

# 17. Required Return Document

Create:

```text
vault/wip/Full_Project_Mobile_UI_UX_Implementation_Results_2026-09-08.md
```

This is mandatory.

The document must be thorough enough for Scott and ChatGPT to understand exactly what changed without reading every diff.

Include:

## Executive Summary

- final status;
- branch;
- starting HEAD;
- ending HEAD;
- number of commits;
- whether all eight sub-milestones completed.

## Sub-Milestone Results

For each:

```text
MOBILE-A
MOBILE-B
MOBILE-C
MOBILE-D
MOBILE-E
MOBILE-F
MOBILE-G
MOBILE-H
```

document:

- files changed;
- components added;
- components modified;
- route changes;
- responsive behavior;
- QA performed;
- test results;
- deviations;
- unresolved issues;
- commit hash;
- push result.

## Shared Design-System Changes

Document the final accepted mobile primitives and rules.

## Route-by-Route Final State

Provide a concise final matrix:

| Route | Before | After | Remaining Mobile Concern |
|---|---|---|---|

Cover every meaningful route.

## Public Funnel

Explain exactly how `/trial` and `/events/:slug` now behave on phones.

## Staff Workflow

Explain:

```text
Dashboard
→ Follow-Up
→ Lead
→ Trial outcome
→ note
```

and how phone interaction improved.

## Workspace Behavior

Document final phone behavior for:

- Household;
- Campaign;
- Event;
- record selector;
- tabs/section selection;
- overflow actions.

## Admin Behavior

Document:

- Users;
- Reports;
- Security;
- Catalog;
- Access;
- Meta;
- Environment.

## Automated QA

Record exact results for:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Do not write “passed” without actually running them.

## Human QA Still Required

Clearly separate:

```text
CODE-VERIFIED
AUTOMATED-TESTED
BROWSER-VERIFIED
HUMAN-PHONE-QA-PENDING
```

Do not claim a real-phone result Cursor did not perform.

## Deviations

If anything in this specification was intentionally not implemented, explain:

- what;
- why;
- impact;
- recommendation.

## Follow-Up Recommendations

Only real remaining issues.

Do not invent additional scope to keep the project open.

---

# 18. Git / Commit Expectations

Use detailed, scoped commits.

Suggested shape:

```text
MOBILE-A: improve responsive design foundations
MOBILE-B: refine mobile app shell and navigation
MOBILE-C: overhaul public mobile acquisition flows
MOBILE-D: improve core staff phone workflows
MOBILE-E: standardize responsive workspace interactions
MOBILE-F: improve marketing and event mobile UX
MOBILE-G: make reports and admin screens phone-friendly
MOBILE-H: complete responsive QA and polish
```

Exact wording may differ.

Do not commit unrelated changes unless they are pre-existing changes that must remain in the branch. Clearly distinguish pre-existing work in the results document.

Push after every successful sub-milestone.

---

# 19. Stop Conditions

STOP rather than improvising if:

- a requested responsive change requires changing a business rule;
- current code contradicts the audit in a way that materially changes scope;
- a database/schema migration appears necessary;
- public Trial semantics would change;
- RBAC/Access Rights would weaken;
- existing uncommitted work would need to be destroyed;
- tests fail for reasons introduced by the current sub-milestone and cannot be safely resolved;
- implementation would require a separate mobile application;
- a major product decision not resolved in this prompt becomes unavoidable.

Document the blocker in the results `.md`.

---

# 20. Definition of Done

This implementation is complete when:

### Public

A prospect can comfortably:

```text
open social link
→ understand offer
→ enter contact information
→ schedule themselves/family
→ submit
→ understand confirmation
```

at phone widths without zooming, fighting keyboards, or scrolling through unnecessarily enormous controls.

### Staff

A staff member can comfortably:

```text
open app
→ see work
→ find household
→ call
→ understand Trial
→ mark outcome
→ complete Follow-Up
→ add note
```

with one hand and without sideways operational tables or walls of equal buttons.

### Marketing

Campaign/Event operations remain fully reachable and understandable on phone.

### Admin

All administrative capabilities remain reachable and usable, even when desktop remains the preferred environment for complex configuration.

### Desktop

The accepted desktop/laptop experience remains intact.

### Engineering

The responsive behavior is implemented primarily through shared design-system improvements and reusable patterns rather than dozens of isolated CSS patches.

### QA

All automated checks pass, all available browser QA is documented honestly, commits are pushed, and the required implementation-results `.md` is complete.

---

# Final Instruction

Implement MOBILE-A through MOBILE-H sequentially.

After each sub-milestone:

```text
IMPLEMENT
→ REVIEW
→ QA
→ TEST
→ DOCUMENT
→ COMMIT
→ PUSH
→ CONTINUE
```

Do not skip the QA boundary between sub-milestones.

At the end, create:

```text
vault/wip/Full_Project_Mobile_UI_UX_Implementation_Results_2026-09-08.md
```

Then STOP.

Do not begin unrelated feature work.
