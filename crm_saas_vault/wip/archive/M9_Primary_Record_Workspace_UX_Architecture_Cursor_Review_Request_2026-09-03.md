# Renzo Gracie Kaysville — Primary Record Workspace UX Architecture Review Request

**Date:** 2026-09-03  
**Current branch:** `M9`  
**Purpose:** Architecture/design review only. Do **not** implement this overhaul yet.

## 1. Request to Cursor

We are considering a significant application-wide UI/UX normalization before continuing M9 human acceptance.

Please inspect the **current `M9` branch**, the actual application routes/components/schema/API behavior, and the project documentation/handoffs in the repository. Compare what is actually implemented against the design direction below.

We want your architectural input before writing the final implementation specification.

**Do not modify application code, migrations, schema, or behavior as part of this request.**

Your deliverable is a detailed Markdown review document in `vault/wip` that we can give back to ChatGPT for a final design discussion.

Suggested filename:

`vault/wip/M9_Primary_Record_Workspace_UX_Architecture_Review.md`

Do not commit or push unless explicitly instructed separately.

---

# 2. Problem We Are Solving

M9 added substantial functionality, but some screens have become difficult to use because they combine:

- record creation;
- record listing;
- record editing;
- child/related records;
- operational actions;
- reporting/context;

on one vertically stacked page.

The current Campaign page is the clearest example. Even with only a few Campaigns, each Campaign is rendered as a large block/card containing many editable fields and attached information. As Campaigns gain Content, Tasks, Assets, Tracking Links, Events, Meta relationships, and performance information, this approach does not scale.

Human QA is becoming difficult because the information architecture itself is noisy, not merely because padding or styling needs refinement.

We want to normalize the application around a **Primary Record Workspace** pattern inspired by mature ERP record screens such as Acumatica.

This is not a request to copy Acumatica's visual styling. It is a request to adopt the useful interaction model:

```text
Record navigation / search / actions
              ↓
Stable record header
              ↓
Related data tabs / sections
```

A Sales Order is the central record. Sales Order Lines and other related records are loaded in the context of the selected Sales Order.

We want the same conceptual clarity in this application.

---

# 3. Terminology / Architectural Direction Already Agreed

## 3.1 Primary Business Record

A **Primary Business Record** is an entity that acts as the central working context for multiple related records and workflows.

Examples:

- Household Lead;
- Marketing Campaign;
- Acquisition Event;
- Content Item where appropriate.

"Header" may describe the data/UI pattern, but not every Primary Business Record needs literal `Header` and `Line` database tables.

For example:

```text
LeadHeader
  └── LeadLines
```

is a true header/line data model.

A Campaign instead has heterogeneous related records:

```text
Campaign
  ├── Content Items
  ├── Marketing Tasks
  ├── Assets
  ├── Tracking Links
  ├── Acquisition Events
  ├── Programs
  ├── Collaborators
  ├── Meta mapping/performance
  └── CRM acquisition outcomes
```

We do **not** want artificial `CampaignLine` records merely to force the model into header/line terminology.

## 3.2 Primary Record Workspace Pattern

Our proposed application-wide rule is:

> Business entities that serve as the central context for multiple related records should use a standardized record-oriented workspace. The workspace provides searchable record selection, previous/next navigation, creation and record actions, a stable header containing identity and important state, and tabs/sections containing related records. Related records should automatically inherit the current Primary Record context when created from within the workspace. Cross-record queues, dashboards, reports, and libraries remain available where operational workflows require viewing records across multiple Primary Records.

The desired general shape is:

```text
[Previous] [Next]   [Search/select record................]   [+ New]

PRIMARY RECORD HEADER
Identity / status / owner / major business fields / actions

Overview | Related Area A | Related Area B | Related Area C | History

Selected tab content
```

Stable record URLs are preferred, e.g.:

```text
/leads/{leadId}
/marketing/campaigns/{campaignId}
/marketing/events/{eventId}
/marketing/content/{contentItemId}
/users/{userId}
```

Search/selecting another record should change the entire workspace context.

---

# 4. Decisions Already Made

Treat these as approved direction unless repository realities expose a serious conflict. If there is a conflict, document it rather than silently changing the requirement.

## Decision A — Perform the broader normalization now

We do **not** want to limit this redesign to Campaigns only.

We want to establish the Primary Record Workspace convention across the application now, then refine individual screens during another human QA pass.

The convention must also be added to durable project documentation so future work follows it.

## Decision B — Record selection/navigation

Primary Record workspaces should support:

- searchable record selection;
- Previous / Next navigation where meaningful;
- New record action;
- stable record-specific URL;
- refresh/browser navigation without losing selected context.

## Decision C — Campaign header and initial tab direction

For Campaigns, our current proposed header contains high-value identity/state fields such as:

