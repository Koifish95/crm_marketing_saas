---
type: note
status: current
area: process
updated: 2026-09-03
tags:
  - m9
  - ux
  - prompt
---

# Renzo Gracie Kaysville — M9 Primary Record Workspace UX Implementation

**Date:** 2026-09-03  
**Branch:** `M9`  
**Mode:** Implementation  
**Human acceptance gate:** Scott  
**Primary review input:** [[wip/M9_Primary_Record_Workspace_UX_Architecture_Review]]  
**Earlier draft:** Downloads copy dated 2026-09-03, revised in-repo after Cursor pushback. This file is the implementation contract.

Do not implement from the Downloads draft. This vault note supersedes it.

---

## 1. Objective

Implement the Primary Record Workspace UX architecture across the current M9 application.

The immediate problem exposed during human QA is not merely styling. Several screens have accumulated create, list, edit, and related-record workflows into large vertically stacked card pages. Campaigns are the clearest failure: even two Campaigns are difficult to scan and operate.

Normalize the staff application around this interaction model:

```text
Compact index / queue / library / report
        ↓ open one record
PRIMARY BUSINESS RECORD WORKSPACE
        ↓
Stable record URL + record selector/navigation
        ↓
Short header: identity + state + frequent actions (display/context, not a second editor)
        ↓
Contextual tabs / related records
```

This is primarily UI, route, component, and API-shaping work. **Do not redesign the database merely to support this UX.** The architecture review found no schema redesign is required.

The full Primary Record Workspaces in this pass are:

1. Household Lead
2. Marketing Campaign
3. Acquisition Event

Content Item receives a stable focused detail route, but is **not** promoted to a full Primary Record Workspace in this pass.

Users, Programs, Membership Offerings, Assets, Tracking Links, Trials, Follow-Up Tasks, Marketing Tasks, Meta Campaigns, and configuration entities do **not** become full Primary Record Workspaces.

---

## 2. Mandatory first step: inspect before editing

Before changing application code:

1. Confirm the current branch is `M9`.
2. Inspect the current git status.
3. Do not commit local SQLite database changes or unrelated working-tree changes.
4. Read this contract completely.
5. Read the architecture review completely:
   - `vault/wip/M9_Primary_Record_Workspace_UX_Architecture_Review.md`
6. Read the current durable documentation relevant to this work, including at minimum:
   - `vault/Design-System.md`
   - `vault/Architecture.md`
   - `vault/CRM.md`
   - `vault/Domain-Model.md`
   - `vault/Authentication.md`
   - `vault/Decisions.md`
   - `vault/Implementation-State.md`
7. Inspect the actual routes, components, services, schemas, and tests named by the review.
8. Treat current code as authoritative where historical notes disagree with implementation.

Do not reopen settled M8/M9 business rules unless implementation reveals a genuine contradiction that cannot be resolved from the code and documentation.

There are **no remaining product questions** that require asking Scott before starting. Ordinary implementation details: inspect the codebase, choose the simplest consistent solution, implement it, test it, and document it.

---

## 3. Git workflow

All work remains on the existing **`M9` branch**.

Do not create a new milestone branch.

Use detailed, bounded commits at functional checkpoints. Do not squash the entire overhaul into one commit.

Do not:

- merge `M9` into the canonical branch;
- force-push;
- rewrite history;
- commit `data/renzo.sqlite` or other local runtime data;
- perform unrelated cleanup;
- introduce schema changes merely for UI convenience.

Recommended commit boundaries are in section 19. Adjust them only when the actual code makes a nearby boundary materially safer, and explain any deviation in the final handoff.

### 3.1 Route-safe sequencing (mandatory)

Never change a helper, nav link, or button to target a route until that route exists **and renders**.

Never remove Campaign (or Content) in-place editors until the replacement screen can perform the same essential edits.

Never compact an index by deleting editors in one commit and adding the detail route in a later commit.

Never link to `/marketing/content/:id` until that page exists.

---

## 4. Locked product decisions

These decisions are settled. Do not reinterpret them.

### 4.1 Keep compact indexes

A Primary Record Workspace does **not** replace the compact index.

Indexes answer:

> Which record do I want to work?

Workspaces answer:

> Work this record.

Keep compact indexes for Leads, Campaigns, and Acquisition Events.

Do not make `/marketing/campaigns` a selector-only screen.

### 4.2 Stable record URLs

Use stable record URLs:

```text
/leads/:id
/marketing/campaigns/:id
/marketing/events/:id
/marketing/content/:id
```

Record identity belongs in the route path, not a hash.

Tabs may use `?tab=`. LeadLine focus may use `?line=`.

Lead list working context (search/status/program/source/campaignId) travels on the Lead workspace URL as query keys, **not** in `sessionStorage`.

### 4.3 Lead is Members-first

The Household Lead remains the primary record, but the people are the primary work.

The Lead workspace defaults to **Members**.

Do **not** create an Overview-first experience that hides prospective members.

For this pass, do not create a Lead Overview tab unless implementation exposes a genuine set of household-level information that cannot be cleanly represented elsewhere. Essential household identity/state belongs in the header.

Trials remain person-level. Household trial views may summarize but must not become a second Trial editor.

### 4.4 Campaign index + workspace

`/marketing/campaigns` becomes a compact Campaign index.

Opening a Campaign navigates to:

```text
/marketing/campaigns/:id
```

The Campaign workspace contains searchable record selection and Previous/Next navigation.

### 4.5 Campaign creation

Use a dedicated route:

```text
/marketing/campaigns/new
```

