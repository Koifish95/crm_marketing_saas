# Cursor Prompt — Assets Gallery + Content Workspace UI/UX Redesign

## Objective

Perform a substantial UI/UX redesign of the Renzo CRM **Assets** and **Content** experiences.

This is an **implementation task**, not a design-only exercise.

The current functionality is useful, but the interfaces do not match the real user jobs:

- Assets are visual media records, but the page presents them primarily as a sparse table.
- Content is a workflow around planning, creative, review/readiness, and publication, but the page currently feels like one long CRUD form split into similarly styled cards.

The redesign should make these two areas feel like one coherent marketing workflow:

```text
Upload photos/videos
        ↓
Asset Gallery
        ↓
Create / edit Content
        ↓
Write copy
        ↓
Choose media visually
        ↓
Set channel / publisher / timing
        ↓
Ready to publish
        ↓
Staff manually posts
        ↓
Record publication
```

Preserve all existing business logic, routes, APIs, RBAC, campaign relationships, publication history, asset-use status rules, and manual-publishing behavior unless a narrowly scoped UI change requires otherwise.

Do not add automatic Meta publishing.

Do not redesign the domain model unless repository inspection proves a small supporting change is necessary.

---

# 1. Read Before Coding

Before implementation:

1. Read `AGENTS.md`.
2. Read the current mobile UI/UX audit and implementation-result documents if present.
3. Read M9 design/workspace documentation.
4. Inspect:
   - `/marketing/assets`
   - `/marketing/assets/:id`
   - `/marketing/content`
   - `/marketing/content/:id`
5. Inspect existing:
   - Asset schema/model
   - Asset usages
   - marketing-use status behavior
   - Campaign associations
   - Content statuses
   - Content channels
   - Content publications
   - approval behavior
   - publisher assignment
6. Inspect current shared UI primitives:
   - AppPanel
   - AppPageHeader
   - AppRecordWorkspace
   - AppRecordSelector
   - AppRecordTabs
   - AppButton
   - AppField
   - AppBadge
   - AppConfirm
   - overflow/menu/sheet components created by recent mobile work
7. Inspect current responsive/mobile behavior.
8. Preserve any accepted work already present in the current branch.

Do not assume screenshots represent the latest code if implementation has moved forward.

Current repository reality is authoritative.

---

# 2. Design Goal

The final experience should communicate:

## Assets

> This is a visual media library.

Users should primarily browse **images and videos visually**, not inspect rows of metadata.

## Content

> This is a content-production workspace.

Users should understand the current content item immediately and move through:

```text
Plan
→ Creative
→ Publish
```

without feeling like they are filling out one large administrative form.

The Assets and Content experiences should feel related and intentionally designed together.

---

# 3. Assets Page — Replace the Table-First Experience

Current problem:

The Assets page shows a row-based list containing fields such as:

- Asset
- Type
- Campaign
- Marketing use

This does not help a user answer the primary question:

> Which photo or video is this?

Replace the primary Assets list with a **responsive visual gallery**.

---

# 4. Assets Gallery Card Design

Each asset should render as a visual card.

Conceptual structure:

```text
┌─────────────────────────────┐
│                             │
│       IMAGE / VIDEO         │
│          PREVIEW            │
│                             │
│             ▶               │
├─────────────────────────────┤
│ Kids Class Photo            │
│ September Campaign          │
│ Image              Approved │
│                         ⋮   │
└─────────────────────────────┘
```

The media preview must dominate the card.

Below the preview, show only the most useful metadata.

Recommended first-glance information:

1. Display name / title
2. Campaign association, if any
3. Asset type
4. Marketing-use status
5. Overflow/management action

Do not replicate every database field on the gallery card.

Clicking the card or a clear Manage/Open action should navigate to the existing asset detail route.

---

# 5. Asset Thumbnails / Video Preview

## Images

Display an actual image thumbnail.

Use appropriate `object-fit: cover` or equivalent behavior to maintain a consistent gallery aspect ratio without distorting the media.