- Name;
- Status;
- Kind;
- Owner;
- Planned budget;
- planned/actual dates where appropriate;
- Objective or short Description.

Current proposed Campaign tabs:

1. Overview
2. Content
3. Tasks
4. Assets
5. Tracking Links
6. Events
7. Performance

Current thought: Meta mapping belongs under Performance rather than requiring a separate top-level tab.

Overview may contain lower-frequency planning/context fields such as:

- Offer;
- Target Audience;
- Programs;
- Collaborators;
- Notes;
- summary metrics.

These exact field placements are **not fully final**. Review them against the actual code/schema and make recommendations.

## Decision D — Contextual creation/editing

Related records should be manageable from the Primary Record workspace when practical.

Examples:

- `+ Add Task` from Campaign → Tasks automatically sets that Campaign;
- `+ Add Content` from Campaign → Content automatically sets that Campaign;
- `+ Add Tracking Link` automatically belongs to the selected Campaign;
- Campaign-specific Assets and Events should preserve context where their current relationships support it.

Complex related records may still have their own detail/workspace screens.

## Decision E — Preserve global operational screens

Do **not** remove global screens merely because records are also visible contextually.

Examples:

- global Marketing Tasks remains useful for "What work is due across all Campaigns?";
- Follow-Up remains a household-spanning operational queue;
- global Content may remain useful across Campaigns;
- Assets remains useful as a library;
- Reports remain cross-record reporting;
- Dashboard remains cross-record operational summary.

The same underlying record can therefore appear in two useful contexts:

```text
Campaign → Tasks
"Show me tasks for this Campaign"

Marketing Tasks
"Show me tasks due across all Campaigns"
```

Do not create duplicate data models to support these views.

---

# 5. Current Proposed Primary Record Classification

This is our working list. Validate it against the actual repository.

## Tier 1 — Operational Primary Records

These are expected to use the full Primary Record Workspace pattern.

### 5.1 Household Lead / LeadHeader

Possible attached/related records:

- LeadLines / prospective members;
- Trials;
- household Follow-Up;
- Notes;
- Status History;
- acquisition attribution;
- Compensation Attribution;
- Conversions;
- Lost outcomes;
- Campaign/source relationships.

Initial possible tabs:

```text
Overview
Members
Trials
Follow-Up
Attribution & Compensation
Notes & History
```

Validate whether Trials should be household-level, nested primarily under LeadLines, or represented in both ways.

### 5.2 Marketing Campaign

Related records currently expected:

- Content Items;
- Marketing Tasks;
- Assets;
- Tracking Links;
- Acquisition Events;
- Programs;
- Collaborators;
- Meta Campaign mapping;
- Meta metrics;
- internal CRM outcomes;
- budget/planning information.

Initial tabs:

```text
Overview
Content
Tasks
Assets
Tracking Links
Events
Performance
```

### 5.3 Acquisition Event

Possible related records:

- Sessions;
- Registrations;
- registration participants/lines;
- custom Questions/Answers;
- Attendance;
- communication intents/history;
- batch Lead processing;
- matched/created Leads;
- Event Follow-Up;
- Campaign attribution.

Initial possible tabs:

```text
Overview
Sessions
Registrations
Attendance
Follow-Up & Leads
Communications
History
```

Validate this against actual implementation and workflow.

### 5.4 Content Item

Content can belong to a Campaign while also becoming complex enough to deserve its own workspace.

Possible related records:

- Channels;
- Assets;
- Marketing Tasks;
- approval state/history;
- Publication records;
- Campaign;
- publisher;
- planned publication information.

Initial possible tabs:

```text
Overview
Creative & Assets
Tasks
Approval
Publications
History
```

Determine whether Content currently justifies full Primary Record treatment or whether it should remain a lighter detail screen for now.

---

# 6. Administrative / Lighter Primary Records

These may use the same conceptual convention without needing the full tab-heavy workspace.

## 6.1 User

Possible related information:

- User Type;
- additional User Roles;
- effective Access Rights;
- security activity;
- assigned Marketing work where useful;
- status/session management.

Possible structure:

```text
Overview
Access & Permissions
Assigned Work
Security Activity
```

Review whether this is appropriate or over-engineered for current M9.

## 6.2 Program

Possible relationships:

- Classes / availability;
- Membership Offerings;
- Campaign associations;
- Event Session associations.

Possible structure:

```text
Overview
Classes & Availability
Membership Offerings
```

Validate against current Catalog implementation.

## 6.3 Membership Offering

Likely still simple enough for a lighter record editor rather than a tabbed workspace.

Please evaluate.

---

# 7. Records We Currently Believe Should NOT Be Primary Workspaces

Validate these conclusions.

### LeadLine / Prospective Member

Not a top-level Primary Record because it belongs to a Household Lead, although it has substantial person-level lifecycle data.

