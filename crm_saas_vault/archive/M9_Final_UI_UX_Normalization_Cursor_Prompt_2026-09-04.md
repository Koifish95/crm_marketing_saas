---
type: note
status: current
area: process
updated: 2026-09-04
tags:
  - m9
  - ui-ux
  - qa
  - cursor-prompt
---

# Renzo Gracie Kaysville — M9 Final UI/UX Normalization Pass

**Date:** 2026-09-04  
**Branch:** `M9`  
**Mode:** Implementation / Final Human-Acceptance UI/UX Pass  
**Human acceptance gate:** Scott  
**Do not merge M9.**

## Goal

Perform a focused UI/UX normalization pass over the record-oriented screens introduced/refined during M9.

The underlying information architecture and workflows are now substantially correct, but human QA shows that the visual hierarchy has not fully caught up with the record architecture. Long forms, sections, lists, and record headers still require too much visual parsing. The shared record selector is functionally useful but visually under-polished.

This pass should make the application easier to scan, understand, and operate without changing the business model.

This is **not another feature milestone**. It is part of final M9 acceptance before M10 infrastructure/environment work.

---

# 1. Mandatory first step

Before changing code:

1. Confirm the current Git branch is exactly `M9`.
2. Inspect:

```text
git status
git log --oneline --decorate -n 20
```

3. Read this prompt completely.
4. Review the current durable UI/UX and architecture documentation, especially the Primary Record Workspace conventions.
5. Inspect the actual current implementations of:
   - Campaign workspace;
   - Acquisition Event workspace;
   - Household Lead workspace;
   - Content detail;
   - Marketing Task detail;
   - `AppRecordWorkspace` / related shared record primitives;
   - `AppRecordSelector`;
   - current section/card/form/list primitives;
   - Design System documentation.
6. Use the human-QA screenshots supplied with this task as evidence of the visual problems being addressed.
7. Do not assume the screenshots show every affected screen. Inspect the shared components and their consumers.

Repository code is authoritative where older notes are stale.

---

# 2. Hard scope boundary

This is primarily a **presentation architecture** pass.

Preserve existing:

- routes;
- APIs;
- database/schema;
- permissions / Access Rights;
- Campaign semantics;
- LeadHeader / LeadLine semantics;
- Trial semantics;
- Event processing semantics;
- Content semantics;
- Marketing Task semantics;
- Asset relationships;
- compensation rules;
- workflow transitions;
- selector search/navigation behavior;
- contextual creation behavior;
- stable record URLs.

Do not redesign domain behavior merely because a screen is being restyled.

If a true UI defect requires a small behavioral correction, make the smallest safe correction and document it in the final handoff.

Do not add new product features during this pass.

---

# 3. Screens in scope

Apply the normalized visual system to these M9 record-oriented surfaces:

1. Marketing Campaign workspace
2. Acquisition Event workspace
3. Household Lead workspace
4. Content Item detail
5. Marketing Task detail
6. Shared record selector / record navigation chrome
7. Long forms, related-record lists, rosters, and sections inside those screens

Do not proactively redesign Dashboard, Reports, Users, Catalog, Follow-Up Queue, or unrelated administration pages unless a shared primitive changed in this pass naturally improves them and can be regression-tested safely.

---

# 4. Core UX problem

Current pages often contain the correct information but too much of it has approximately the same visual weight.

The user should not have to mentally reconstruct the schema to understand a page.

The visual system must communicate this hierarchy clearly:

```text
PAGE / WORKSPACE
    ↓
PRIMARY RECORD IDENTITY
    ↓
MAJOR SECTION / TAB
    ↓
SUBSECTION OR FIELD GROUP
    ↓
INDIVIDUAL RELATED RECORD / FORM CONTROL
    ↓
SECONDARY METADATA
```

The result should make it immediately obvious:

- what record is open;
- what section the user is working in;
- which fields belong together;
- where one related record ends and another begins;
- which information is primary vs secondary;
- which items are warnings/statuses/actions;
- what action is expected next.

---

# 5. Visual hierarchy rules

Do not solve this by putting every block inside another giant bordered white card.

Use a restrained combination of:

- spacing;
- typography;
- subtle surface/background differences;
- dividers;
- borders where they clarify boundaries;
- grouped field layouts;
- badges for semantic state;
- consistent action placement;
- intentional information density.

## 5.1 Page background

The page background should be visibly distinct from primary working surfaces without becoming visually noisy.

