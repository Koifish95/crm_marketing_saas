# Cursor Prompt — Full-Project Mobile UI/UX Current-State Audit and Phone-Readiness Analysis

## Purpose

Perform a **comprehensive analysis-only audit** of the entire Renzo Gracie Kaysville application with a specific focus on making the product genuinely excellent on phones.

This task is **NOT** to implement the redesign yet.

The goal is to give ChatGPT and Scott enough evidence to write a later, authoritative, whole-project mobile UI/UX implementation specification.

The requested output must go far beyond a high-level summary. It should explain the current mobile state route-by-route, identify systemic causes, recommend modern mobile-web best practices appropriate to this application, identify shared-component opportunities, document risks, and provide enough technical detail that the next implementation prompt can be precise rather than speculative.

---

# 1. Authoritative Context

Before beginning, review the latest project context and accepted UI/UX direction.

At minimum, inspect:

- current `renzo_crm` repository state;
- current `AGENTS.md`;
- current design-system/shared-component documentation;
- M6 UI/UX implementation/audit documents;
- M8 household UI correction/handoff documents;
- M9 implementation and QA documentation;
- M9 completion/M10 handoff;
- M10 closure / launch handoff;
- any current UI/UX WIP/results documents;
- current `/users` redesign work if it has already been implemented or is in progress;
- current code, not only documentation.

Important project context:

- The application is now live.
- PROD, STAGE, and DEV are Internet-accessible over HTTPS.
- Real campaign operations are beginning.
- Phone usability is now operationally important rather than optional polish.
- M9 established a responsive design direction across desktop, laptop, tablet-like, and phone widths.
- The application contains both internal staff workflows and public acquisition routes.
- Staff should be able to perform core operational work efficiently from a phone.
- Public trial/event signup should be excellent on a phone because prospects will frequently arrive from social media.

Where documentation and implementation disagree, **current implementation wins**.

Do not expose secrets or production data.

---

# 2. Hard Constraint — Analysis Only

Do **not** implement the mobile redesign.

Do not:

- change Vue files;
- change CSS;
- change Tailwind classes;
- change components;
- change routing;
- change schema;
- modify production;
- deploy;
- restart services;
- commit implementation changes;
- begin a responsive refactor.

Safe read-only inspection is allowed.

You may run non-mutating local tests/build/static analysis if useful.

If a useful test would mutate data or runtime state, document it as pending instead of running it.

---

# 3. Required Deliverable

Create:

```text
vault/wip/Full_Project_Mobile_UI_UX_Current_State_and_Phone_Readiness_Audit_2026-09-07.md
```

If repository conventions use another WIP path, use the established project convention but clearly report the final path.

This document will be handed to ChatGPT, which will then create the actual implementation prompt.

The document must be sufficiently detailed that ChatGPT does **not** need to guess:

- which pages are bad on phones;
- why they are bad;
- which shared components cause recurring issues;
- what layout patterns should change;
- what mobile navigation should become;
- what should stack/collapse/hide;
- what should remain visible;
- what should become progressive disclosure;
- what should become cards instead of tables;
- what should become bottom sheets/drawers/dialogs;
- what touch targets need enlargement;
- how forms should behave;
- how record workspaces should adapt;
- where mobile behavior is already good;
- what can be fixed globally vs route-by-route.

---

# 4. Establish Repository and UI Architecture State

Document:

- current branch;
- current HEAD;
- upstream;
- clean/dirty status;
- UI-related uncommitted work;
- whether `/users` redesign work is already present;
- shared design-system files;
- global CSS files;
- Tailwind setup;
- layout/shell components;
- navigation components;
- reusable page-header components;
- card/panel primitives;
- form primitives;
- table/list primitives;
- modal/dialog components;
- tabs;
- badges;
- buttons;
- dropdowns;
- pagination/record selectors;
- date/time controls;
- responsive utilities already in use.

Identify the core files/components that govern application-wide spacing and responsive behavior.

Do not merely list files. Explain what each major primitive currently controls and whether it is a likely leverage point for the mobile redesign.

---

# 5. Inventory the Entire Application Surface

Create a complete route/screen inventory from the actual repository.

Group routes by domain.

At minimum investigate categories such as:

## Public

- `/trial`
- acquisition-event public routes
- any campaign/offer/tracking landing behavior

## Authentication

- login
- forced password change
- logout/session-related screens

## Dashboard

- main dashboard
- operational widgets
- pipeline summaries

## Leads / Households