Question: should LeadLine retain/open a dedicated detail route while still being subordinate to the Household workspace?

### Trial

Attached to a prospective member. Not expected to become a top-level module.

### Follow-Up Task

A work record. Contextually belongs to a LeadHeader; globally belongs in the Follow-Up queue.

### Marketing Task

A work record. Contextually belongs to Campaign/Content/Event/etc.; globally belongs in the Marketing Tasks queue.

### Asset

Currently expected to remain a library/related record rather than a full Primary Record. Could be promoted later if asset metadata/workflow becomes more complex.

### Tracking Link

Attached to Campaign. Not a Primary Record.

### Event Registration

Attached to Acquisition Event. Not a top-level Primary Record, although roster processing may need a detailed sub-workflow.

### Conversion / Lost Outcome / Compensation Earned

Historical/outcome records attached to acquisition records, not top-level workspaces.

### Meta Campaign

External/read-only reference data. Current preference is to expose it through the internal Campaign's Performance/Meta context rather than create a parallel primary Marketing Campaign workspace.

---

# 8. Important Design Principle: Hierarchy Does Not Forbid Dedicated Detail Screens

An attached record can still deserve its own detail experience.

Example:

```text
Campaign
  └── Content Item
```

Campaign → Content should show Content Items associated with that Campaign.

A user may also open a Content Item and work on it in greater detail.

That does not make Campaign and Content peers in the business hierarchy. It simply means the child record is complex enough to warrant its own detailed workspace.

Please use this distinction when reviewing routes and components.

---

# 9. Questions We Want Cursor to Help Answer

Do not merely agree with our proposal. Inspect the repository and challenge it where appropriate.

## 9.1 Primary-record inventory

- What entities in the actual M9 codebase function as true central/aggregate records?
- Are we missing any obvious Primary Record?
- Have we classified anything as Primary that is actually too small or subordinate?
- Which records are aggregates at the domain level versus merely convenient UI parents?

## 9.2 Relationship map

For each proposed Primary Record, identify the actual current relationships from schema/API/code.

Provide a concise map such as:

```text
Campaign
├── one-to-many Content Items
├── one-to-many Marketing Tasks
├── one-to-many Tracking Links
├── many-to-many Programs
├── many-to-many Collaborators
├── ...
```

Call out relationships we assumed that do not actually exist or are only partially exposed.

## 9.3 Current route/UI inventory

For each Primary Record candidate:

- current route(s);
- current list/create/detail behavior;
- whether a stable record-specific route already exists;
- whether current pages mix list/create/edit responsibilities;
- whether related-record UI already exists;
- current pain points or duplicated interaction patterns.

## 9.4 Recommended header fields

For each Primary Record, recommend which fields belong in the stable header.

Use this rule:

> Header fields should help a user identify the record, understand its current state, and perform frequent work. Lower-frequency planning/configuration fields belong in Overview/details rather than making the header enormous.

Do not simply place every database field in the header.

## 9.5 Recommended tabs

For each Primary Record, recommend:

- tab names;
- what belongs in each tab;
- whether any proposed tabs should be merged;
- whether any tab is too sparse to justify itself;
- which related records need contextual `Add` actions;
- which records should link out to a richer detail screen.

## 9.6 Record selector/navigation design

Recommend an implementation pattern for:

- searchable selector;
- Previous/Next;
- New;
- stable URLs;
- loading a record directly by URL;
- handling deleted/archived/inactive records;
- preserving filters/search where useful;
- keyboard/accessibility concerns.

We want a reusable implementation, not custom selector logic independently rebuilt for every screen.

## 9.7 Reusable UI components/layout

Inspect the current component system and recommend what reusable components should support this architecture.

Examples only:

- `PrimaryRecordWorkspace`;
- `RecordSelector`;
- `RecordHeader`;
- `RecordTabs`;
- `RelatedRecordTable`;
- contextual action bar;
- empty states;
- compact summary/stat components.

Use existing project naming/style conventions where possible. Do not recommend abstraction for abstraction's sake.

## 9.8 Global screen interaction

Identify where the same record will appear both:

- contextually under a Primary Record; and
- globally in a queue/library/report.

Recommend how to avoid duplicated business logic and duplicated edit components.

## 9.9 URL/navigation migration

Recommend how to move from current routes to record-specific routes without unnecessarily breaking existing navigation, bookmarks, APIs, or tests.

Identify redirects or compatibility routes that would be useful.

## 9.10 Permissions / Access Rights

For each proposed workspace/tab/action, identify how current coarse roles and M9 Access Rights should affect:

- visibility;
- read access;
- creation;
- editing;
- contextual actions.

Do not invent a new permission model unless the current model genuinely cannot support the design.

## 9.11 Mobile/responsive behavior

Acumatica is only an interaction-model inspiration. We do **not** want a desktop-only ERP clone.