## Videos

Provide a visually useful video card.

Preferred order:

1. use an existing poster/thumbnail if the project already stores one;
2. otherwise use the video element's first frame/poster behavior if practical;
3. if a real thumbnail is not safely available, use a clean video preview placeholder with a prominent play indicator.

Do not implement a large media-processing pipeline solely for thumbnails.

Do not load full-resolution media unnecessarily into every gallery card if a safer/lighter existing URL/path can be used.

Document the chosen thumbnail strategy.

---

# 6. Responsive Asset Grid

Use a responsive grid.

Recommended behavior:

```text
Phone:
1 column, or 2 only if cards remain large enough to identify media clearly

Tablet:
2 columns

Desktop:
3–4 columns depending on available content width
```

Prefer visual clarity over forcing more cards onto the screen.

No horizontal scrolling gallery.

Cards should maintain consistent media-preview proportions.

---

# 7. Assets Page Header / Upload UX

The upload form should no longer permanently dominate the top of the Assets page.

Use a page structure conceptually similar to:

```text
Assets                                      [ + Upload asset ]

Store and organize photos and videos for campaign work.

[ Search assets... ] [ Campaign ▼ ] [ Type ▼ ] [ Use status ▼ ]

[ visual asset gallery ]
```

`+ Upload asset` should open a focused upload experience.

Use whichever responsive interaction pattern is already established by the application:

- desktop modal/drawer;
- phone sheet/full-screen form;
- or a focused existing route if the repository already has a better pattern.

Do not invent a second design system.

---

# 8. Asset Upload Form

The upload experience should contain:

- File
- Display name
- Description
- Campaign
- existing marketing-use/default behavior where applicable
- media preview before final submission where practical

After successful upload:

- close the upload surface;
- refresh the gallery;
- show the new asset prominently;
- provide clear success feedback.

Preserve existing server rules and marketing-use semantics.

The existing statement:

> This is not a legal consent system.

should remain available where useful but should not dominate the primary gallery UI.

Use subdued explanatory copy.

---

# 9. Asset Search and Filters

Inspect existing API support.

Where safely supported, provide useful asset discovery:

- search by title/display name;
- Campaign filter;
- type filter;
- marketing-use status filter.

Do not build complex filtering infrastructure if the backend does not support it cleanly.

If some filters are not currently feasible, implement the strongest supported subset and document the limitation.

Use the application's current responsive filter pattern.

On phone, do not stack four huge filters above the gallery if a filter sheet/drawer pattern already exists.

---

# 10. Asset Detail

Review `/marketing/assets/:id`.

The detail page should remain the place for deeper metadata and management.

Improve its relationship to the gallery if needed.

At minimum, the detail view should include:

- large media preview;
- title;
- type;
- Campaign relationship;
- description;
- marketing-use status;
- restrictions/notes if applicable;
- usage relationships;
- archive/delete behavior according to existing rules.

Do not duplicate every detail onto the gallery card.

---

# 11. Content Detail — Redesign as a Workspace

Current problem:

The Content detail page contains multiple cards, but visually they read as one long administrative form.

Problems include:

- weak section hierarchy;
- tiny section labels;
- similar styling for every block;
- excessive left-edge alignment;
- weak distinction between planning, creative work, and publication;
- state transitions displayed like unrelated buttons;
- media selection through a plain dropdown rather than visual selection.

Redesign the Content detail experience around three major workflow sections:

```text
1. PLAN
2. CREATIVE
3. PUBLISH
```

These should be visually distinct stages of work, not three generic boxes with tiny labels.

---

# 12. Content Workspace Header

The top of the content record should immediately answer:

```text
What content item am I looking at?
What state is it in?
Which Campaign / channels is it associated with?
What is the next relevant action?
```

Conceptual structure:

```text
← Content Queue

Content Test                                  Draft
September Campaign · Facebook · Instagram

                                  [ Save changes ] [ More ⋮ ]
```