The New screen should contain only the fields needed to establish the Campaign, not another giant planning form.

After successful POST, immediately navigate to the new Campaign workspace.

### 4.6 Content is a focused detail record

Keep `/marketing/content` as the cross-Campaign status/workflow queue.

Add:

```text
/marketing/content/:id
```

The detail screen should be organized into a small number of focused sections such as Plan, Creative, and Publish.

Do not give Content the full selector/Previous/Next/multi-tab Primary Record Workspace treatment yet.

### 4.7 LeadLine deep links

Use:

```text
/leads/:leadId?line=:leadLineId
```

Do not create `/leads/:id/members/:lineId` in this pass.

Opening a deep link should focus/expand the requested person while preserving the Household as the Primary Record.

### 4.8 Meta mapping remains Settings-controlled

Campaign Performance may display:

- mapped/not-mapped state;
- mapped Meta Campaign information;
- Meta-reported metrics;
- a link to Meta Settings when appropriate.

Actual internal Campaign ↔ Meta Campaign mapping remains ADMIN-controlled in `/settings/meta` and remains explicit ID mapping.

Do not move mapping writes into the Campaign workspace.

### 4.9 Users and Catalog stay lightweight

Do not build full Primary Record Workspaces for:

- Users;
- Programs;
- Membership Offerings;
- Lead Sources;
- Lost Reasons;
- Access configuration.

They may receive incidental visual normalization if necessary, but this overhaul must not expand into an ERP-style workspace for every database entity.

### 4.10 Lead Previous/Next preserves working context in the URL

When a Lead was opened from a filtered/searched Lead index, Previous/Next should traverse that working result context.

Copy the originating `/leads` query onto `/leads/:id` (`search`, `status`, `programId`, `source`, `campaignId`, and any other list filters the index already uses). Refresh and shared links keep the same prev/next set.

If the user opened a household from Campaign context with `campaignId` on the URL, Previous/Next walks that campaign’s attributed households via the existing `GET /api/leads?campaignId=` filter.

Do not define Previous/Next as raw database ID traversal.

Do not use `sessionStorage` (or other tab-local stores) as the only context mechanism.

If no meaningful originating context exists, use the normal selector ordering/search behavior.

Do not sacrifice existing Lead list filters/pipeline behavior.

### 4.11 Campaign outcomes vs detailed Performance

**Attributed households are ordinary Campaign context, not report-only data.**

`VIEW_MARKETING` remains enough to:

- open the Campaign workspace (Overview, Tracking, and related operational tabs);
- see basic Campaign outcome information **already exposed** on `/marketing` (command center);
- see an attributed-household **count** on the Campaign index and a link to `/leads?campaignId=`;
- know that Campaign X has N attributed households and navigate to that filtered Leads view.

`VIEW_MARKETING_REPORTS` gates the **detailed Performance analysis** on the Campaign Performance tab (deeper funnel/presentation, Meta-reported series/spend detail, richer outcome breakdowns). It must **not** hide information that `VIEW_MARKETING` can already see on `/marketing` or via the household count + Leads filter.

Do not create a new Access Right.

Do not make `/api/marketing/overview` more restrictive as part of this work.

`GET` of the Campaign record for Overview/Tracking must succeed with `VIEW_MARKETING`. Put reports-gated payload on a separate handler or a clearly gated query (`?view=performance` or `GET /api/marketing/campaigns/:id/performance`) that 403s without `VIEW_MARKETING_REPORTS`. ADMIN continues to have every right in code.

### 4.12 Campaign validates the abstraction

Do not add an isolated commit that only introduces unused `AppRecord*` primitives.

Introduce the minimal shared chrome **in the same commit as the first Campaign consumer** (Campaign workspace header, selector, Overview, Tracking).

Event and Lead adopt those primitives afterward.

Avoid a mega-component that owns data fetching, permissions, business logic, and layout.

### 4.13 Headers are display / context / actions

Headers identify the record, show current state, and offer frequent actions.

They are **not** a second editor.

Editable business fields (status, owner, budget, dates, objective, description, offer, audience, notes, programs, collaborators, channel, actual dates, and similar) belong in **Overview** (or the appropriate tab). One save model.

Frequent header actions include Copy Default Tracking Link, Call (`tel:`), Add Person, Publish/Close registration, and navigation to `/leads?campaignId=` — not live inputs for those business fields.

### 4.14 Tracking-link copy while preparing a Campaign

Allow copying the default (and extra) tracking links for `DRAFT` and `PLANNED` Campaigns.

Whether attribution **resolves** as active remains the existing lifecycle rule (`status === 'ACTIVE'` / synced `active`). Copying a link while preparing a Campaign is operationally necessary.

### 4.15 Contextual creation is lightweight

When creating an attached record from a workspace, inherit the parent id. Do not embed the child’s full editor in the parent.

| From | Create | Then |
|---|---|---|
| Campaign → Add Event | Small interaction sufficient to establish a Draft — **at minimum title**, Campaign inherited | Immediately `navigateTo` `/marketing/events/:id`. Do not embed the Event editor in Campaign. |
| Campaign → Add Content | Enough to establish the Content record (title + inherited `campaignId`; keep other fields at service defaults) | Immediately `navigateTo` `/marketing/content/:id`. **Do not ship this navigation until that route exists.** |
| Campaign → Add Task | Compact contextual form (title, type, due, assignee as needed) with `campaignId` set | Stay on the Campaign Tasks tab; refresh the list. Same `POST /api/marketing/tasks` as the global queue. |