## 5.2 Primary working surfaces

Major logical sections such as:

- Staff Registration;
- Roster;
- Campaign Overview;
- Tracking Links;
- Content planning;
- Task detail;
- Lead member area;

should read as coherent working surfaces.

## 5.3 Subsections / field groups

Long forms must be grouped by meaning rather than rendered as uninterrupted grids of equally weighted inputs.

Use stronger subsection labels and spacing rules.

General rule:

> Larger spacing separates concepts. Smaller spacing connects related information.

## 5.4 Individual related records

Roster rows, Lead members, Content/Task list items, and similar repeated records must have unmistakable visual boundaries.

One record should visually read as one unit.

Do not rely solely on large vertical whitespace to communicate record boundaries.

## 5.5 Semantic colors

Reserve stronger semantic colors for meaning:

- success / processed;
- warning / possible duplicate;
- error / destructive;
- informational state where appropriate.

Do not use many arbitrary colors merely to create separation.

---

# 6. Form normalization

Long forms are a major target of this pass.

Audit the in-scope forms and group fields semantically.

For example, Event Staff Registration currently contains fields such as:

```text
Contact first name
Last name
Phone
Source
Participant first name
Session
```

Visually group these into concepts such as:

```text
CONTACT
- First name
- Last name
- Phone
- Source

PARTICIPANT
- Participant name
- Session
```

Do not mechanically use those exact headings if the current domain language suggests better wording.

Requirements:

- related fields should feel related;
- unrelated groups should have stronger separation;
- primary action should be obvious;
- helper text should be subordinate;
- required markers should remain clear;
- validation/error states must remain accessible;
- avoid excessively wide input controls on large monitors when the data itself is short;
- preserve efficient keyboard/tab navigation.

Do not reduce readability simply to make forms denser.

---

# 7. Related-record list / roster normalization

The Event Roster screenshot is a key reference problem.

The current structure is functionally useful but visually requires too much parsing.

Each registration should visually read as a coherent unit containing information such as:

- household/contact;
- participant;
- session;
- attendance;
- processing state;
- Lead/household relationship;
- duplicate warning;
- custom registration answers;
- exclusion control.

The implementation may use rows, grouped rows, compact cards, or another existing design-system-compatible pattern, but the boundary between records must be obvious.

Prefer concise metadata presentation where possible.

Instead of visually treating every value as a separate paragraph, consider patterns conceptually like:

```text
Josh Coy                                      [Processed]
123-456-7890 · Website
Jaime Coy · First Test Session

Attendance: [Attended ▼]      Lead: Smith Household →

[Possible duplicate] Phone matches Emily Coy household.  Open →
```

This is conceptual, not a literal required layout.

Requirements:

- primary identity is easy to scan;
- secondary metadata recedes visually;
- warnings remain prominent without dominating the whole record;
- actions are clearly associated with the correct record;
- processed/not-processed state is easy to identify;
- custom-question answers do not overwhelm the core operational data;
- responsive behavior remains usable.

Apply the same principles to other repeated related-record lists in the scoped workspaces.

---

# 8. `AppRecordSelector` visual redesign

The current record selector functionality is liked and must be preserved.

Do **not** remove or simplify away:

- current record display;
- dropdown/popover behavior;
- search;
- same-type record switching;
- Previous / Next behavior;
- filtered-context behavior where implemented;
- stable URL navigation;
- keyboard behavior;
- loading/empty states.

The problem is visual presentation.

## 8.1 Current-record presentation

The current pattern can look like a large title followed by a small disclosure triangle, which reads more like a generic HTML disclosure control than a polished record selector.

Redesign the shared selector so the current record identity clearly appears interactive while still functioning as the page's record title.

The exact visual solution should follow the existing Renzo design language, but consider:

- a coherent clickable identity area;
- clear but subtle dropdown affordance;
- record type eyebrow/label;
- primary record name;
- useful secondary metadata when appropriate;
- current status badge adjacent but not visually tangled with the selector;
- hover/focus treatment that communicates interactivity.

Do not make it look like a generic form `<select>`.

Do not make the selector visually dominate the entire workspace.

## 8.2 Selector popover/dropdown

Improve the selector's internal visual hierarchy while retaining behavior.

Audit:

- search input prominence;
- result spacing;
- current/selected record state;
- hover state;
- keyboard focus state;
- status badges;
- secondary metadata;
- result separators;
- max height and scrolling;
- loading state;
- empty state;
- narrow-screen behavior.