Preserve the existing record selector / previous-next behavior where it is part of the accepted M9 workspace pattern.

Do not duplicate the record identity again inside the Plan section.

Avoid the current feeling of:

```text
record header
then
another header-like form section
then
another header-like form section
```

---

# 13. Content Section 1 — Plan

Purpose:

> Define what this content item is, where it belongs, who owns it, and when it should be published.

Include the existing supported fields such as:

- Title
- Campaign
- Publisher
- Channels
- Planned publication date/time
- Approval-required behavior
- internal planning notes where appropriate

Use clear field grouping.

Desktop may use two columns where appropriate.

Phone should remain one column.

Do not over-compress controls into wide horizontal grids.

Use real spacing and padding.

Target conceptually:

```text
PLAN

Title
[ Content Test                                      ]

Campaign                     Publisher
[ September Campaign ▼ ]     [ Marta ▼ ]

Channels
[ Facebook ] [ Instagram ] [ Other ]

Planned publish
[ Date ] [ Time ]

[ ] Approval required
```

---

# 14. Content Status / Workflow Controls

Current state-transition actions should not appear as several equally weighted tiny controls such as:

```text
Save plan
Needs assets
Draft
Ready to publish
Cancel
```

Separate:

```text
Save/persistence
```

from:

```text
Workflow state transition
```

Use a clear status badge in the header.

Use one deliberate workflow control.

Conceptually:

```text
[ Save changes ]  [ Move to: Ready to publish ▼ ]
```

or another established application pattern.

Valid state transitions must still respect current server/business rules.

Do not expose transitions that are invalid for the current record.

Destructive/cancel behavior belongs in `More` or another secondary/destructive control.

Do not change the underlying Content status enum or lifecycle unless required by existing implementation.

---

# 15. Content Section 2 — Creative

This should be the **visual and editing center** of the Content workspace.

The current Body/Caption field and asset dropdown do not adequately represent content creation.

Use a strong Creative section.

Conceptually:

```text
CREATIVE

Post copy

┌─────────────────────────────────────────────┐
│                                             │
│ Caption / body                              │
│                                             │
└─────────────────────────────────────────────┘

Attached media

┌─────────────────┐   ┌─────────────────┐
│                 │   │                 │
│   PHOTO         │   │    VIDEO ▶      │
│                 │   │                 │
└─────────────────┘   └─────────────────┘
Kids class photo      Technique clip
[ Remove ]            [ Remove ]

[ + Add media ]
```

Caption/body should receive enough visual space to feel like the primary creative field.

Do not make it a tiny administrative textarea.

---

# 16. Visual Asset Picker from Content

Replace the existing plain:

```text
Choose asset ▼
Attach
```

interaction with a **visual asset picker**.

Use the same gallery-card/thumbnail language as the Assets page.

`+ Add media` should open a selector containing:

- thumbnails;
- asset title;
- type;
- Campaign association;
- marketing-use status.

Allow selection of eligible assets according to existing server/domain rules.

If assets marked `DO_NOT_USE` or otherwise restricted are not attachable under current rules, preserve those rules and make the restriction visually obvious.

If RESTRICTED assets are attachable under existing behavior, show the restriction clearly.

Do not invent consent logic.

---

# 17. Attached Asset Presentation

Once attached, display visual thumbnails directly in the Content workspace.

Show:

- preview;
- title;
- type;
- use-status warning where relevant;
- Remove/Detach action.

Use responsive thumbnail cards.

Do not reduce attached media back to filenames.

Preserve asset-usage records/history according to existing implementation.

---

# 18. Content Section 3 — Publish

Purpose:

> Record the manual publication after someone posts the content.

M9 intentionally does **not** automatically publish to Meta.

Preserve that boundary.

Design the section clearly around:

```text
Planned publication
Current publishing readiness
Recorded publications
```

Example:

```text
PUBLISH

Ready to publish

Planned
Sep 10, 2026 at 6:00 PM

Record manual publication

Channel
[ Facebook ▼ ]

Public URL
[ https://facebook.com/...                  ]

[ Record publication ]
```