Do not silently create ownership for reference/outcome rows (attributed Leads are not Campaign-owned children).

### 4.16 Campaign Assets use both relationship paths

Campaign Assets must include:

- `assets.campaignId` = current Campaign;
- `asset_usages.campaignId` = current Campaign.

Do not implement only the column on `assets`.

### 4.17 Selector loading

- **Campaign / Event:** slim summary lists (not full aggregates).
- **Lead:** debounced server-side search via existing `GET /api/leads?search=` (and current filters). Do not download every household into the combobox.

### 4.18 Tests match this repository

Add Vitest service/HTTP/unit tests in the existing `tests/` layout.

Do **not** introduce Playwright, Vue Testing Library, or a new component/browser test stack for this correction.

Cover path helpers, hash redirect, GET-by-id, slim list payloads, `campaignId` filters, Performance authorization, and timezone helpers touched by the rewrite. Lead `?line=` may be covered only where the current test architecture already supports route/query logic; do not invent a frontend harness.

---

## 5. Durable architecture rule

The implementation must establish this as a documented application convention:

> Business entities that serve as the central working context for multiple related records use a Primary Record Workspace. A compact index or queue is retained for finding records. Opening a record uses a stable URL and presents searchable record selection, Previous/Next navigation where meaningful, a short stable header containing identity/state/frequent actions, and contextual tabs or sections for related records. Related records created from within a workspace inherit the current Primary Record context. Cross-record queues, libraries, dashboards, and reports remain available when the operational question spans multiple Primary Records. Contextual and global views operate on the same underlying records and server business logic; they do not create parallel data models.

Important corollaries:

- Do not invent `CampaignLine`.
- Do not duplicate Follow-Up Tasks or Marketing Tasks to support contextual tabs.
- Do not duplicate Campaigns for Meta.
- Do not turn every important table into a workspace.
- Child records may have dedicated detail screens without becoming peers of the parent.
- Headers are not editors.
- Basic Campaign outcome context already available with `VIEW_MARKETING` stays available; detailed Performance analysis uses `VIEW_MARKETING_REPORTS`.

---

## 6. Primary/attached/work record model

Preserve these relationships.

### Household Lead — Primary Record

Attached/contextual:

- LeadLines / prospective members
- Trials on LeadLines
- Follow-Up Tasks at household level, optionally related to lines
- Notes
- status history
- acquisition attribution
- per-line Compensation Attribution/history
- conversions/lost outcomes
- compensation earned snapshots
- possible duplicate warnings

Global counterpart:

- `/leads`
- `/tasks`
- `/marketing/compensation`

### Marketing Campaign — Primary Record

Attached/contextual:

- Tracking Links
- collaborators
- Programs
- Content Items
- Marketing Tasks
- Assets / asset usage (both paths)
- Acquisition Events
- attributed households as outcomes/reference, not owned children
- Meta mapping and metrics as external reference/performance, not owned children

Global counterparts:

- `/marketing/campaigns`
- `/marketing/content`
- `/marketing/tasks`
- `/marketing/assets`
- `/marketing/events`
- `/marketing`
- `/leads`

### Acquisition Event — Primary Record

Attached/contextual:

- Sessions
- Questions
- Registrations
- Registration Lines / participants
- attendance
- question answers
- registration history
- processing preview/results
- resulting Lead/LeadLine references
- Event Follow-Up creation/results

Do not promote registration, attendance, or communication intent into top-level workspaces.

### Content Item — Complex Child / Focused Detail

Attached/contextual:

- channels
- assets
- Marketing Tasks where linked
- approval state/history fields
- manual publication records

Campaign remains its planning parent when `campaignId` exists.

---

## 7. Shared workspace UX

Create a small reusable record-oriented UI vocabulary consistent with the existing `App*` primitives.

Expected concepts:

### `AppRecordWorkspace`

Layout/chrome only. It may provide slots/structure for:

- record toolbar;
- stable header;
- tabs;
- content.

It must not become a generic data-fetch/business-logic framework.

### `AppRecordSelector`

Accessible searchable selector with optional Previous/Next controls.

Requirements:

- selecting a record changes the stable route (preserving unrelated query keys);
- keyboard accessible (combobox/listbox);
- searchable;
- cancelled/completed/inactive records remain findable and visibly badged;
- no silent fallback to the first record when a requested record does not exist;
- use slim summary payloads rather than downloading full aggregates;
- Lead selector uses debounced `GET /api/leads` search.

### `AppRecordTabs`

Accessible tab semantics.

Requirements:

- preserve tab in `?tab=`;
- preserve unrelated query keys such as `line` and Lead list filters;
- refresh should retain selected tab;
- keyboard navigation;
- horizontal scrolling on small screens rather than unusable wrapping;
- do not hide tabs merely because a related count is zero. Use good empty states.

Do not create `AppRelatedTable` unless actual repeated implementations justify it after Campaign begins using the new architecture.

---

## 8. Nuxt route migration (explicit)

### Campaigns

Today: `app/pages/marketing/campaigns.vue` owns `/marketing/campaigns` only. `/marketing/campaigns/:id` **404s**.

Replace that single file with:

```text
app/pages/marketing/campaigns.vue          DELETE
app/pages/marketing/campaigns/index.vue    compact index
app/pages/marketing/campaigns/new.vue      establishment create
app/pages/marketing/campaigns/[id].vue     workspace (must render and edit)
```

Do not leave `campaigns.vue` beside the folder. That duplicates the index route.

Hash compatibility lives on the **index**: `#campaign-N` and `/marketing/campaigns/#campaign-N` `replace` to `/marketing/campaigns/N`.

