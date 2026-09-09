# Cursor Prompt — Marketing Task Workspace UI/UX Redesign

## Objective

Perform a substantial UI/UX redesign of the Renzo CRM **Marketing Task detail/workspace** experience.

This is an **implementation task**, not a design-only exercise.

The current Marketing Task page is functionally useful, but it behaves like a large editable database form rather than an operational work item.

The redesign should make the page immediately answer:

```text
What needs to be done?
Who owns it?
When is it due?
What Campaign / Content / Asset / Event is it related to?
Is it open, overdue, completed, or cancelled?
What is the next action?
```

Core design principle:

> **A Marketing Task is an actionable work item, not a form.**

Opening a task should show the task. Editing should be an explicit action.

Preserve existing Marketing Task routes, API contracts, task types, statuses, assignee behavior, Campaign/Content/Asset/Event relationships, due-date logic, permissions, and completion/cancellation behavior unless a narrowly scoped UI change requires otherwise.

---

# 1. Read Before Coding

Before implementation:

1. Read `AGENTS.md`.
2. Read the latest:
   - M9 Marketing Task documentation;
   - mobile UI/UX audit/results if present;
   - Campaign workspace redesign results if completed;
   - Assets/Content redesign results if completed.
3. Inspect:
   - `/marketing/tasks`
   - `/marketing/tasks/:id`
4. Inspect all current Marketing Task APIs and schema.
5. Inspect:
   - task type enum;
   - task status enum;
   - due-date behavior;
   - overdue/due-today derivation;
   - assignee;
   - creator;
   - Campaign relationship;
   - Content relationship;
   - Asset relationship;
   - Event relationship;
   - completion behavior;
   - cancellation behavior;
   - notes;
   - permissions/RBAC.
6. Inspect current shared components:
   - AppRecordSelector;
   - AppPageHeader;
   - AppPanel;
   - AppBadge;
   - AppButton;
   - AppOverflowMenu;
   - responsive selectors/sheets;
   - shared record cards;
   - Asset preview/card components if created.
7. Preserve valid existing work already present in the branch.

Current repository reality is authoritative.

---

# 2. Current Problem

The current task detail page exposes nearly all editable fields immediately:

- title;
- type;
- description;
- due;
- assignee;
- Campaign;
- related Content;
- related Asset;
- related Event;
- notes;
- Save;
- Complete;
- Cancel.

This creates several UX problems:

- The task's actual purpose is visually weak.
- Every field appears equally important.
- Save, Complete, and Cancel are displayed as similar actions despite representing different concepts.
- Related records are shown as foreign-key dropdowns rather than useful context.
- Due/overdue urgency is understated.
- Notes look like another generic textarea.
- The page does not feel like an operational queue item.

The default state should become **readable and action-oriented**.

---

# 3. Desired Task Header

Redesign the header so the user immediately understands the work item.

Conceptual direction:

```text
← All Tasks

First Post Request Assets                    OPEN
Request assets · Due today

September Campaign
Assigned to Marta Rodrigues

[ Complete task ]   [ Edit ]   [ More ⋮ ]
```

If overdue:

```text
OVERDUE
Due Sep 8 at 8:35 PM
```

If completed:

```text
COMPLETED
Completed Sep 8 at 9:12 PM
```

Use current task data and terminology.

Do not overload the header with every relation.

The task title, status, due state, assignee, and Campaign context should dominate.

---

# 4. Due / Overdue Priority

Due state should be visually obvious.

Preserve current server/client due-state logic.

Use restrained but clear hierarchy for:

```text
Overdue
Due today
Upcoming
Completed
Cancelled
```

Do not invent a new task scheduler.

Do not rely on color alone.

---

# 5. Default View = Read-Only Operational Summary

The normal task detail page should not render the edit form by default.

Use clear sections.

## Task

Display:

- description;
- task type.

Conceptually:

```text
TASK

Description
Request photos for the first September Campaign post.

Type
Request assets
```

If description is empty:

```text
No description provided
```

Do not render an empty textarea.

## Assignment

Display:

- assignee;
- due date/time;
- status.

Example:

```text
ASSIGNMENT

Assignee
Marta Rodrigues

Due
Sep 8, 2026 at 8:35 PM

Status
Open
```

If unassigned, show `Unassigned`.

Use America/Denver display behavior already established by the application.

---

# 6. Related Work — Show Real Relationships, Not Dropdowns

The read-only view should show the actual linked records as operational context.

Conceptually:

```text
RELATED WORK

Campaign
September Campaign
[ Open campaign ]

Content
First September Post
[ Open content ]

Asset
Kids Class Photo
[ Open asset ]

Event
Not linked
```