The explanatory text:

> The app does not publish to Meta.

should remain as subdued help copy.

Do not let explanatory text visually compete with the primary controls.

---

# 19. Publication History

If publication records already exist, present them as a useful history.

For each publication:

- channel;
- date/time;
- public URL;
- external post ID if useful;
- actor if available.

Do not force this into a wide table on phone.

Use compact records/cards if necessary.

---

# 20. Content Index

Review `/marketing/content`.

The index should remain a scannable queue.

Do not turn the index into another large form.

At minimum, each content record should make clear:

- title;
- status;
- Campaign;
- channels;
- planned publish date;
- publisher;
- thumbnail/asset preview if available and cheap to render.

A small thumbnail can substantially improve recognition.

Do not overload every row/card with full creative copy.

Clicking opens the detail workspace.

---

# 21. Spacing / Visual Hierarchy Requirements

The user's primary complaint is not only functionality.

The current page looks visually weak because everything appears similarly indented and similarly weighted.

Correct this deliberately.

Use consistent hierarchy:

```text
Page
  ↓
Record header
  ↓
Major workflow section
  ↓
Field group
  ↓
Field
```

Do not use:

```text
box
inside box
inside box
inside box
```

without a meaningful hierarchy reason.

Use:

- stronger major-section headings;
- comfortable section padding;
- clear spacing between sections;
- restrained borders/dividers;
- deliberate whitespace;
- consistent alignment.

Recommended baseline unless current design tokens suggest better values:

```text
Phone section horizontal padding: ~16px
Desktop section padding:          ~24px
Major section gap:                ~20–24px
Field gap:                        ~12–16px
```

Use existing shared tokens/components where possible rather than scattering raw page-specific values.

---

# 22. Mobile Requirements

These pages are included in the project's phone-friendly standard.

## Assets

Phone:

- 1-column gallery by default;
- potentially 2 columns only when previews remain genuinely usable;
- full-width touch-friendly media cards;
- upload opens a phone-friendly sheet/full-screen form;
- filters do not dominate the viewport.

## Content

Phone:

- one-column Plan fields;
- large Creative textarea;
- attached assets stacked cleanly;
- visual Asset picker uses a sheet/full-screen selector;
- Publish controls stack;
- workflow state remains obvious;
- no tiny status/action links.

No horizontal page scrolling.

No desktop-sized modal forms.

---

# 23. Desktop Requirements

Desktop should remain efficient.

Assets should use the available width with 3–4 gallery columns.

Content Plan may use deliberate two-column field groupings.

Creative should use substantial width.

Do not make desktop feel like a stretched phone layout.

Preserve the accepted Renzo visual identity.

---

# 24. Accessibility

Preserve/improve:

- semantic labels;
- keyboard navigation;
- focus states;
- menu semantics;
- dialog/sheet semantics;
- buttons vs links;
- accessible status text;
- image `alt` behavior where appropriate;
- video controls/labels where applicable;
- touch targets.

Asset thumbnails should not rely only on image appearance to communicate status/type.

Do not make media controls hover-only.

---

# 25. Performance

Avoid loading unnecessarily large original media files in the gallery.

Inspect the current asset serving architecture.

Use the safest practical browser strategy for thumbnails/previews.

Do not introduce:

- a large image-processing service;
- a video-transcoding pipeline;
- a new external media platform

just to complete this UI pass.

If true thumbnail generation is not currently supported, use efficient browser preview behavior and document the limitation.

---

# 26. Preserve Existing Functionality

Audit all current Assets and Content functions before changing UI.

At minimum preserve:

## Assets

- upload;
- display name;
- description;
- Campaign association;
- type;
- marketing-use status;
- restricted note behavior;
- archive/delete rules;
- asset usages;
- detail route;
- permissions.

## Content