Update `campaignStaffPath` **in the same commit** as `[id].vue` first rendering — not before.

### Content

Today: `app/pages/marketing/content.vue` owns `/marketing/content` only.

When adding the detail route (not before Campaign chrome exists; see section 19):

```text
app/pages/marketing/content.vue            DELETE
app/pages/marketing/content/index.vue      compact status queue
app/pages/marketing/content/[id].vue       focused detail
```

Events already use `events/index.vue` + `events/[id].vue`. Leads already use `leads/index.vue` + `leads/[id].vue` + `leads/new.vue`.

---

## 9. Campaign — reference implementation

Campaign is the first full implementation and the first human-QA checkpoint.

### 9.1 Compact index

Refactor `/marketing/campaigns` away from create + list + full editors.

It should become a compact, scannable index.

At minimum show:

- name;
- status;
- kind (Organic/Paid);
- owner;
- planned budget;
- relevant planned dates;
- attributed household **count** + link to `/leads?campaignId=` for users with `VIEW_MARKETING` (inexpensive count on the slim payload — not a nested household graph).

Each row/card opens `/marketing/campaigns/:id`.

Responsive behavior should follow existing application conventions: table where appropriate on larger screens, compact cards where tables become unusable.

**Do not ship this compact index until `[id].vue` can perform the essential edits that currently live on the cards** (planning fields, collaborators, programs, tracking links, save). Moving those editors onto `[id]` in the same commit as compacting the index is the intended approach. Deleting them with no destination is not.

### 9.2 New Campaign

Create `/marketing/campaigns/new`.

Use only establishment fields, based on actual current schemas. Expected fields include:

- Name
- Organic/Paid
- Status
- Owner
- Planned Budget
- Planned Start/End if appropriate at establishment time

After create:

```text
POST succeeds
→ navigate to /marketing/campaigns/:newId
```

`/new` must not ship until `:id` renders.

### 9.3 Campaign workspace header

Display/context/actions only.

Show:

- Campaign name
- status
- kind
- owner
- planned budget
- planned date range

Frequent actions:

- **Copy Default Tracking Link** (including Draft/Planned)
- Open attributed households (`/leads?campaignId=`) for `VIEW_MARKETING`

Do not put live editors for status, owner, budget, dates, objective, notes, collaborators, or programs in the header.

### 9.4 Campaign tabs

Implement:

```text
Overview | Content | Tasks | Assets | Tracking | Events | Performance
```

#### Overview

**This is the Campaign editor** for business fields:

- description;
- objective;
- offer;
- target audience;
- notes;
- channel if still part of the actual model;
- status, owner, kind, planned budget, planned dates (the fields shown as display in the header);
- actual dates;
- Programs;
- collaborators.

Preserve existing server rules and current fields. One save action for Overview.

#### Content

Show Content Items where `campaignId` is the current Campaign.

Contextual Add: establish the record, then open `/marketing/content/:id` — **only after that route exists**.

Until then, the Content tab may list items and link to the global `/marketing/content` queue. Do not generate 404 links.

Rows/items should link to `/marketing/content/:id` once that page exists.

Provide a link to the global Content queue where useful.

Do not create a second Content system.

#### Tasks

Show Marketing Tasks for the current Campaign.

Contextual Add Task: compact form, `campaignId` preassigned, remain on the tab.

Use the same underlying Marketing Task APIs/business rules as `/marketing/tasks`.

Provide a link to the global queue.

#### Assets

Show Campaign-associated assets **and** usages (`assets.campaignId` **or** `asset_usages.campaignId`).

Allow appropriate contextual upload/attachment using existing Asset rules and permissions.

Do not promote Asset into a Primary Record Workspace.

#### Tracking

Show default and additional Tracking Links.

Support current management behavior:

- destination path;
- labels;
- copy (including while Draft/Planned);
- `/trial` and `/events/:slug` destinations where supported.

Keep Copy Default Tracking Link available as a frequent header action as well.

#### Events

Show Acquisition Events whose `campaignId` is the current Campaign.

Contextual Add Event: minimum title, inherit Campaign, create Draft, immediately open `/marketing/events/:id` (that route already exists).

Do not embed the Event editor in Campaign.

#### Performance

Require `VIEW_MARKETING_REPORTS` for **detailed** Performance content.

Users with only `VIEW_MARKETING` must still have the household count + `/leads?campaignId=` path (index and header). If they open the Performance tab, show a permission-aware state for the *detailed* analysis — do not strip the ordinary household-count context they already had, and do not leak reports-only payloads from the API.

Detailed Performance (reports right), where supported:

- attributed household list / richer funnel/outcome presentation;
- planned budget vs Meta-reported spend/performance when explicitly mapped;
- mapped/not-mapped state;
- source labels: Meta-reported vs internal CRM vs deterministically attributed.

Meta mapping itself remains read-only here. ADMIN mapping changes stay under `/settings/meta`.

Server-side enforcement is mandatory. UI hiding is not security.

---

## 10. API shaping for Campaign and contextual children

Do not make the Campaign index/selector download every Campaign's full nested graph.

Implement appropriate additive API/service changes, based on actual current conventions.

Expected needs:

- slim Campaign summary/index payload (include attributed household **count**, not full `leads[]`);
- `GET /api/marketing/campaigns/:id` using the existing `getCampaign` service where appropriate (`VIEW_MARKETING`);
- reports-gated Campaign Performance query;
- `campaignId` filtering for Content list;
- `campaignId` filtering for Marketing Tasks list;
- `campaignId` filtering for Assets list (direct **and** usage);
- `campaignId` filtering for Acquisition Events list.