A result should be distinguishable at a glance without becoming a large card.

## 8.3 Previous / Next

Previous and Next remain useful and must remain functional.

They should become visually secondary to the selected record identity.

They should not dominate the left side of the record header.

Use the existing icon/button vocabulary if appropriate.

Do not reduce accessibility or hit-target size merely to make them visually smaller.

## 8.4 Shared implementation

Improve the shared selector/primitives rather than creating different selectors for Campaign, Event, Lead, Content, and Marketing Task.

Allow controlled slots/metadata differences where necessary.

Do not over-generalize the component into a framework unrelated to current consumers.

---

# 9. Record header normalization

Audit the full header/chrome around the selector.

The header should establish:

1. record type;
2. record identity / selector;
3. important status;
4. concise contextual metadata;
5. primary record-level actions;
6. secondary Previous/Next navigation.

Avoid:

- competing giant buttons;
- raw long URLs inside constrained header flex rows;
- duplicate identity information;
- multiple equally prominent action clusters;
- layouts that collapse when metadata grows.

Preserve the earlier rule that the header is primarily identity/context/actions, not a second full editing form.

Business-field editing should remain in the appropriate Overview/detail section unless the current accepted screen deliberately uses an inline action.

---

# 10. Workspace / tab hierarchy

Tabs should remain easy to distinguish from both the record header and the content below them.

Audit:

- active-tab state;
- spacing above/below tabs;
- tab wrapping on narrow screens;
- relationship between tabs and section headings;
- whether the first content block feels visually attached to the active tab.

Do not add tabs simply for visual separation.

Preserve existing information architecture:

- Lead remains Members-first;
- Event retains its established workspace tabs;
- Campaign retains its established workspace tabs;
- Content and Marketing Task remain focused detail records rather than being promoted into heavyweight workspaces solely for visual consistency.

---

# 11. Information density

Operational software should be information-rich, not visually sparse for its own sake.

Improve density by:

- combining related secondary metadata where readable;
- reducing unnecessary repeated labels;
- using typographic hierarchy;
- using compact badges;
- aligning related values;
- making actions contextual;
- avoiding enormous empty gaps inside related records.

Do not hide important operational information behind extra clicks simply to make a page look cleaner.

Do not turn every piece of metadata into an icon-only interface.

---

# 12. Responsive behavior

This pass must explicitly consider multiple viewport classes.

At minimum inspect/test:

- large desktop;
- normal laptop;
- tablet / narrow desktop;
- phone-sized viewport.

Requirements:

- workspace content should use available desktop space intelligently;
- forms should not stretch short fields absurdly wide merely because space exists;
- record headers must wrap/reflow safely;
- selectors/popovers must remain usable;
- tabs must remain navigable;
- repeated record layouts must collapse into readable stacked layouts;
- actions must remain associated with the correct record;
- no horizontal overflow from long URLs/names/statuses;
- touch targets remain reasonable.

Do not optimize only for the wide screenshots supplied with QA.

---

# 13. Accessibility

Preserve or improve:

- semantic headings;
- label/input associations;
- keyboard navigation;
- visible focus states;
- selector keyboard operation;
- dialog semantics;
- button semantics;
- status/error announcement where already supported;
- contrast;
- non-color cues for status/warnings.

Do not trade accessibility for visual polish.

---

# 14. Reusable design primitives

Inspect existing components before creating new ones.

Conceptually, the design system should support patterns equivalent to:

```text
AppRecordWorkspace
AppRecordSelector
AppRecordSection
AppRecordSubsection / AppFieldGroup
AppRecordList
AppRecordListItem
AppStatusBadge
AppInlineNotice
```

These names are **not** requirements to create seven new Vue components.

Use judgment.

If an existing component can support the pattern cleanly, extend it.

If a concept is merely a documented spacing/typography convention, document it rather than creating a useless wrapper component.

Avoid page-specific CSS duplication.

Avoid premature generic abstraction.

Campaign/Event/Lead/Content/Task should look like members of the same application, not independently designed screens.

---

# 15. Preserve Renzo visual identity

This is refinement, not a rebrand.

Preserve the current Renzo application identity and existing accepted theme.

Focus changes on:

- hierarchy;
- spacing;
- surface contrast;
- borders/dividers;
- typography scale/weight;
- density;
- grouping;
- selector polish;
- interaction states;
- responsive layout.