Recommend how the Primary Record Workspace should collapse on smaller screens:

- selector/header behavior;
- tabs;
- tables;
- actions;
- related records.

## 9.12 Scope/risk

Estimate the redesign scope based on the actual repository.

Identify:

- pages/components most affected;
- API work required, if any;
- whether schema changes are actually necessary;
- test areas likely to break;
- where we can reuse existing endpoints/components;
- high-risk areas;
- sensible implementation phases/commit boundaries **within the existing `M9` branch**.

We expect this to be primarily a UI/UX and route normalization. Push back if a proposed change unnecessarily requires database redesign.

## 9.13 Documentation

Identify the durable project documentation that should be updated so future development follows the Primary Record Workspace convention.

Recommend a concise architecture/design section that can be made authoritative.

---

# 10. Constraints / Existing Decisions to Preserve

Do not accidentally undo accepted product behavior while proposing the UX overhaul.

Preserve:

- `LeadHeader` household + `LeadLine` prospective-member model;
- Trials/conversions/lost outcomes at the appropriate person level;
- household Follow-Up behavior;
- Marketing Tasks separate from Lead Follow-Up;
- internal Marketing Campaign distinct from Meta Campaign;
- organic `$0` Campaigns;
- Campaign Tracking Links;
- Acquisition Events and Event Sessions;
- Event registration → previewed batch Lead processing;
- no silent duplicate merging;
- Content workflow and manual publication records;
- Asset marketing-use controls;
- Access Rights model: User Type → User Roles → Access Rights, plus direct user role assignments;
- ADMIN safety/bypass behavior;
- compensation attribution/history and earned snapshot behavior;
- Meta read-only behavior;
- SQLite for current M9;
- single-tenant productized architecture;
- one canonical codebase;
- no permanent customer-specific branches;
- existing global operational queues where they remain useful.

Do not expand this review into PostgreSQL migration, Docker/deployment, Meta publishing, accounting, billing, or unrelated feature development.

---

# 11. Git / Process Requirements

Current work is already on the **`M9` branch**.

For this architecture-review request:

1. Inspect the current branch and repository first.
2. Do not switch to another milestone branch.
3. Do not implement the overhaul yet.
4. Do not alter schema or migrations.
5. Do not perform unrelated cleanup.
6. Do not commit the local SQLite database or secrets.
7. Produce the requested Markdown review in `vault/wip`.
8. Do not merge, rebase, force-push, or rewrite history.
9. Do not commit/push unless Scott explicitly asks after reviewing the document.

The eventual implementation is expected to remain on the existing `M9` branch with detailed, bounded commits. We will define those commit boundaries after reviewing your recommendations.

---

# 12. Required Return Document Structure

Please return a Markdown document containing at least:

## A. Executive recommendation

Do you agree with the Primary Record Workspace direction? Where do you agree/disagree, based on the codebase?

## B. Actual primary-record inventory

A table with:

- entity;
- current route(s);
- primary/attached/work/reference classification;
- recommendation;
- rationale.

## C. Actual relationship map

For every recommended Primary Record, list its current related entities and relationship types.

## D. Proposed workspace specification per Primary Record

For each:

- selector/search display value;
- header fields;
- primary actions;
- tabs;
- related records per tab;
- contextual Add/Edit behavior;
- permission requirements;
- mobile considerations.

## E. Global screens that should remain

Explain which queue/library/report screens remain valuable and how they coexist with contextual views.

## F. Reusable component/route architecture

Recommend a concrete implementation approach based on the existing Nuxt/Vue project.

## G. Gaps between current backend and UI

M9 already has some server-supported fields/relationships that are weakly exposed in UI. Identify where this overhaul can naturally expose them versus where they should remain deferred.

## H. Risks and pushback

List anything in our proposal you believe will make the application worse, create unnecessary complexity, conflict with the current domain model, or produce poor mobile UX.

## I. Recommended implementation plan

Propose ordered phases and detailed commit boundaries, all on the existing `M9` branch.

Do **not** implement those phases yet.

## J. Documentation changes

Specify what project documentation should be updated and propose the durable Primary Record Workspace design rule.

## K. Questions requiring Scott/ChatGPT decisions

End with only the unresolved product/UX questions that genuinely require human decisions before implementation. Do not ask implementation trivia Cursor can safely resolve from the repository.

---

# 13. Goal of This Review

The goal is not to make the application look like Acumatica.

The goal is to establish a consistent, scalable mental model:

```text
PRIMARY BUSINESS RECORD
        ↓
Identify / search / navigate the record
        ↓
Understand its current state from a stable header
        ↓
Work with its related records in context
        ↓
Use global queues/reports when the workflow crosses many primary records
```

We want a user to learn this interaction model once and recognize it throughout the application.

Inspect the real M9 implementation, challenge our assumptions, and give us the information needed to produce the final implementation specification.