- Leads index
- Household Lead workspace
- LeadLine/person detail
- create Lead
- trial actions
- follow-up sections
- attribution
- notes/history

## Follow-Up

- Follow-Up queue
- task detail/actions

## Marketing

- Marketing command center
- Campaign index
- Campaign workspace
- Content list/detail
- Marketing Tasks list/detail
- Assets
- Acquisition Events index/workspace
- Event Roster
- Event Process
- Meta-related marketing/performance views

## Reports

- report index
- report filters
- tables/charts
- exports

## Catalog / Configuration

- Programs
- Membership Offerings
- Lead Sources
- other configuration entities

## Users / Access / Security

- Users
- user management
- Access Rights
- Security Activity

## Settings

- application settings
- Meta settings
- environment/admin settings
- any other ADMIN-only pages

Do not rely on this list if the code has more routes.

Build the inventory from repository reality.

---

# 6. Route-by-Route Mobile Readiness Matrix

For **every meaningful route**, create a matrix with fields similar to:

| Route / Screen | Primary User | Primary Mobile Job | Current Phone Quality | Main Problems | Severity | Shared/Systemic? |
|---|---|---|---|---|---|---|

Use ratings:

```text
GOOD
USABLE WITH FRICTION
POOR
BROKEN / UNSAFE
NOT TESTED
```

Severity:

```text
P0 — blocks task / unusable
P1 — major operational friction
P2 — noticeable usability problem
P3 — polish
```

For each route, explain:

- what the user is trying to accomplish;
- whether phone use is likely/common;
- current layout behavior;
- whether the page scrolls horizontally;
- whether important actions are visible;
- whether text wraps badly;
- whether cards become too tall;
- whether there are nested scroll areas;
- whether inputs are comfortable;
- whether dialogs fit;
- whether tables collapse gracefully;
- whether tabs remain usable;
- whether filter bars work;
- whether navigation consumes excessive space;
- whether sticky headers/actions would help;
- whether mobile usage should differ materially from desktop.

Do not say "responsive" merely because CSS classes exist.

Assess actual usability.

---

# 7. Test Representative Phone Viewports

Inspect the UI at representative widths.

At minimum evaluate:

```text
320px
360px
375px
390px
412px
430px
```

Also inspect a short phone viewport where height is constrained.

Include portrait first.

Landscape can be noted for obvious problems but is not the primary target.

If browser automation/screenshots are available safely, use them.

If not, inspect layout/code behavior and clearly label what was inferred rather than visually proven.

Document device-pixel-ratio issues only if they materially affect implementation.

---

# 8. Mobile-First Jobs to Optimize

The audit must distinguish between desktop data-management jobs and phone operational jobs.

For each major user type, identify the most important phone tasks.

## STAFF

Likely phone jobs include:

- open a Lead/household;
- tap phone/email contact;
- see upcoming Trial;
- mark Attended;
- mark No-show;
- reschedule;
- complete Follow-Up;
- add note;
- view assigned work;
- access Campaign/event context where needed.

## ADMIN

Likely phone jobs include:

- quick monitoring;
- campaign status;
- user management in an emergency;
- event/roster oversight;
- operational settings;
- light edits.

Admin-heavy configuration does not need to be optimized as aggressively as daily STAFF workflows, but it must remain usable.

## VIEWER

Likely phone jobs:

- Dashboard;
- acquisition metrics;
- campaign/results overview.

## Public Prospect

Likely phone jobs:

- open tracking link from Facebook/Instagram;
- understand offer;
- enter contact information;
- select one or multiple participants;
- select class/date/time;
- submit trial/event signup;
- read confirmation.

The public flow should receive the highest mobile-quality standard because social acquisition is inherently phone-heavy.

---

# 9. Navigation Audit

Perform a dedicated mobile navigation analysis.

Inspect:

- current sidebar/rail behavior;
- collapse behavior;
- header;
- breadcrumbs;
- page title space;
- Marketing nested areas;
- record selector behavior;
- global back/navigation behavior;
- route depth;
- mobile viewport consumed by chrome.

Evaluate appropriate patterns such as:

- hamburger + drawer;
- compact top bar;
- bottom navigation for a small set of high-frequency staff destinations;
- "More" drawer for low-frequency areas;
- sticky page actions;
- context-aware back buttons;
- persistent primary record identity;
- native-like mobile navigation without turning the product into a separate mobile app.

Do not prescribe bottom navigation automatically.

Assess whether it fits the actual number of primary staff destinations and information architecture.