Filter server-side/SQL where practical rather than downloading all rows and filtering only in Vue.

Keep API changes additive unless there is a compelling reason otherwise.

Do not change database schema solely to support these queries.

CRM `GET /api/campaigns` currently uses the fat `listManagedCampaigns` payload. Slim it for Lead create/filter dropdowns **without dropping fields those workflows actually use** (at least `id`, `name`, and whatever status/active/kind those forms read). Verify `/leads/new` and Lead filters against the slim shape.

---

## 11. Legacy Campaign hash compatibility

Current links use hash identities such as:

```text
/marketing/campaigns#campaign-12
```

The new canonical path is:

```text
/marketing/campaigns/12
```

Update `campaignStaffPath` in the same commit as the `[id]` page.

Preserve compatibility by detecting `#campaign-N` on the Campaign index (including trailing-slash hash URLs) and `navigateTo(..., { replace: true })` the new stable route.

Update tests and documentation that assert or generate the old hash format.

Do not strand existing links silently.

Do not point `campaignStaffPath` at `:id` while that page still 404s.

---

## 12. Acquisition Event workspace

Refactor the existing `/marketing/events/:id` detail into the shared record-oriented chrome **after** Campaign has validated the pattern.

Keep `/marketing/events` as a compact index/create entry point. Do not turn the index into another giant editor. Event index may keep its small create form; Campaign Add Event does not need `/marketing/events/new` unless a nearby commit makes that cleaner.

### Header

Display/context/actions:

- Event title
- status
- public event URL/slug
- Campaign association
- registration state/window
- frequent actions such as Publish/Complete/Close Registration/Copy Public URL as allowed by existing rules

Editable title, description, campaign, program, and windows belong in Overview.

### Tabs

Use:

```text
Overview | Sessions | Roster | Process
```

#### Overview

- description
- Program
- Campaign
- registration window
- custom registration questions/form configuration
- event identity fields that are edited (title, etc.)

#### Sessions

- session list
- add/edit session using current rules
- capacity/age/program/times as implemented

#### Roster

Combine registrations and attendance.

Attendance is a Registration Line property and should not become a separate top-level tab/entity.

Include:

- household registrations;
- participant lines;
- attendance controls;
- Q&A where useful;
- staff registration;
- exclusion/processing state where implemented;
- registration history as a disclosure/secondary detail rather than a whole top-level workspace.

#### Process

Preserve the existing explicit preview → review → execute workflow.

Include:

- preview counts;
- existing Lead matches;
- ambiguous matches requiring deliberate confirmation;
- exclusions;
- execution;
- resulting Lead/LeadLine references;
- Event Follow-Up results.

Do not make this one-click merely because the UI is cleaner.

Keep existing confirmation safeguards.

Do not add a Communications tab merely because communication-intent rows exist. Actual send is not implemented.

Permissions remain based on existing Access Rights, including `MANAGE_ACQUISITION_EVENTS` and `PROCESS_EVENT_REGISTRATIONS`.

While rewriting Event datetime fields, use `shared/utils/time.ts` (section 18).

---

## 13. Household Lead workspace

Refactor the existing `/leads/:id` page into the normalized chrome only after Campaign/Event patterns are stable enough to reuse safely.

This is the highest regression-risk UI in the overhaul.

Preserve all accepted M8 household semantics.

### Header

Display/context/actions:

- primary contact/person name used for household display;
- derived household status;
- phone;
- email;
- acquisition source;
- Campaign link where the user has `VIEW_MARKETING` (or ADMIN);
- possible-duplicate warning where applicable;
- frequent actions: Edit Household / Add Person / Call where supported.

Do not put person-level conversion/lost actions in the household header.

Edit-household field inputs stay in a disclosed panel or Members/header action target — not a always-on header form competing with member saves.

### Default surface

**Members is the default tab.**

### Tabs

Use a conservative structure:

```text
Members | Follow-up | Attribution | Notes & History
```

Do not add an Overview tab merely to imitate Campaign/Event.

#### Members

Preserve the current person-first acquisition experience.

Each LeadLine/member remains the locus for:

- Program
- Trials
- rescheduling
- attendance/no-show
- offering/pricing
- conversion
- lost outcome
- relevant person lifecycle/status

Support `?line=:lineId` so deep links focus/expand the requested person.

Do not create a separate person module.

#### Follow-up

Show the household's acquisition Follow-Up Tasks.

Allow current assign/complete/cancel/manual behavior according to existing rules.

Provide a link to `/tasks` as the global queue.

Do not mix Marketing Tasks into this tab.

#### Attribution

Show:

- LeadHeader first-touch Campaign/Tracking/UTM/source attribution;
- per-line Compensation Attribution;
- Compensation Attribution history;
- earned compensation snapshots where applicable;
- Forecast MRR summary if it remains useful here.

Compensation writes continue to require `MANAGE_COMPENSATION_ATTRIBUTION` / ADMIN behavior already implemented.

Link to the Campaign workspace where appropriate and authorized.

#### Notes & History

Show:

- household notes;
- household status history;
- duplicate warnings/matches;
- other appropriate historical context currently on the detail page.

### Previous/Next and selector

See 4.10. Use `GET /api/leads` with the query preserved on the workspace URL.

---

## 14. Content detail

Keep `/marketing/content` as a compact cross-Campaign content workflow/status queue.

Move full editing/detail work into:

```text
/marketing/content/:id
```

Add a GET-by-id handler using the existing `getContentItem` service.