Do not introduce a radically different color palette, decorative gradients, excessive shadows, glass effects, or consumer-app styling that conflicts with the operational CRM character.

The desired result is a clean, modern operational application with an Acumatica-inspired record workflow—not a visual clone of Acumatica.

---

# 16. Regression requirements

Because this pass touches shared components, explicitly regression-check functionality.

At minimum verify:

## Campaign
- index → Campaign workspace;
- selector search/switch;
- Previous/Next;
- Overview editing;
- Content;
- Tasks;
- Assets;
- Tracking Links;
- Events;
- Performance permissions;
- copy-link feedback/layout.

## Event
- selector/navigation;
- Overview;
- Sessions;
- Roster;
- Staff Registration;
- attendance save feedback;
- duplicate warnings;
- processed state;
- Process preview/execution UI;
- public URL actions.

## Lead
- selector/search;
- filtered Previous/Next context;
- Members-first behavior;
- `?line=` focus/deep link;
- member lifecycle actions;
- Follow-Up;
- Attribution;
- Notes/History.

## Content
- queue → detail;
- selector/same-type switching;
- Campaign relationship/back navigation;
- editing;
- assets;
- publication actions/history.

## Marketing Task
- queue → detail;
- selector/same-type switching;
- editing/actions;
- Campaign relationship;
- status/assignee/due-date behavior.

Do not accept a visual improvement that breaks workflow behavior.

---

# 17. Testing strategy

Use the repository's existing testing stack.

Do not introduce a new browser/component test framework solely for this pass unless one is already present and appropriate.

Run focused tests after each logical change.

Where visual behavior cannot be fully validated by automated tests, inspect the rendered implementation using the available local workflow and document the manual browser checks Scott must perform.

Final gates:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Record exact results in the handoff.

---

# 18. Git / commit rules

Remain on `M9`.

Use bounded, detailed commits.

Recommended sequence, adjusted if the actual component dependencies suggest a safer order:

## Commit A — Shared record selector and workspace chrome polish

- `AppRecordSelector` visual redesign;
- Previous/Next hierarchy;
- record header layout;
- selector popover/result states;
- responsive/accessibility checks.

Suggested message:

```text
Polish shared record selector and workspace navigation hierarchy.
```

QA, commit, then:

```text
git push origin M9
```

## Commit B — Shared sections, forms, and repeated-record hierarchy

- reusable section/subsection conventions;
- field grouping;
- list/record-item presentation primitives where justified;
- design-system-safe spacing/surface rules.

Suggested message:

```text
Normalize M9 workspace sections, field groups, and record-list hierarchy.
```

QA, commit, push.

## Commit C — Event workspace visual normalization

- Event header/tabs;
- Staff Registration grouping;
- Roster record boundaries/density;
- Process presentation;
- responsive layout.

Suggested message:

```text
Improve Event workspace form, roster, and process readability.
```

QA, commit, push.

## Commit D — Campaign, Lead, Content, and Marketing Task normalization

- apply shared conventions consistently;
- preserve each screen's established information architecture;
- improve long-form grouping and related-record presentation;
- verify selector behavior on each record type.

Suggested message:

```text
Apply normalized record-workspace UX across M9 operational screens.
```

QA, commit, push.

## Commit E — Responsive/accessibility cleanup and durable docs

- cross-screen responsive cleanup;
- accessibility fixes found during review;
- Design System / Architecture documentation;
- final implementation handoff.

Suggested message:

```text
Document and finalize M9 record-oriented UI UX conventions.
```

QA, commit, push.

Additional narrow fix commits are allowed when QA discovers defects.

Do not squash the work merely to reduce commit count.

Do not wait for Scott between these commits unless a stop condition is reached.

---

# 19. Durable documentation

Update the durable documentation so this pass becomes an application convention rather than undocumented CSS cleanup.

At minimum inspect/update where appropriate:

- `vault/Design-System.md`
- `vault/Architecture.md`
- `vault/Decisions.md`
- `vault/Implementation-State.md`
- Primary Record Workspace documentation / M9 handoff material

Document concepts such as:

- record-oriented visual hierarchy;
- workspace → section → field group → record hierarchy;
- semantic spacing rule;
- section/surface usage;
- repeated-record boundaries;
- secondary metadata treatment;
- semantic status colors;
- shared record-selector behavior and visual convention;
- Previous/Next as secondary navigation;
- responsive expectations;
- distinction between full Primary Record Workspace and focused Record Detail;
- avoid excessive nested cards;
- preserve information density while improving scanability.