- title;
- Campaign;
- publisher;
- channels;
- planned publication;
- approval-required behavior;
- statuses;
- internal notes;
- body/caption;
- asset attachment;
- asset detachment;
- publication recording;
- publication history;
- public URL;
- external post ID;
- permissions;
- approval rules.

Do not lose functionality in the name of simplification.

---

# 27. Scope Constraints

This task is specifically:

```text
Assets UI/UX
+
Content UI/UX
+
shared visual media-selection interaction
```

Do not:

- redesign the entire Marketing module;
- redesign Campaigns;
- redesign Marketing Tasks unless a shared component requires a harmless update;
- change acquisition business logic;
- modify M10 infrastructure;
- modify NGINX;
- modify Docker;
- modify DNS;
- change Meta integration behavior;
- add automatic Meta publishing;
- build a DAM;
- build legal-consent software;
- build image/video processing infrastructure;
- migrate database technology.

---

# 28. QA

Run targeted functional and visual QA.

## Assets

Test:

- no assets;
- one image;
- many images;
- one video;
- mixed images/videos;
- long title;
- no Campaign;
- Campaign-associated;
- Unknown use status;
- Approved;
- Restricted;
- Do Not Use;
- upload success;
- upload failure;
- asset detail;
- archive/delete behavior according to existing rules;
- desktop grid;
- phone grid.

## Content

Test:

- new/empty content item;
- Draft;
- Needs Assets;
- Ready to Publish;
- approval-required state;
- Facebook only;
- Instagram only;
- both channels;
- Campaign assigned;
- no Campaign;
- publisher assigned/unassigned;
- long caption;
- no assets;
- one image;
- multiple images;
- video;
- mixed media;
- restricted asset;
- detach asset;
- planned publication;
- record Facebook publication;
- record Instagram publication;
- publication history;
- long public URL;
- desktop;
- phone.

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

# 29. Git Discipline

Before editing:

```bash
git branch --show-current
git status
git log -1 --oneline
git remote -v
```

Do not overwrite unrelated existing work.

Review final changes with:

```bash
git status
git diff
```

Use logical commits.

Recommended shape:

```text
feat(marketing): redesign assets as visual media gallery
feat(marketing): redesign content workspace and visual asset selection
```

Exact commit structure may differ if shared components justify another bounded commit.

Push after successful QA.

---

# 30. Required Return Document

Create:

```text
vault/wip/Assets_and_Content_UI_UX_Redesign_Results_2026-09-08.md
```

Document:

## Starting state

- branch;
- HEAD;
- relevant dirty work.

## Assets

- original problems;
- final gallery design;
- responsive grid behavior;
- image thumbnail behavior;
- video preview behavior;
- upload redesign;
- filters/search;
- detail-page changes;
- files/components changed.

## Content

- original problems;
- final workspace hierarchy;
- Plan design;
- Creative design;
- Publish design;
- status-transition UX;
- visual Asset picker;
- attached media presentation;
- publication-history presentation;
- content-index changes;
- files/components changed.

## Shared Components

Document any new/reused:

- media card;
- asset picker;
- upload sheet;
- overflow action;
- responsive section;
- gallery;
- thumbnail component.

Do not overstate generic reuse if the components remain marketing-specific.

## QA

Record exact:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

results.

Also document browser/mobile visual QA actually performed.

Clearly distinguish:

```text
CODE-VERIFIED
AUTOMATED-TESTED
BROWSER-VERIFIED
HUMAN-QA-PENDING
```

## Git

- commits;
- push result;
- final HEAD.

## Deviations

Explain anything requested but not implemented and why.

## Remaining Issues

Only real remaining issues.

---

# 31. Definition of Done

The Assets experience is complete when a user can look at the page and immediately recognize their photos/videos visually without opening records one at a time.

The Content experience is complete when a user can immediately understand:

```text
what am I making?
where/when is it planned?
what copy/media am I using?
what state is it in?
has it been published?
```

without mentally decoding a long generic form.

The two pages should feel like parts of one coherent marketing workflow.

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