Organize the detail into a small number of sections, not a heavyweight seven-tab workspace.

Recommended grouping:

### Plan

- title
- status
- Campaign
- publisher
- channels
- caption/body
- planned publication information already in the model
- notes
- approval-required state

### Creative

- attached Assets
- upload/attach actions according to `MANAGE_ASSETS`
- marketing-use warnings/blocks preserved

### Publish

- approval actions requiring `APPROVE_CONTENT`
- ready-to-publish action
- manual publication recording
- publication history

Preserve the explicit M9 boundary: recording publication does not call Meta and does not imply automated posting.

Campaign → Add Content that navigates here must land in a commit **after or together with** this route, never before.

---

## 15. Global screens remain canonical cross-record workflows

Do not remove these because contextual tabs now exist:

- `/dashboard`
- `/leads`
- `/leads/new`
- `/tasks`
- `/reports`
- `/marketing`
- `/marketing/campaigns`
- `/marketing/tasks`
- `/marketing/content`
- `/marketing/assets`
- `/marketing/events`
- `/marketing/compensation`
- `/settings/*`
- `/users`
- `/security`
- `/account`
- public `/trial`
- public `/events/:slug`

Contextual tabs and global screens are two views of the same underlying records.

Examples:

- Campaign → Tasks = tasks for one Campaign.
- `/marketing/tasks` = work due across all Campaigns.
- Lead → Follow-up = calls for one household.
- `/tasks` = acquisition calls across all households.
- Campaign → Content = content for one Campaign.
- `/marketing/content` = content workflow across Campaigns.

Reuse the same API/service/business logic. Do not fork behavior into workspace-specific implementations.

---

## 16. Permissions and security

UI visibility is convenience. Server enforcement remains mandatory.

Preserve current coarse role and Access Right architecture.

Relevant rights include existing M9 rights such as:

- `VIEW_MARKETING`
- `MANAGE_CAMPAIGNS`
- `MANAGE_MARKETING_TASKS`
- `MANAGE_CONTENT`
- `APPROVE_CONTENT`
- `MANAGE_ASSETS`
- `MANAGE_ACQUISITION_EVENTS`
- `PROCESS_EVENT_REGISTRATIONS`
- `VIEW_MARKETING_REPORTS`
- `MANAGE_COMPENSATION_ATTRIBUTION`

Locked distinction:

- **`VIEW_MARKETING`:** Campaign workspace operations + basic outcome context already on `/marketing` + household count and `/leads?campaignId=`.
- **`VIEW_MARKETING_REPORTS`:** detailed Campaign Performance analysis.

Do not invent a use for `MANAGE_MARKETING_CONFIGURATION` solely because it currently exists unused.

Do not weaken explicit ADMIN-only Meta mapping.

Do not weaken M7 last-ADMIN, authentication, session, or security rules.

---

## 17. Responsive and accessibility requirements

This normalization must improve readability rather than merely rearranging desktop cards.

### Desktop

- compact indexes should scan quickly;
- headers should remain short and not be editors;
- related data belongs below tabs;
- avoid giant nested panels where a table/list is clearer.

### Mobile/small screens

- tabs horizontally scroll where necessary;
- record selector becomes full-width when appropriate;
- header facts wrap/stack cleanly;
- use cards instead of forcing wide tables where current design conventions support this;
- Event roster must remain operable on touch screens;
- frequent copy/action buttons need usable touch targets.

### Accessibility

- proper combobox/listbox behavior for record selection;
- proper `tablist`, `tab`, `tabpanel`, and `aria-selected` semantics;
- keyboard navigation for selector and tabs;
- no inaccessible click-only div navigation;
- preserve focus behavior after route/tab changes where practical.

---

## 18. Timezone cleanup while touching Campaign/Event forms

The architecture review identified local `datetime-local` conversions using browser `getTimezoneOffset()` in Campaign/Event Vue code that can conflict with the application's America/Denver time utilities.

While these forms are being rewritten, normalize them through the existing shared time utilities rather than copying the offset hack into the new components.

Do not broaden this into an unrelated timezone refactor across the entire repository.

Add/update tests where practical in the existing Vitest layout.

---

## 19. Implementation sequence and commit checkpoints

Use this as the default plan. Each commit must leave routes that helpers already point at **working**. Keep each commit buildable/testable where practical.

### Commit 1 — Campaign routes with edit parity

Nuxt migration (section 8): delete `campaigns.vue`; add `campaigns/index.vue`, `campaigns/new.vue`, `campaigns/[id].vue`.

- `[id].vue` **must render** and must include the essential edits currently on the cards (planning fields, collaborators, programs, tracking, save). Stacked layout is acceptable in this commit.
- Index is compact (no per-row full editor). New is establishment-only; POST navigates to `:id`.
- Update `campaignStaffPath` to `/marketing/campaigns/:id` **in this commit**.
- Hash `#campaign-N` redirect on the index.
- Update `tests/m9/campaigns.test.ts` path assertions.

Suggested message:

```text
Split Campaigns into compact index, new, and stable record routes with edit parity.
```

### Commit 2 — Slim Campaign APIs and child filters

- slim Campaign summary/index payload (household **count**, not nested graphs);
- `GET /api/marketing/campaigns/:id`;
- slim CRM `GET /api/campaigns` without breaking Lead create/filters;
- `campaignId` filters on Content, Marketing Tasks, Assets (both relationship paths), Events.

Suggested message:

```text
Add slim Campaign record APIs and campaign-scoped child list filters.
```