If no relation, show `Not linked`.

Use actual stable routes where available.

Do not invent duplicate navigation.

---

# 7. Related Asset Visual Preview

If the task has a related Asset, use the visual Asset component/pattern from the Assets redesign.

Show a compact thumbnail card with:

- preview;
- title;
- Campaign;
- marketing-use status if important.

Do not reduce visual media back to a filename or raw ID.

---

# 8. Related Content Preview

If related Content exists, show useful context such as:

- Content title;
- status;
- Campaign;
- planned publish date;
- small thumbnail if already available cheaply.

Do not render the entire Content body inside the task.

Provide an Open Content action/link.

---

# 9. Notes

Read-only mode should display Notes as readable text.

Example:

```text
NOTES

Need 3–5 photos from the kids class.
Prefer action shots with multiple students training.
```

If none:

```text
No notes
```

Do not show an empty textarea in normal view.

Do not introduce a comments/history model unless one already exists.

---

# 10. Action Hierarchy

Current:

```text
Save
Complete
Cancel
```

is not acceptable.

Default task view should use:

```text
[ Complete task ]   [ Edit ]   [ More ⋮ ]
```

Primary action should depend on current task state.

Do not invent reopen behavior.

---

# 11. More Menu

Use `AppOverflowMenu` or current shared equivalent.

Possible actions based on existing supported behavior:

- Reassign;
- Change due date;
- Cancel task;
- other legitimate secondary actions.

Do not add capabilities that do not exist.

Task cancellation should be visually destructive and require existing confirmation behavior if applicable.

Do not put Cancel task beside Complete as an equal peer.

---

# 12. Explicit Edit Mode

Provide `Edit` to enter task editing.

Edit mode may stay on the same route.

Conceptual editor:

```text
EDIT TASK

Task
Title
Type
Description

Assignment
Assignee
Due

Related Work
Campaign
Content
Asset
Event

Notes

[ Discard changes ]                 [ Save changes ]
```

When save succeeds:

- persist;
- exit Edit mode;
- return to readable task view;
- show clear save feedback.

---

# 13. Save vs Task Cancellation

Use:

```text
Discard changes
Save changes
```

for form editing.

Do not use `Cancel` for discarding edits if `CANCELLED` is also a task lifecycle state.

Task cancellation belongs in lifecycle controls / More.

---

# 14. Task Type Presentation

Task type should be easy to recognize in read-only mode.

Examples:

- Request assets
- Draft caption
- Prepare creative
- Create tracking link
- Review
- Publish
- Review performance
- Weekly summary
- Other

Use a restrained badge/icon/text treatment.

Do not create a rainbow of colors.

Do not change task-type enum values.

---

# 15. Task Status Presentation

Use a clear status badge using actual current statuses.

If stored values are `PENDING`, `COMPLETED`, `CANCELLED`, user-friendly display labels are allowed without changing persisted values.

Due state may be displayed alongside status:

```text
Open · Due today
```

Do not conflate task status with due state in the data model.

---

# 16. Related Record Selection UX in Edit Mode

Where current shared components support it cleanly, improve selectors for:

- Campaign;
- Content;
- Asset;
- Event.

Prefer searchable selectors for large data sets.

Do not introduce complex selector infrastructure just for this page if shared infrastructure does not exist.

For Asset selection, prefer a visual preview where available.

Preserve existing relation semantics.

---

# 17. Campaign Relationship

Campaign should be prominent because most Marketing Tasks are Campaign work.

In read-only mode:

```text
Campaign
September Campaign
```

with a direct Open Campaign action/link.

Do not confuse Campaign ownership with Task assignee.

---

# 18. Phone UX

This page should be excellent on phones.

Desired phone structure:

```text
First Post Request Assets
OPEN · DUE TODAY

Request assets
September Campaign

Assigned to
Marta Rodrigues

Due
Today, 8:35 PM

[ Complete task ]

[ Edit ] [ More ]

----------------

TASK

Request photos for the first
September post.

----------------

RELATED WORK

Campaign
September Campaign >

Content
Not linked

Asset
Not linked

----------------

NOTES

No notes
```

Requirements:

- one column;
- large touch targets;
- no horizontal scrolling;
- no giant editing form until Edit is selected;
- related records easy to open;
- Complete easy to reach;
- destructive actions separated.

---

# 19. Desktop UX

Desktop should remain efficient.

Use a balanced content width.

Possible structure:

```text
Main:
Task
Notes
Related Work

Side:
Assignment
Status
Due
```

or another clean layout consistent with the current design system.