Provide a recommendation with rationale.

---

# 10. Primary Record Workspace Audit

M9 established workspace patterns for:

- Household Lead;
- Campaign;
- Acquisition Event.

Audit how these workspaces behave at phone widths.

Inspect:

- header identity;
- record selector;
- previous/next;
- status;
- metadata;
- tabs;
- related lists;
- buttons;
- overflow actions;
- long sections;
- accordions/progressive disclosure;
- sticky actions.

Determine whether desktop tab patterns remain appropriate on a phone.

Evaluate alternatives such as:

- horizontally scrollable tabs;
- segmented control;
- select/dropdown;
- accordion sections;
- summary + drill-in routes;
- sticky bottom action bar.

For each workspace, recommend the best mobile pattern.

Do not assume one solution fits all workspaces.

---

# 11. Tables and Dense Lists Audit

Identify every table or pseudo-table in the application.

For each, determine whether mobile should use:

```text
A. horizontal scroll
B. column-priority hiding
C. stacked record cards
D. condensed key/value list
E. dedicated mobile detail route
F. another pattern
```

Give a recommendation per table/list.

Examples likely include:

- Leads;
- Follow-Up;
- Users;
- Reports;
- Campaigns;
- Content;
- Marketing Tasks;
- Assets;
- Event roster;
- security activity;
- configuration lists.

Do not simply wrap every table in `overflow-x-auto`.

Horizontal scrolling is acceptable for some analytical tables but usually poor for operational lists.

Explain which data belongs in the first mobile glance and which belongs behind detail/progressive disclosure.

---

# 12. Forms Audit

Inspect all meaningful forms.

Evaluate:

- single-column behavior;
- label placement;
- input height;
- mobile keyboard types;
- `autocomplete`;
- `inputmode`;
- telephone/email fields;
- date/time pickers;
- select menus;
- multi-select;
- textareas;
- validation;
- inline help;
- sticky submit actions;
- cancel/back behavior;
- very long forms;
- section grouping;
- progressive disclosure;
- dependent fields;
- safe-area behavior.

Special attention:

- public `/trial`;
- public event registration;
- Create Lead;
- Trial schedule/reschedule;
- Campaign create/edit;
- Event create/edit;
- user create/edit;
- authentication/password forms.

Identify forms that should become multi-step on phone vs those that should remain one page.

Do not recommend multi-step unnecessarily; explain conversion cost and error recovery.

---

# 13. Touch and Interaction Audit

Use contemporary mobile-web ergonomics.

Audit:

- touch target sizes;
- icon-only buttons;
- small text links;
- row click areas;
- menus;
- checkboxes;
- radio buttons;
- date controls;
- tab hit areas;
- destructive actions;
- adjacent buttons;
- sticky/footer actions.

Target a practical minimum around 44×44 CSS pixels for primary interactive touch targets unless the design system already uses another defensible standard.

Flag situations where:

- two destructive/primary actions are too close;
- small links are hard to tap;
- hover-only affordances exist;
- desktop-only tooltips hide critical meaning;
- context menus are difficult on touch.

---

# 14. Typography, Spacing, and Density Audit

The project has already experienced recurring problems involving:

- text hugging card edges;
- inadequate padding;
- dense card layouts;
- excessive card stacking;
- inconsistent section spacing;
- metadata wrapping;
- long rows with scattered links.

Determine whether these remain systemic.

Inspect global spacing tokens and actual component usage.

Recommend:

- mobile horizontal page padding;
- card padding;
- section gap;
- heading scale;
- body text scale;
- metadata scale;
- line height;
- compact vs comfortable density;
- max readable width where relevant.

Do not create an arbitrary new visual identity.

Preserve the accepted Renzo design language.

---

# 15. Action Hierarchy and Progressive Disclosure

Audit pages that expose many actions simultaneously.

Examples:

- Users;
- LeadLine actions;
- Trial actions;
- Campaign management;
- Event roster/process;
- Security/admin screens.

Determine which actions should be:

- primary;
- secondary;
- overflow;
- destructive;
- context-dependent;
- hidden until needed.

Phone screens should not become walls of buttons.

Identify where desktop action groups need to become:

```text
Primary CTA
+
More / overflow
```

or a bottom sheet/menu.

---

# 16. Dialogs, Modals, Drawers, and Overlays

Audit all dialog/modal behavior on phones.

Check:

- width;
- max height;
- internal scrolling;
- keyboard overlap;
- action placement;
- close affordance;
- long forms inside dialogs;
- destructive confirmations.