### Commit 3 — Shared chrome with first Campaign consumer

Introduce `AppRecordWorkspace`, `AppRecordSelector`, `AppRecordTabs` **and** apply them to the Campaign `[id]` page:

- selector / Previous/Next on slim summaries;
- display-only header + Copy Default Tracking Link (Draft/Planned allowed);
- Overview as the editor (including status/owner/budget/dates);
- Tracking tab;
- timezone utilities on touched Campaign datetime fields.

Do not land unused primitives in a commit with no consumer.

Suggested message:

```text
Add Primary Record Workspace chrome and apply it to Campaign overview and tracking.
```

### Commit 4 — Content focused detail (before Campaign Add Content navigates here)

- Replace `content.vue` with `content/index.vue` + `content/[id].vue`.
- Queue stays useful; full edit moves to `:id`.
- `GET /api/marketing/content/:id`.
- Plan / Creative / Publish sections.
- Campaign Content tab may still only *list* until commit 5.

Suggested message:

```text
Move Content Item editing into focused detail records while preserving the global queue.
```

### Commit 5 — Campaign related workflow tabs

- Content (list + Add that establishes a record and opens `/marketing/content/:id`)
- Tasks (compact Add form, stay on tab)
- Assets (direct `campaignId` and `asset_usages.campaignId`)
- Events (min title Draft + open `/marketing/events/:id`)
- reuse existing POST/PATCH services

Suggested message:

```text
Expose Campaign-related marketing work through contextual workspace tabs.
```

### Commit 6 — Campaign Performance

- detailed analysis gated by `VIEW_MARKETING_REPORTS`;
- do not hide `VIEW_MARKETING` household count + Leads filter;
- CRM attribution/outcomes presentation;
- planned budget vs read-only Meta when mapped;
- preserve source labeling;
- link to Meta Settings for mapping writes.

Suggested message:

```text
Add permission-gated Campaign performance without hiding ordinary VIEW_MARKETING outcome context.
```

**Human QA checkpoint:** Campaign index, create, workspace, contextual children, and Performance should be usable. Fix defects on `M9` with clear commits before Event/Lead refactors.

### Commit 7 — Acquisition Event workspace

- refactor existing detail route into shared chrome;
- Overview / Sessions / Roster / Process;
- display-only header + Overview editor;
- preserve processing safeguards;
- compact Event index if still too editor-like;
- timezone utilities on touched Event datetime fields.

Suggested message:

```text
Normalize Acquisition Events into the Primary Record Workspace pattern.
```

### Commit 8 — Household Lead workspace

- Members default;
- Follow-up;
- Attribution;
- Notes & History;
- `?line=` deep link;
- selector/Previous/Next via URL query context (4.10);
- preserve all M8 lifecycle behavior.

Suggested message:

```text
Normalize Household Leads into a members-first Primary Record Workspace.
```

### Commit 9 — Documentation and final UX cleanup

Update durable documentation and only bounded visual inconsistencies exposed by this work.

Suggested message:

```text
Document the Primary Record Workspace convention and final M9 UX architecture.
```

If fixes require additional commits, use descriptive messages rather than hiding them in the above checkpoints.

---

## 20. Testing and regression requirements

At each major phase, run the relevant focused tests before the full suite.

Before declaring implementation complete, run:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

All must pass unless there is a pre-existing failure that is clearly documented and proven unrelated.

Pay special attention to:

- `tests/m9/campaigns.test.ts`
- M8 Lead/household tests
- M8 Trial/reschedule/conversion/lost tests
- Follow-Up tests
- Event registration/process tests
- compensation tests
- Access Right tests
- Meta mapping/reporting tests
- route/path helper tests

Add tests for new behavior in the **existing** Vitest/HTTP/service style:

- stable Campaign routes / `campaignStaffPath`;
- legacy hash redirect;
- Campaign GET-by-id;
- summary payload / household count without nested graphs;
- `campaignId` child filters, including assets via usage;
- Campaign Performance authorization vs `VIEW_MARKETING` overview access;
- Content GET-by-id;
- timezone conversions touched by the rewrite.

Do not add Playwright or a Vue component test runner for this work.

Automated tests do not replace browser QA.

---

## 21. Human QA requirements

Do not mark M9 accepted or merge it.

Scott remains the human acceptance gate.

At minimum, prepare the implementation so Scott can manually test:

### Campaign

- index readability with multiple Campaigns;
- household count + Leads filter visible with `VIEW_MARKETING`;
- create Campaign → automatically opens workspace;
- selector search;
- Previous/Next;
- refresh/bookmark stable route;
- Overview edits (status/owner/budget/dates live here, not the header);
- Tracking Link copy including Draft/Planned;
- contextual Content/Task/Asset/Event creation as specified;
- global queue shows the same created records;
- Performance: detailed analysis requires `VIEW_MARKETING_REPORTS`; ordinary count/link does not disappear for `VIEW_MARKETING`;
- mapped and unmapped Meta states;
- legacy hash links redirect.

### Event

- open from compact index;
- edit Overview;
- create/edit Sessions;
- public URL behavior unchanged;
- roster attendance;
- staff registration;
- preview batch;
- ambiguous match handling;
- execute batch;
- resulting Lead and Follow-Up links;
- Campaign Add Event lands in this workspace as a Draft.

### Lead

- Members is default;
- multiple LeadLines remain easy to understand;
- Trials remain person-level;
- Trial Scheduled ↔ Attended/reschedule behavior remains correct;
- conversion/lost/mixed household outcomes remain correct;
- Follow-Up remains household-level;
- Attribution/Compensation remains per appropriate level;
- `?line=` focuses the requested person;
- Previous/Next respects filtered context via URL query;
- opening from `?campaignId=` walks that campaign’s households.