Do not rewrite old historical handoffs to pretend they always contained these decisions.

---

# 20. Required final handoff document

Create a detailed Markdown handoff under:

```text
vault/wip/
```

Use a descriptive filename similar to:

```text
M9_Final_UI_UX_Normalization_Implementation_Handoff_2026-09-04.md
```

This document will be reviewed by Scott and ChatGPT before M9 acceptance.

It must include all of the following.

## 20.1 Git state

- branch;
- starting HEAD;
- ending HEAD;
- each commit hash/message from this pass;
- push status;
- final `git status`;
- explicit confirmation M9 was not merged.

## 20.2 What was implemented

For each screen/shared component:

- files/components changed;
- visual/interaction changes;
- reused primitives;
- new primitives introduced and why;
- responsive behavior;
- accessibility behavior;
- any deviation from this prompt and why.

## 20.3 Selector redesign

Specifically explain:

- how current-record identity changed visually;
- how the dropdown/popover changed;
- how search/results/current state are presented;
- Previous/Next treatment;
- responsive behavior;
- confirmation that functionality was preserved.

## 20.4 QA evidence

Report exact results for:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also report focused tests/validation performed during each commit.

## 20.5 Errors / problems encountered

Report actual implementation difficulties, including:

- regressions found;
- layout problems;
- responsive issues;
- shared-component conflicts;
- TypeScript/lint/build problems;
- tests that initially failed;
- any workaround used;
- whether any issue remains.

Do not omit problems simply because they were eventually fixed.

## 20.6 Thoughts while coding

Report meaningful observations from the real codebase:

- duplicated presentation logic;
- components that were difficult to reuse;
- brittle CSS/layout areas;
- design-system gaps;
- places where the Primary Record architecture helped;
- places where future cleanup would reduce maintenance cost.

Do not fill this section with generic commentary.

## 20.7 Suggestions

Separate recommendations into:

### Required before M9 acceptance

Only issues that genuinely should block Scott's acceptance.

### Suggested later improvement

Nonblocking ideas for future milestones.

Do not implement unrelated suggestions during this pass.

## 20.8 Known limitations

Explicitly list anything intentionally left unchanged.

## 20.9 Scott browser QA checklist

Provide a screen-by-screen manual QA checklist covering:

- Campaign;
- Event;
- Lead;
- Content;
- Marketing Task;
- record selector;
- Previous/Next;
- long forms;
- repeated-record lists;
- wide desktop;
- normal laptop;
- narrow/tablet;
- phone;
- keyboard/focus behavior;
- long record names/URLs;
- warnings/status badges;
- empty/loading states.

The checklist should make it easy for Scott to decide whether this UI/UX pass is accepted.

---

# 21. Stop conditions

Stop and ask Scott only if implementation reveals a genuine product/architecture contradiction.

Examples:

- the requested visual hierarchy requires changing a settled workflow;
- a shared selector redesign cannot preserve an accepted navigation behavior;
- a proposed reusable primitive would require a major route/API/schema redesign;
- current screens contain contradictory accepted UI rules that cannot both be honored;
- a necessary fix would materially change permissions or domain semantics.

Do not stop for ordinary design implementation choices.

For ordinary choices:

1. inspect existing patterns;
2. prefer consistency;
3. make the simplest reusable implementation;
4. test it;
5. document meaningful judgment calls in the handoff;
6. continue.

---

# 22. Completion condition

Do not stop after improving only the screenshots that triggered this pass.

Continue until:

- shared selector/chrome is polished;
- Campaign is normalized;
- Event is normalized;
- Lead is normalized;
- Content detail is normalized;
- Marketing Task detail is normalized;
- long forms have meaningful grouping;
- repeated related records are clearly separated;
- responsive behavior has been reviewed;
- accessibility has been reviewed;
- focused QA is complete;
- `pnpm test` passes;
- `pnpm lint` passes;
- `pnpm typecheck` passes;
- `pnpm build` passes;
- every bounded commit is pushed to `origin/M9`;
- durable UI/UX documentation is updated;
- the detailed final handoff exists in `vault/wip/`;
- final Git state is reported.

Then stop and return the final implementation summary for Scott's human acceptance testing.

**Do not merge `M9`.**  
**Do not mark M9 accepted on Scott's behalf.**