Recommend when desktop modals should become:

- full-screen mobile dialogs;
- bottom sheets;
- dedicated routes;
- responsive drawers.

Do not make every dialog full-screen automatically.

---

# 17. Tabs and Secondary Navigation

Inventory all tab/segmented navigation.

Assess:

- overflow;
- wrapping;
- horizontal scroll discoverability;
- active-state visibility;
- touch size;
- number of tabs;
- whether tab labels are too long.

Recommend per area whether phone should use:

- scrollable tabs;
- dropdown;
- accordion;
- separate nested routes;
- another pattern.

---

# 18. Filters and Search

Audit every filter/search toolbar.

Phone issues to examine:

- four controls in one row;
- equal-width filters;
- overflowing date ranges;
- filter reset visibility;
- active-filter visibility;
- excessive vertical height.

Recommend patterns such as:

```text
Search
[Filters (3)]
```

with a mobile filter drawer/sheet where appropriate.

Do not hide frequently used filters behind excessive taps if they are core to the workflow.

---

# 19. Charts and Reports

Audit charts and analytical reporting on phone.

Check:

- label overlap;
- legends;
- tooltips;
- minimum chart width;
- tables under charts;
- filter UX;
- metric-card stacking;
- scrolling.

Recommend whether phone reporting should prioritize summary KPI cards and a small number of charts rather than reproducing the entire desktop analytical canvas.

Identify reports where horizontal analytical tables are acceptable and where a summarized mobile view is better.

---

# 20. Public Acquisition UX — Highest Priority

Perform a dedicated conversion-focused audit of:

- `/trial`;
- public acquisition-event registration;
- campaign tracking destinations.

Assess from the perspective of a prospect who arrives from Instagram/Facebook on a phone.

Review:

- speed to understand the offer;
- page hierarchy;
- amount of scrolling;
- form length;
- participant selection;
- date/class picker;
- touch targets;
- keyboard/input types;
- error handling;
- ability to resume after validation errors;
- loading states;
- CTA visibility;
- trust/confidence;
- confirmation experience.

Identify anything likely to reduce conversion.

Do not turn this into generic marketing-site redesign. Focus on the acquisition transaction.

---

# 21. Mobile Authentication UX

Audit:

- login;
- forced password change;
- password reset/admin-reset interaction if user-facing;
- session-expired behavior;
- unauthorized redirects;
- staff-login discoverability.

Ensure phone keyboards and password-manager behavior are sensible.

If username login has been implemented, include that state.

---

# 22. Performance Considerations for Phones

Audit likely phone performance issues:

- excessive JS/component weight;
- large images/assets;
- layout shifts;
- slow initial render;
- huge lists rendered at once;
- expensive charts;
- unnecessary client requests;
- image sizing;
- lazy loading;
- long synchronous UI work.

Do not perform speculative premature optimization.

Identify only meaningful current risks.

Distinguish:

```text
PERFORMANCE BLOCKER
NOTICEABLE
LOW PRIORITY
```

---

# 23. Accessibility and Mobile Best Practices

Evaluate against practical modern web accessibility and mobile ergonomics.

Include:

- semantic landmarks;
- focus order;
- visible focus;
- screen-reader labels;
- color contrast;
- touch targets;
- zoom support;
- reduced motion where relevant;
- error announcements;
- field labels;
- button semantics;
- menu semantics;
- dialogs;
- headings;
- link text.

Do not recommend disabling user zoom.

Flag any use of fixed heights or overflow behavior that harms accessibility.

---

# 24. Safe Areas, Browser Chrome, and Sticky UI

Assess whether the app should account for:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

when using sticky/fixed mobile controls.

Evaluate:

- iPhone home indicator;
- browser bottom bars;
- virtual keyboard;
- fixed bottom actions;
- sticky page headers.

Only recommend safe-area handling where fixed/sticky mobile UI makes it relevant.

---

# 25. Design-System Gap Analysis

Create a section specifically answering:

> What shared responsive primitives do we need so Cursor does not fix 40 pages independently?

Evaluate whether the project should add/refine primitives such as:

- MobilePageShell
- responsive AppPageHeader
- responsive ActionBar
- ResponsiveRecordList
- MobileRecordCard
- responsive DataTable wrapper
- FilterBar / MobileFilterSheet
- ResponsiveTabs
- MobileBottomActionBar
- responsive FormSection
- responsive WorkspaceHeader
- OverflowActionMenu
- EmptyState
- LoadingState
- Skeletons
- responsive metric grid