Do not force a sidebar if content becomes sparse.

Edit mode may use two-column field groups.

---

# 20. Marketing Tasks Index

Review `/marketing/tasks`.

The queue should remain operational and scannable.

Each card/row should emphasize:

1. title;
2. task type;
3. due state;
4. assignee;
5. Campaign;
6. status;
7. one primary action/open path.

Do not overload the index with full descriptions or all linked records.

If the index already has a good card pattern from mobile work, preserve it.

Apply only improvements necessary for consistency with the redesigned detail page.

---

# 21. Direct Operational Flow

The redesign should support:

```text
Marketing Tasks
→ open task
→ understand task immediately
→ open related Campaign/Content/Asset/Event if needed
→ complete task
→ return to queue
```

without requiring users to inspect a large edit form first.

---

# 22. Visual Hierarchy

Use stronger headings, readable values, whitespace, and existing Renzo navy/paper visual language.

Do not redesign the brand.

Avoid a dominant pattern of tiny labels, dividers, and form controls.

---

# 23. Accessibility

Preserve/improve:

- semantic headings;
- status meaning without color alone;
- focus states;
- button semantics;
- More-menu semantics;
- keyboard navigation;
- selector accessibility;
- touch target sizing;
- confirmation behavior.

Do not make critical actions hover-only.

---

# 24. Preserve Existing Functionality

Before implementation, inventory and preserve:

- title;
- type;
- description;
- due date/time;
- assignee;
- creator if currently surfaced;
- status;
- Campaign relation;
- Content relation;
- Asset relation;
- Event relation;
- notes;
- completion;
- cancellation;
- current permissions/RBAC;
- due bucket behavior;
- task index behavior;
- record selector/prev-next behavior if present.

Do not simplify away functionality.

---

# 25. Scope Constraints

This task is specifically:

```text
Marketing Task detail/workspace
+
minor task-index consistency improvements
+
related-record presentation
```

Do not:

- redesign Campaigns broadly;
- redesign Content broadly;
- redesign Assets broadly;
- change Follow-Up tasks;
- merge Marketing Tasks with Lead Follow-Up;
- add comments/history architecture;
- add task dependencies;
- add recurrence;
- add notifications;
- change Campaign attribution;
- modify M10 infrastructure;
- change Meta behavior.

Marketing Tasks and Lead Follow-Up must remain separate domain concepts.

---

# 26. QA Requirements

Test:

## Statuses

- open/pending;
- completed;
- cancelled.

## Due states

- overdue;
- due today;
- upcoming;
- no due date if supported.

## Assignee

- unassigned;
- assigned.

## Task types

Test several including Request assets, Draft caption, Publish, and Review performance.

## Relationships

- Campaign only;
- Content only;
- Asset only;
- Event only;
- multiple related records;
- no related records.

## Functional

Verify:

- open task;
- Edit;
- Save;
- Discard changes;
- Complete;
- Cancel task;
- assignee update;
- due date update;
- related record navigation;
- permissions remain correct.

## Responsive

Test:

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

# 27. Git Discipline

Before editing:

```bash
git branch --show-current
git status
git log -1 --oneline
git remote -v
```

Do not overwrite unrelated existing work.

Review:

```bash
git status
git diff
```

before commit.

Suggested commit:

```text
feat(marketing): redesign marketing task workspace UX
```

Push after successful QA.

---

# 28. Required Return Document

Create:

```text
vault/wip/Marketing_Task_Workspace_UI_UX_Redesign_Results_2026-09-08.md
```

Document:

- starting branch/HEAD and dirty work;
- original problems;
- final header;
- default Task / Assignment / Related Work / Notes presentation;
- related-record previews;
- Edit mode;
- action hierarchy;
- phone layout;
- desktop layout;
- task-index changes;
- files/components changed;
- exact QA results;
- browser/mobile QA actually performed;
- commit;
- push;
- ending HEAD;
- deviations;
- remaining issues.

Clearly distinguish:

```text
CODE-VERIFIED
AUTOMATED-TESTED
BROWSER-VERIFIED
HUMAN-QA-PENDING
```

---

# 29. Definition of Done

The Marketing Task workspace is complete when opening a task immediately answers:

```text
What do I need to do?
Who owns it?
When is it due?
Is it overdue?
What Campaign is this for?
Is there related Content, Asset, or Event context?
What is the primary next action?
```

without presenting the user with a large edit form by default.

Expected interaction:

```text
View task
→ Complete
```

or:

```text
View task
→ Edit
→ Save
→ return to readable task view
```

The final experience should feel like an **operational work item**, not a database maintenance screen.

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