### Content

- global queue remains useful;
- Campaign Content tab and Content detail show the same record;
- approval rules unchanged;
- Asset restrictions unchanged;
- manual publication history unchanged;
- no UI implies Meta auto-publishing exists.

---

## 22. Documentation updates required

This overhaul establishes a durable application convention. Documentation is part of the implementation, not optional cleanup.

Update at minimum:

### `vault/Design-System.md`

Add an authoritative **Primary Record Workspace** section covering:

- compact index vs workspace;
- stable URL;
- selector/Previous/Next;
- short header rule (display/actions, not editor);
- contextual tabs;
- contextual creation;
- Lead query context;
- `VIEW_MARKETING` vs `VIEW_MARKETING_REPORTS` on Campaign outcomes vs Performance;
- responsive behavior;
- what is not a workspace;
- global queues/libraries/reports remain.

### `vault/Architecture.md`

Document the staff interaction model and route pattern, including the Campaigns/Content folder route migration.

### `vault/CRM.md`

Document:

- Household Lead workspace;
- Members-first default;
- LeadLine `?line=` deep links;
- list-filter query preserved on `/leads/:id`;
- Follow-Up vs Marketing Tasks distinction;
- stable Campaign links (`/marketing/campaigns/:id`).

### `vault/Domain-Model.md`

Correct stale statements, including the review's finding that ContentItem is implemented despite stale documentation.

Document Campaign as the internal marketing aggregate without inventing CampaignLine.

### `vault/Authentication.md`

Document how existing Access Rights govern workspace tabs/actions:

- `VIEW_MARKETING` for Campaign workspace + basic outcome context + household count/link;
- `VIEW_MARKETING_REPORTS` for detailed Campaign Performance.

### `vault/Decisions.md`

Add a dated accepted decision substantially equivalent to:

```markdown
## 2026-09-03 — Primary Record Workspace is the staff record pattern
Status: accepted

Context: M9 Campaign/Content screens stacked create, list, and child editing
until human QA could no longer efficiently see or work the records.

Decision: Normalize Household Lead, Marketing Campaign, and Acquisition Event
onto a record workspace using compact indexes, stable record URLs, searchable
selection, short headers (display/actions, not editors), and contextual tabs.
Content receives a focused detail route. Cross-record queues/libraries/reports
remain. No parallel data models or CampaignLine concept are introduced. Meta
Campaign remains distinct from internal Marketing Campaign. Users and Catalog
remain lighter admin surfaces. VIEW_MARKETING keeps basic Campaign outcome
context already shown on /marketing (including attributed household count and
the filtered Leads link). VIEW_MARKETING_REPORTS gates detailed Campaign
Performance analysis only.
```

### `vault/Implementation-State.md`

Update only after the implementation actually exists.

### Other affected docs

Update path/link references and relevant How-to-Run/handoff notes without rewriting historical WIP evidence as though it had always described the new architecture.

---

## 23. Explicit non-goals

Do not expand this UX overhaul into:

- PostgreSQL migration;
- multi-tenancy;
- new Campaign/Lead/Event header-line schema;
- Meta Campaign creation/editing;
- Meta automated posting;
- Meta mapping by name;
- SMS/email/WhatsApp sending;
- event waitlists;
- household merge;
- accounting/invoicing;
- new compensation business rules;
- new configurable Access Right keys;
- full User workspace;
- full Program workspace;
- full Membership Offering workspace;
- Asset workspace;
- Trial workspace;
- Follow-Up workspace;
- Marketing Task workspace;
- speculative generic form builders;
- Playwright / new frontend test stack;
- isolated unused `AppRecord*` framework commit;
- unrelated code cleanup.

If an existing bug blocks the workspace implementation, fix it narrowly and document why.

---

## 24. Final deliverable / handoff

When implementation is complete, create a new Markdown handoff in `vault/wip/` describing the **actual implemented state**, not merely this prompt.

Include:

1. final git branch and HEAD;
2. commit list for this overhaul;
3. working-tree status;
4. routes added/changed;
5. shared components added;
6. API/service changes;
7. each workspace's actual header/tabs/actions;
8. permissions enforced (`VIEW_MARKETING` vs `VIEW_MARKETING_REPORTS`);
9. legacy hash compatibility behavior;
10. documentation changed;
11. tests run and exact results;
12. known limitations/UI gaps;
13. explicit confirmation that no schema migration was added, or a detailed explanation if a genuinely necessary migration was discovered and approved before implementation;
14. a browser QA checklist for Scott;
15. any decisions that still require Scott rather than assumptions made during implementation.

Do not merge `M9`.

Do not mark M9 complete on Scott's behalf.

---

## 25. Stop conditions

Stop and ask Scott rather than guessing if implementation reveals a genuine product decision that contradicts the locked architecture above, particularly if it would require:

- changing household/person ownership semantics;
- moving Trials to household level;
- changing Follow-Up vs Marketing Task boundaries;
- changing internal Campaign vs Meta Campaign boundaries;
- changing Compensation Attribution ownership/history rules;
- adding a database redesign;
- changing Access Right meaning;
- removing global queues in favor of contextual-only screens;
- hiding ordinary `VIEW_MARKETING` household-count/Leads-filter context behind `VIEW_MARKETING_REPORTS`.

For ordinary implementation details, inspect the codebase, choose the simplest consistent solution, implement it, test it, and document it.