These names are examples only.

Do not recommend a new component if an existing primitive can be extended cleanly.

For every proposed shared primitive, document:

```text
Current repeated problem:
Existing components involved:
Recommended shared change:
Routes that benefit:
Risk:
```

---

# 26. Breakpoint Strategy

Inspect the current breakpoint usage.

Document:

- breakpoints used today;
- inconsistent custom widths;
- duplicated media queries;
- Tailwind breakpoint patterns;
- pages that break before/after standard breakpoints.

Recommend a simple breakpoint philosophy.

Do not over-engineer device-specific breakpoints.

Prefer content-driven layouts using a small consistent set of breakpoints.

Explain whether the current Tailwind defaults are sufficient or where project-specific behavior is justified.

---

# 27. Mobile Content Priority Rules

For each major entity, define what must be visible in the first phone glance.

Examples:

## Household Lead

Potential first-glance priority:

1. household/person identity;
2. aggregate status;
3. primary contact;
4. next Trial / next Follow-Up;
5. members and person outcomes;
6. primary actions.

## Campaign

Potential priority:

1. name/status;
2. objective/offer;
3. active dates;
4. next marketing work;
5. key performance;
6. tracking link/actions.

## Event

Potential priority:

1. name/status/date;
2. registration count/capacity;
3. next session;
4. roster/process status;
5. primary event action.

## User

Potential priority:

1. name;
2. role/access;
3. active state;
4. username/email;
5. one Manage action.

Do not blindly use these examples. Validate against the current domain and workflows.

---

# 28. Desktop Preservation

This is a phone-focused project, but do not degrade accepted desktop/laptop UX.

Identify mobile changes that can be:

- responsive-only;
- shared improvements beneficial everywhere;
- desktop-risky.

Flag cases where a mobile-first simplification would remove desktop efficiency.

The later implementation should preserve strong desktop workflows while producing a distinct, deliberate phone layout where necessary.

---

# 29. Operational Priority Classification

Classify mobile work into:

## Tier 1 — Launch-critical / daily phone workflow

Likely includes:

- public trial;
- public event signup;
- Lead/household quick view;
- Trial actions;
- Follow-Up;
- login;
- Dashboard;
- event roster if staff use it live.

## Tier 2 — Important operational

Likely includes:

- Campaigns;
- Content;
- Marketing Tasks;
- Assets;
- Reports;
- Users.

## Tier 3 — Low-frequency admin

Likely includes:

- deep configuration;
- Access Rights;
- Security Activity;
- Meta settings;
- environment/admin settings.

Use actual workflow evidence to finalize tiers.

---

# 30. Proposed Implementation Phases

The audit should recommend a sensible implementation sequence for a future whole-project phone overhaul.

Do not implement it.

Possible structure:

```text
Phase 0 — Responsive foundations/design-system
Phase 1 — App shell/navigation
Phase 2 — Public acquisition flows
Phase 3 — Core staff operations
Phase 4 — Record workspaces
Phase 5 — Marketing operations
Phase 6 — Reports/admin
Phase 7 — Whole-app QA/accessibility/performance
```

This is only an example.

Recommend the sequence based on dependency and risk.

For each phase include:

- routes/components;
- objective;
- dependencies;
- expected leverage;
- QA needs;
- likely migration/refactor risk.

---

# 31. Questions That Require Scott's Decision

Create a dedicated section containing only genuine product/UX decisions that cannot be resolved from current code or accepted project direction.

Examples might include:

- mobile bottom navigation vs drawer only;
- whether STAFF phone navigation should hide rarely used admin/marketing areas;
- whether certain desktop tables should become cards;
- whether mobile lead workspace should use tabs vs accordion vs nested routes;
- whether sticky bottom actions are desirable for Trial/Follow-Up;
- whether Campaign/Event workspaces need dedicated compact mobile summaries.

For each:

```text
Question:
Why it matters:
Current implementation:
Options:
Recommendation:
```

Do not ask implementation trivia that Cursor can decide.

---

# 32. Current Best Practices for This Specific Product

Create a section titled:

```text
Recommended Mobile Web Best Practices for Renzo CRM
```

Do not provide generic boilerplate.

Tie recommendations to the actual application.

At minimum address:

- touch target sizing;
- mobile navigation;
- single-column forms;
- table transformation;
- sticky primary actions;
- progressive disclosure;
- form keyboard/inputmode;
- phone-number tap actions;
- responsive tabs;
- modal behavior;
- record identity;
- error/loading states;
- confirmation placement;
- filter drawers;
- content priority;
- accessibility;
- public funnel conversion;
- staff speed.

For each best practice include:

```text
Why it matters here:
Current evidence:
Recommended pattern:
Routes affected:
```

---

# 33. Anti-Patterns to Avoid

Identify specific approaches the future implementation prompt should forbid.

Consider:

- merely adding `overflow-x-auto` everywhere;
- shrinking text below comfortable mobile sizes;
- hiding important actions without an alternate path;
- giant hamburger menus with no information hierarchy;
- duplicate mobile-only business logic;
- separate mobile route forks;
- huge fixed-height cards;
- nested scrolling;
- desktop tables squeezed into 360px;
- sticky UI that covers content;
- fixed bottom buttons without safe-area handling;
- hover-dependent controls;
- giant modal forms;
- inconsistent per-page breakpoints;
- changing business rules during responsive work;
- large page-specific CSS patches instead of shared fixes.

Tailor this list to actual findings.

---

# 34. QA Strategy for the Future Implementation

Design a future mobile QA plan.

Include:

## Automated

- existing tests;
- lint;
- typecheck;
- build;
- component/unit tests where useful;
- viewport-level browser tests if framework already supports or can reasonably add them.

## Visual / Browser

Required representative widths:

```text
320
360
375
390
412
430
768
desktop baseline
```

## Scenario QA

Examples:

- public single-person trial;
- public household/multi-person trial;
- public event registration;
- STAFF login;
- Follow-Up completion;
- Trial Attended;
- Trial No-show;
- Trial reschedule;
- Lead quick review;
- event roster;
- Campaign quick update;
- user management;
- report filtering.

## Content stress

- long name;
- long email;
- long Campaign name;
- many badges;
- mixed household;
- many members;
- many tabs;
- no data;
- large list;
- validation errors;
- offline/slow loading where practical.

Recommend screenshot comparison/visual regression only if it fits the current tooling.

---

# 35. Final Prioritized Findings

End the report with three summary tables.

## A. Highest-priority mobile problems

| Priority | Route/Component | Problem | User Impact | Recommended Direction |
|---|---|---|---|---|

## B. Highest-leverage shared fixes

| Shared Component/Foundation | Current Problem | Number/Type of Routes Affected | Recommendation |
|---|---|---|---|

## C. Route-specific fixes that cannot be solved globally

| Route | Unique Mobile Requirement | Recommendation |
|---|---|---|

---

# 36. Recommended Mobile End-State

Describe what the application should feel like after the future implementation.

From a phone, staff should be able to:

```text
open app
→ immediately understand today's work
→ find a household
→ call/text/contact them
→ see Trial status
→ mark outcome
→ complete Follow-Up
→ move on
```

without:

- pinching/zooming;
- sideways scrolling through operational tables;
- hunting through giant action walls;
- opening a desktop-sized modal;
- losing context;
- scrolling through irrelevant empty sections.

A public prospect should be able to:

```text
open link from social media
→ understand the offer
→ enter information
→ select a valid class/event
→ submit
→ understand what happens next
```

with minimal friction.

An ADMIN should still be able to reach all capabilities from a phone, even if complex configuration remains more comfortable on desktop.

---

# 37. Final Required Recommendation

Finish the audit with:

```text
# Recommended Scope for the Whole-Project Mobile UI/UX Implementation Prompt
```

Provide a precise proposed scope that ChatGPT can convert into the next `.md` Cursor implementation specification.

Include:

- which foundations change first;
- which routes are included;
- which shared components should be extended/created;
- which mobile patterns should be standardized;
- what business logic must remain untouched;
- what must be tested;
- what can be deferred.

Do not implement anything.

---

# Evidence Standard

Throughout the report distinguish:

```text
CODE-OBSERVED
VISUALLY-OBSERVED
TESTED
INFERRED
RECOMMENDED
```

Do not describe inferred behavior as visually proven.

Cite actual files/components/routes throughout the document.

Do not rely on generic mobile-design advice where repository evidence is available.

---

# Final Instruction

This audit must be **thorough**.

A short "the app uses responsive Tailwind and needs better stacking" summary is not sufficient.

The report should function as the technical and UX discovery artifact for a serious whole-product mobile redesign.

When complete:

1. create the required `.md`;
2. report its exact path;
3. summarize any truly blocking questions;
4. STOP.

Do not begin implementation.
