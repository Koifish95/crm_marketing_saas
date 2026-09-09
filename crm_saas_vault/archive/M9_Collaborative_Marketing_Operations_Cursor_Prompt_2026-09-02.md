# M9 — Collaborative Marketing Operations

**Project:** Renzo Gracie Kaysville Acquisition
**Milestone:** M9
**Implementation agent:** Cursor
**Current branch:** `M9`
**Current database:** SQLite
**Business timezone:** `America/Denver`
**Status:** Approved implementation specification

---

# 1. Mission

M9 expands the accepted acquisition system into a collaborative marketing-operations system for Scott and Renzo Gracie Kaysville staff.

The application already manages the downstream acquisition funnel:

```text
Lead / Household Inquiry
    ↓
Prospective Members
    ↓
Trials
    ↓
Follow-Up
    ↓
Joined / Lost
    ↓
Acquisition reporting
```

M9 adds the upstream collaborative marketing workflow:

```text
Marketing Campaign
    ↓
Marketing Tasks / Assets / Content / Events
    ↓
Organic or paid distribution
    ↓
Tracking / registration / attribution
    ↓
Lead / Household acquisition
    ↓
Existing Trial / Follow-Up / Conversion workflow
```

M9 must preserve the acquisition system as the operational CRM core. Marketing must be a distinct functional area that feeds acquisition rather than replacing or duplicating it.

---

# 2. Read Before Implementing

Before changing code:

1. Confirm the current Git branch is exactly `M9`.
2. Inspect `git status` and report any unexpected/unrelated changes before modifying files.
3. Read all current project handoffs and implementation/audit documents, prioritizing the newest September 2 M8 completion/M9 handoff and the approved productized single-tenant roadmap.
4. Inspect the actual repository structure, schema, migrations, services, APIs, tests, UI primitives, RBAC/auth implementation, LeadHeader/LeadLine model, Campaign model, tracking links, Follow-Up workflow, Reports, Meta integration, and current M8 acceptance state.
5. Treat repository reality as authoritative when old documents conflict with accepted implementation.
6. Preserve accepted M0–M8 behavior unless this specification explicitly changes it.
7. Do not silently invent product behavior. If an implementation detail is ambiguous but can be resolved safely from existing architecture, use the existing architectural pattern. If it would require a new business rule, stop and report.

Do not begin PostgreSQL migration, Docker production work, or unrelated product extraction in M9.

---

# 3. Git Workflow — Binding Instructions

Scott has already created the `M9` branch and the repository is expected to be on it.

Before implementation:

```text
git branch --show-current
```

must report:

```text
M9
```

If not, STOP and report. Do not switch branches unless Scott explicitly instructs it.

Use one M9 branch with disciplined incremental commits. Do not create additional branches unless explicitly instructed.

Recommended implementation/commit checkpoints:

```text
M9.0  User Types / Roles / Access Rights foundation
M9.1  Marketing Campaign planning and collaboration
M9.2  Marketing Tasks
M9.3  Content planning/workflow
M9.4  Asset requests/library/marketing-use controls
M9.5  Acquisition Events / Sessions / registrations / batch processing
M9.6  Attribution / Compensation Attribution / compensation ledger
M9.7  Marketing Dashboard / reporting / Meta validation
M9.X  Final regression / acceptance corrections
```

Each checkpoint should:

1. inspect relevant existing code;
2. implement only the bounded sub-scope;
3. add/update automated tests;
4. run relevant QA;
5. review the Git diff;
6. commit with a clear detailed message;
7. push `M9` after the checkpoint is stable unless an active acceptance correction should remain local for Scott review.

Do not:

- merge `M9` to another branch;
- rebase unless explicitly instructed;
- reset or force-push;
- amend pushed commits casually;
- delete/switch branches;
- modify remotes;
- commit secrets;
- commit local Obsidian state such as `vault/.obsidian/*`;
- mix unrelated cleanup into milestone commits.

M9 is not complete merely because automated tests pass. Scott will perform human acceptance testing before M9 is merged.

---

# 4. Current Product Boundary

The application is a customer-acquisition and collaborative marketing system.

It supports:

- household Lead capture;
- multiple prospective members per household;
- Trial scheduling/history;
- Follow-Up tasks;
- Joined and Lost outcomes;
- membership offering and forecast values;
- Campaign attribution/tracking links;
- reporting/CSV;
- authentication/users/security/audit;
- read-only Meta reporting/integration groundwork.

M9 may add:

- collaborative Campaign planning;
- Marketing Tasks;
- Content planning/calendar;
- Asset requests/library;
- approval workflows;
- Acquisition Events;
- marketing dashboards/reports;
- a simplified configurable permission system;
- compensation attribution/ledger required by Scott's acquisition arrangement.

M9 must NOT become:

- billing;
- invoicing;
- AR/AP;
- payment processing;
- general member management;
- recurring class attendance for existing members;
- belt/rank tracking;
- payroll;
- accounting;
- generic project management;
- a full digital-asset-management suite;
- Eventbrite;
- a generic workflow designer;
- a generic arbitrary form builder;
- automatic Meta ad management;
- automatic social publishing in this version.

---

# 5. Productized Single-Tenant Direction

Continue building one canonical reusable codebase.

Renzo is the first customer, design partner, and martial-arts implementation. Do not hardcode behavior to specific people or `customer === 'renzo'` conditions.

Classify new M9 behavior conceptually as one of:

1. shared acquisition/marketing core;
2. martial-arts vertical;
3. Renzo configuration;
4. isolated customer-specific extension if genuinely unavoidable.

SQLite remains intentional through M9 and the Renzo operational pilot. Preserve PostgreSQL portability, but do not migrate yet.

---

# 6. Major M9 Workstreams

M9 should be implemented as coordinated sub-milestones on the same `M9` branch:

```text
M9.0  Security/configuration foundation
M9.1  Marketing Campaign planning
M9.2  Marketing Tasks
M9.3  Content planning and workflow
M9.4  Asset requests/library
M9.5  Acquisition Events and registration processing
M9.6  Attribution and compensation ownership
M9.7  Marketing command center/reporting/Meta validation
```

The data model must remain coherent across these workstreams. Do not build disconnected subsystems.

---

# 7. M9.0 — User Types, User Roles, Access Rights, Effective Permissions

M9 begins the foundation of a simplified Acumatica-style permission model.

Approved terminology:

```text
User Type
    ↓ contains one or more
User Roles
    ↓ grant
Access Rights
    ↓ produce
Effective Permissions
```

## 7.1 Existing roles

The current application has coarse `ADMIN`, `STAFF`, `VIEWER` roles. Preserve compatibility and existing accepted authorization behavior while evolving toward the new model.

Do not perform a destructive auth rewrite if a migration/compatibility layer is cleaner.

## 7.2 Approved model

- A User Type contains one or more User Roles.
- A User Role grants one or more Access Rights.
- Effective Permissions are the union of Access Rights granted by the user's assigned structure.
- Keep inheritance one-directional and understandable.
- No explicit deny rules in M9.
- No nested roles in M9.
- No arbitrary policy scripting.
- No admin-created Access Right definitions in M9.

The Access Right catalog is code-defined and server-enforced.

The frontend allows authorized administrators to configure assignment of User Types/User Roles and thereby effective Access Rights.

## 7.3 Administrative safety

ADMIN must retain protected administrative authority so a configuration mistake cannot remove all administrative access or lock the system out.

Preserve existing last-active-admin/self-demotion safeguards where applicable.

## 7.4 Initial marketing Access Rights

At minimum, evaluate and implement a controlled catalog supporting concepts equivalent to:

```text
VIEW_MARKETING
MANAGE_CAMPAIGNS
MANAGE_MARKETING_TASKS
MANAGE_CONTENT
APPROVE_CONTENT
MANAGE_ASSETS
MANAGE_ACQUISITION_EVENTS
PROCESS_EVENT_REGISTRATIONS
VIEW_MARKETING_REPORTS
MANAGE_MARKETING_CONFIGURATION
MANAGE_COMPENSATION_ATTRIBUTION
```

Do not use these exact names if repository conventions suggest cleaner naming, but preserve the semantics.

Existing application security areas such as Users/Security Activity should remain protected by their accepted M7 rules unless intentionally migrated into the same Access Right system without weakening security.

## 7.5 M9 V1 access expectation

Conceptually:

- ADMIN: unrestricted application authority and all Access Rights.
- STAFF: may participate in Marketing based on configured Access Rights/User Roles.
- VIEWER: remains Dashboard-only for now unless existing accepted behavior differs.

Do not automatically grant every STAFF user all Marketing capabilities once the new Access Right system exists.

## 7.6 Server enforcement

Every protected API/action must enforce effective Permissions server-side. UI hiding is not security.

Add direct authorization tests.

---

# 8. M9.1 — Marketing Campaign Planning

The application already has an internal Campaign concept used for attribution. Expand it into a deliberate business-level **Marketing Campaign** without confusing it with a Meta Ads Campaign.

## 8.1 Terminology — binding

Use these concepts consistently:

### Marketing Campaign

The application's business-level marketing initiative.

Examples:

- Kids Wrestling Fall 2026
- September Kids Trial Push
- Adult Beginner Awareness
- Referral/Open House initiative

A Marketing Campaign may contain organic content, Marketing Tasks, Assets, Acquisition Events, Tracking Links, and optionally a mapped paid Meta Campaign.

### Meta Campaign

The literal paid-ad Campaign object in Meta Ads Manager.

Meta hierarchy remains:

```text
Meta Campaign
    ↓
Meta Ad Set
    ↓
Meta Ad
```

A Marketing Campaign may map explicitly to a Meta Campaign but they are not the same entity.

Do not auto-match by name.

### Content Item

An individual managed marketing content record such as a reel, post, story, testimonial, promotion, etc.

### Tracking Link

A URL generated by the application that deterministically associates traffic with a Marketing Campaign and optionally a more granular channel/content/source label.

## 8.2 Organic lane vs managed lane

Renzo staff must be able to continue normal spontaneous organic posting outside the application.

Do not require every casual Facebook/Instagram post to become a Content Item or Campaign record.

Once work is deliberately managed as part of a Marketing Campaign, the application becomes the coordination source of truth for that managed work.

## 8.3 Campaign collaboration

Each Marketing Campaign has:

- one accountable Owner;
- zero or more Collaborators.

Do not hardcode Scott, Pedro, Marta, or any named person.

Ownership/collaboration must use existing users.

## 8.4 Campaign fields/concepts

Evaluate current Campaign schema and extend rather than duplicate where possible.

Support concepts equivalent to:

- name;
- description;
- objective;
- offer;
- target audience;
- promoted Program(s);
- Owner;
- Collaborators;
- planned start/end dates;
- actual start/end where useful;
- fixed Campaign status;
- planned budget;
- Meta mapping where applicable;
- Tracking Links;
- notes;
- timestamps/audit.

## 8.5 Campaign statuses

Fixed for M9:

```text
DRAFT
PLANNED
ACTIVE
COMPLETED
CANCELLED
```

Do not build configurable Campaign statuses in M9.

Do not derive the entire status automatically from today's date. Planned dates and actual lifecycle status are separate business concepts.

## 8.6 Budget

Planned budget is optional and `$0` is valid.

Organic/no-spend Campaigns must work normally.

Actual paid spend is separate from planned budget and should come from mapped Meta data where available.

Do not require paid-media fields for Campaign creation.

## 8.7 Tracking links

Preserve the approved M8 design:

- one normal reusable default Tracking Link per Marketing Campaign;
- optional additional labeled links for advanced attribution, e.g. Instagram, Facebook, flyer, QR, specific Content Item;
- do not force separate platform links in normal workflow.

Tracking Links should support public acquisition routes including normal Trial signup and M9 Acquisition Events.

---

# 9. M9.2 — Marketing Tasks

Marketing Tasks are a separate work system from Lead Follow-Up.

Do not reuse `FollowUpTask` as a generic Marketing Task table if that would blur lead-contact semantics.

## 9.1 Required capabilities

Support concepts equivalent to:

- task title/type/description;
- assignee;
- creator;
- due date/time;
- status;
- notes;
- Campaign association;
- optional Content Item association;
- optional Asset association;
- optional Acquisition Event association;
- completion data;
- timestamps/history where appropriate.

Examples:

- Request five kids-class photos.
- Draft caption.
- Prepare creative.
- Create tracking link.
- Review post.
- Publish post manually.
- Review Campaign performance.
- Prepare weekly summary.

## 9.2 Scope control

Do not build generalized project management features such as dependencies, Gantt charts, story points, arbitrary workflows, time tracking, or complex recurrence unless already required by repository architecture.

## 9.3 Operational views

Provide a Marketing work queue or equivalent view that makes assigned/overdue/upcoming Marketing Tasks obvious.

Use Access Rights for task creation/management.

---

# 10. M9.3 — Content Planning and Workflow

## 10.1 Cross-platform model

One Content Item may target multiple channels, including Facebook and Instagram.

Do not duplicate Content Items merely because normal Renzo posting cross-posts between platforms.

Separate Content Items are appropriate only when execution materially differs, such as:

- different creative;
- materially different copy;
- different planned times;
- different owners/publishers;
- distinct campaign purpose.

## 10.2 Publishing responsibility

Publishing uses a mixed model.

Renzo staff can continue spontaneous organic posts outside the system.

Managed Content Items have an explicitly assigned Publisher. The Publisher may be Scott or an authorized Renzo user.

Do not hardcode one publisher.

## 10.3 M9 publishing boundary

M9 does NOT publish directly to Facebook/Instagram and does NOT schedule automated Meta publishing.

However, design Content/Channel/Approval/Asset/Publication records so future milestones can support:

1. direct publishing from the application;
2. scheduled/automated publishing where APIs/permissions allow.

Do not paint the schema into a manual-only corner.

## 10.4 Content statuses

Fixed for M9:

```text
IDEA
NEEDS_ASSETS
DRAFT
NEEDS_REVIEW
APPROVED
READY_TO_PUBLISH
PUBLISHED
CANCELLED
```

Not every Content Item must pass through every status.

Examples:

- no approval required: `DRAFT -> READY_TO_PUBLISH -> PUBLISHED`;
- approval required: `DRAFT -> NEEDS_REVIEW -> APPROVED -> READY_TO_PUBLISH -> PUBLISHED`;
- asset-dependent: may use `NEEDS_ASSETS` until requirements are satisfied.

Do not build configurable Content statuses in M9.

## 10.5 Approval

Content approval is optional/configurable.

Approval may be required by Campaign and/or specific Content Item.

When approval is required, the workflow must actually block progression to publish-ready/published states until approval occurs.

Approval requires the appropriate Access Right, e.g. `APPROVE_CONTENT`.

Record approver and timestamp.

ADMIN retains authority.

## 10.6 Publication history

When content is manually published, record where available:

- actual published timestamp;
- channel/platform;
- public URL;
- external post identifier;
- user who recorded/published it.

Preserve publication history.

Planned publication date/time is separate from actual publication.

Do not use `SCHEDULED` as an M9 status merely because a planned date exists; Meta is not actually scheduling the post yet.

---

# 11. M9.4 — Assets and Asset Requests

M9 must support the real collaboration workflow where Renzo staff provide media to Scott.

## 11.1 Asset requests

Marketing Tasks may request specific Assets, e.g.:

```text
Upload five photos from Thursday Kids BJJ class by Friday.
```

Authorized users can upload directly into the application.

## 11.2 Asset data

Store metadata and storage references, not large binary media blobs in the relational database.

Support concepts such as:

- filename/display name;
- media type;
- storage/reference path;
- uploaded/supplied by;
- uploaded timestamp;
- description/tags where useful;
- Campaign association;
- Content Item association;
- Event association where useful;
- usage history;
- archived state;
- marketing-use status.

Do not overbuild DAM functionality.

## 11.3 Marketing-use status

Because Renzo serves minors, M9 must allow Renzo's determination about whether an Asset is appropriate for marketing use to be recorded.

Working fixed values:

```text
UNKNOWN
APPROVED
RESTRICTED
DO_NOT_USE
```

Interpretation:

- UNKNOWN: usage approval not confirmed.
- APPROVED: Renzo confirms it can be used for marketing.
- RESTRICTED: usable only under stated conditions; require a note/restriction explanation.
- DO_NOT_USE: must not be used for publishable marketing content.

This is not a legal consent-management system and must not claim to determine legal consent.

The content workflow should warn/block appropriately when restricted or disallowed Assets are attached.

## 11.4 Asset deletion/archival

Once an Asset has historical use in published content, Campaign history, or another preserved historical record, normal UI must not hard-delete it.

Archive it instead.

An unused Asset may be deletable by an authorized user if repository conventions support safe deletion.

Changing future marketing-use status must not erase historical evidence that an Asset was previously used.

---

# 12. M9.5 — Acquisition Events

M9 adds a lightweight **Acquisition Event** capability for Campaign-driven special signup opportunities such as:

- Kids Wrestling Open House;
- special beginner clinic;
- trial-focused seminar;
- other acquisition-oriented promotional event.

This is not a general event-management platform.

## 12.1 Event architecture

Use distinct relational concepts equivalent to:

```text
AcquisitionEvent
    ↓ one-to-many
AcquisitionEventSession
    ↓ selected by
AcquisitionEventRegistration / Registration Lines
```

Exact table names should follow repository conventions.

### AcquisitionEvent

Represents the overall business event.

Potential concepts:

- title;
- description;
- associated Marketing Campaign;
- overall audience/program context;
- fixed status;
- registration-open/close window;
- manual registration open/closed control;
- custom questions;
- timestamps/audit.

### AcquisitionEventSession

Represents one selectable occurrence/option under the Event.

Support concepts equivalent to:

- Event relationship;
- session name/label;
- date/time;
- optional Program;
- optional minimum/maximum age;
- optional capacity;
- active/available status where appropriate.

One Event may have multiple Sessions/dates/times.

Capacity is optional; blank means unlimited.

A Session closes when capacity is reached.

No waitlist in M9.

### Event status

Fixed for M9:

```text
DRAFT
PUBLISHED
COMPLETED
CANCELLED
```

Do not make Event statuses configurable yet.

## 12.2 Public registration

Public Event registration requires no account/login.

Optimize for minimal friction, similar to the existing public Trial experience.

Support one household/primary contact registering multiple participants in one submission.

Each participant may choose their own Event Session, subject to eligibility/capacity.

The UI must make the hierarchy extremely clear:

```text
Primary contact / household
    ↓
Participant 1 -> selected Session
Participant 2 -> selected Session
...
```

Do not create confusing flat forms where staff/customers cannot tell which Session belongs to which participant.

## 12.3 Registration does NOT immediately create Leads

This is a binding design change.

Public or staff Event registration initially creates Event Registration data only.

Do not immediately create LeadHeader/LeadLine records merely because someone registers.

After the Event, staff uses a deliberate batch process to hand registrations into the acquisition CRM.

This separates:

```text
Marketing/Event operations
    ↓
Registration roster + attendance
    ↓
Reviewed batch processing
    ↓
Lead acquisition CRM
```

## 12.4 Staff manual registration

Authorized staff can create registrations from inside the Event roster for phone/walk-in/referral scenarios without impersonating a user through the public form.

Use the same underlying registration model.

Allow manual source attribution.

## 12.5 Attribution during registration

Public registration must preserve Tracking Link/Marketing Campaign attribution automatically where available.

Staff-created registrations may record manual sources such as:

- PHONE;
- WALK_IN;
- REFERRAL;
- OTHER;
- existing source entities where appropriate.

Unknown/unattributed must remain valid.

Do not fabricate tracking precision.

## 12.6 Custom Event questions

Events may define simple custom registration questions.

M9 field types are intentionally constrained, e.g.:

- short text;
- yes/no;
- single-choice.

Store responses with the Event Registration.

Do not build a generic drag-and-drop form builder.

## 12.7 Registration window

Support optional registration-open and registration-close date/times independent of capacity.

Authorized staff can manually close/reopen registration subject to Event status/business rules.

## 12.8 Registration editing

Authorized staff can edit registrations before batch processing, including participant details and Session selection.

Preserve basic change history/audit.

After processing, corrections remain possible, but the original Event Registration and associations to resulting Lead records must remain preserved.

## 12.9 Attendance roster

Event staff need an operational roster/check-in experience.

Record participant-level attendance outcomes separately from registration.

Use concepts equivalent to:

```text
REGISTERED
ATTENDED
NO_SHOW
CANCELLED
```

Do not automatically treat Event attendance as Trial attendance.

Event attendance is a distinct lifecycle event.

Allow relevant notes/context on roster rows.

## 12.10 Batch processing — critical workflow

After/around Event completion, an authorized user with the **Process Event Registrations** Access Right runs a deliberate reviewable batch process.

The batch process should:

1. show a preview before execution;
2. identify likely existing LeadHeader/LeadLine matches;
3. identify registrations likely to create new households;
4. show participant-to-LeadLine outcomes;
5. show registrations excluded from processing;
6. show ambiguous duplicates requiring human resolution;
7. show the number of household Follow-Up tasks that will be created;
8. then execute transactionally/idempotently.

Example preview concept:

```text
28 registrations
19 new households
4 existing household matches
3 ambiguous duplicate reviews
2 excluded registrations
19 household Follow-Up tasks to create
```

Exact UI may differ but must be understandable before execution.

### Default inclusion

ATTENDED and NO_SHOW registrations are included for Lead creation/matching by default.

Staff may explicitly exclude individual registrations that clearly should not become acquisition Leads.

Cancelled registrations should not silently become Leads unless explicitly included by authorized staff under a documented rule.

### Household consolidation

If one parent/primary contact registered multiple participants, batch processing should create/match one LeadHeader with multiple LeadLines as appropriate, not duplicate households.

Create only one applicable household Follow-Up task for the batch/Event relationship, consistent with the accepted household Follow-Up architecture.

Participant/Event history remains person-specific.

### Existing Leads

If the registration belongs to an existing household/person:

- attach the Event Registration/history to the existing record;
- do not create a duplicate merely because they registered for a new Event;
- preserve original acquisition attribution and Compensation Attribution;
- create new Follow-Up only when appropriate under the Event follow-up rule;
- ambiguous matches require explicit human confirmation.

Never silently merge merely because names/contact details are similar.

### Idempotency

Running the batch process twice must not create duplicate households, LeadLines, Event associations, or household Follow-Up tasks.

Each processed Registration/participant must permanently record the LeadHeader/LeadLine association it produced or matched.

### Transaction integrity

Batch execution should use appropriate transactions. Partial failure must not leave contradictory acquisition state.

## 12.11 Post-Event Follow-Up

The approved operational model is that valid processed Event registrants create/ensure household-level Follow-Up work.

Attendance informs how staff handles the Follow-Up:

- ATTENDED: follow up on experience, interest, Trial scheduling, or direct joining;
- NO_SHOW: check in, offer another Event or Trial;
- other statuses: show context clearly.

Event attendance does not force a subsequent Trial. A person may later:

- schedule one or more Trials;
- join directly;
- become Lost;
- remain in active follow-up.

The Lead/Trial history must preserve all of this chronologically.

## 12.12 Event communications

Acquisition Events should support confirmation/reminder communication architecture.

Where current application communication infrastructure permits practical implementation, support things such as:

- registration confirmation;
- pre-Event reminder;
- communication history.

Do not invent a full SMS/email platform if it does not yet exist. At minimum, structure the domain so later automated communications are straightforward.

---

# 13. M9.6 — Acquisition Attribution, Compensation Attribution, Compensation Ledger

Scott's business arrangement requires a durable trail showing which acquisitions are attributable to his work and what compensation is owed.

Do not use a vague hidden boolean such as `owned` as the sole source of truth.

Separate these concepts explicitly:

```text
Acquisition Attribution
= what brought the prospect into the system

Operational Ownership
= who is currently working the Lead/Task/Campaign

Compensation Attribution
= who is entitled to acquisition credit under the business agreement
```

These must not overwrite one another.

## 13.1 Acquisition history

Preserve original acquisition evidence such as:

- source;
- Marketing Campaign;
- Tracking Link;
- Acquisition Event;
- relevant timestamps;
- deterministic UTM/tracking data where already supported.

Later staff action must not blur or overwrite the acquisition origin.

## 13.2 Compensation Attribution

Implement a structured concept rather than relying only on current Lead owner/source fields.

Compensation Attribution is per LeadLine/prospective member because compensation is ultimately tied to the individual conversion outcome.

When multiple participants enter through the same qualifying acquisition, the system may default the same Compensation Attribution to each resulting LeadLine during processing.

Support concepts equivalent to:

- credited user/person;
- qualifying acquisition evidence;
- Marketing Campaign/Tracking Link/Event relationship where applicable;
- established timestamp;
- method/source of attribution;
- eligibility/status;
- system-established vs manually assigned/overridden;
- correction history;
- actor;
- correction reason.

## 13.3 Automatic vs manual attribution

Use a hybrid model:

- deterministic evidence from qualifying Tracking Links/Campaign/Event flows may automatically establish default Compensation Attribution;
- manual/offline Leads may remain unassigned or be assigned by ADMIN;
- ADMIN can correct with required reason;
- distinguish system-established from manually overridden attribution.

Do not infer compensation from loose date coincidence.

## 13.4 Change permissions

Changing Compensation Attribution after establishment is ADMIN-only or protected by an equivalent high-level Access Right that only ADMIN receives in current Renzo configuration.

A required correction reason must be stored.

Do not silently overwrite history.

## 13.5 Conversion compensation snapshot

When a LeadLine reaches Joined and qualifies for compensation, create a permanent compensation-earned snapshot.

Preserve enough data to prevent later Campaign/pricing/configuration changes from rewriting history.

Support concepts equivalent to:

- LeadLine / Conversion reference;
- compensation owner;
- acquisition evidence snapshot/reference;
- membership offering/value snapshot;
- compensation basis;
- compensation amount earned;
- earned date;
- payment state;
- payment date;
- timestamps/audit.

Current business arrangement may be represented through configurable compensation basis rather than hardcoding a universal percentage if existing project configuration suggests a better pattern.

Do not assume all future customers use Scott's compensation arrangement.

## 13.6 Narrow compensation ledger

M9 should provide a simple ledger/report sufficient to answer:

- what compensation has been earned;
- who earned it;
- what acquisition produced it;
- which LeadLine converted;
- amount owed;
- Unpaid vs Paid;
- payment date.

This is not accounting.

Do not implement:

- invoices;
- AR/AP;
- payment processing;
- journal entries;
- QuickBooks;
- tax accounting.

Use simple states equivalent to:

```text
UNPAID
PAID
```

Do not allow compensation payment status to alter acquisition history.

---

# 14. M9.7 — Marketing Command Center, Reporting, and Meta Validation

Create a distinct Marketing operational landing area rather than overloading the existing acquisition Dashboard.

## 14.1 Marketing Dashboard / Command Center

Useful V1 elements include:

- active Marketing Campaigns;
- Campaigns approaching start/end;
- overdue Marketing Tasks;
- Marketing Tasks due soon;
- Content needing Assets;
- Content needing review;
- Content ready to publish;
- upcoming planned publications;
- recently published Content;
- outstanding Asset requests;
- Acquisition Events approaching registration/event dates;
- recent Event registration counts;
- planned Campaign budget;
- actual Meta spend where mapped;
- downstream Leads/Trials/Joined/acquired MRR by Campaign where reliable.

Do not duplicate every acquisition Dashboard metric.

## 14.2 Reporting distinctions

Clearly distinguish:

```text
Meta-reported metrics
```

from:

```text
Internal CRM outcomes
```

from:

```text
Deterministically attributed outcomes
```

Do not manufacture attribution precision.

## 14.3 Campaign reporting

Where data supports it, expose useful Marketing Campaign outcomes such as:

- registrations;
- Leads generated;
- Trials scheduled;
- Trials attended;
- Joined members;
- acquired MRR;
- Event attendance;
- planned budget;
- actual Meta spend;
- cost metrics where mathematically defensible.

Person-based funnel reporting must not double-count a LeadLine merely because it attended multiple Trials or Events.

Trial/Event activity reporting may count individual events when explicitly labeled as event counts.

## 14.4 Meta boundary

M9 keeps Meta read-only.

Do not implement:

- Meta ad creation;
- budget editing;
- automated optimization;
- direct social publishing;
- scheduled social publishing;
- Messenger/Instagram automation.

Preserve the future path to direct/automated publishing.

Continue explicit ADMIN-controlled internal Marketing Campaign ↔ Meta Campaign mapping.

---

# 15. Navigation / UI Architecture

Preserve the acquisition-first application shell while adding a distinct Marketing area.

Evaluate a navigation structure conceptually similar to:

```text
Dashboard
Leads
Follow-Up
Marketing
  Campaigns
  Tasks
  Content / Calendar
  Assets
  Events
  Marketing Dashboard
Reports
Catalog / Configuration
Users / Access
Security Activity
Settings
```

Do not mechanically implement this exact tree if existing navigation patterns suggest a cleaner solution, but keep Marketing distinct and discoverable.

Use the accepted M6 design system/components.

## 15.1 UI/UX priority

M9 involves complex relational workflows. Human readability is an explicit acceptance requirement.

Pay special attention to:

- Campaign Owner vs Collaborators;
- Content publisher vs approver;
- participant/session relationships;
- Event roster attendance;
- batch-processing preview;
- duplicate/match resolution;
- Lead creation/matching outcomes;
- Compensation Attribution vs operational assignee;
- warnings for restricted Assets;
- confirmation before consequential batch/admin operations.

Do not expose raw IDs as the main user-facing explanation.

Use plain operational language.

---

# 16. Audit / History Requirements

Reuse existing audit/history patterns where appropriate.

At minimum preserve meaningful history for:

- User Type/Role/Access Right assignment changes;
- Campaign ownership/status changes;
- Content approvals/publication;
- Asset marketing-use status changes;
- Event registration edits;
- Event attendance changes;
- Event batch execution;
- duplicate/match decisions;
- Compensation Attribution creation/correction;
- compensation Paid/Unpaid state changes.

Do not log secrets or huge payloads.

---

# 17. Time, Money, and Data Integrity

Business timezone remains:

```text
America/Denver
```

Store absolute timestamps consistently following current project conventions and apply Mountain Time for business date/time semantics.

Use existing safe money representation conventions, currently expected to be integer cents unless repository reality differs.

Avoid floating-point money calculations.

Use transactions for multi-record operations such as:

- Event batch processing;
- Compensation snapshot creation during conversion;
- related permission assignment operations where consistency requires it.

Do not weaken accepted M8 invariants.

---

# 18. Existing M8 Regression Requirements

M9 must preserve all accepted acquisition behavior, especially:

- LeadHeader/LeadLine household model;
- at most one SELF LeadLine per household;
- public Trial booking;
- valid class/date/time availability;
- staff Trial scheduling;
- repeated Trial cycle `TRIAL_SCHEDULED -> TRIAL_ATTENDED -> TRIAL_SCHEDULED` until final outcome;
- Trial history;
- Joined/Lost final outcome protections;
- household-level Follow-Up;
- no duplicate pending household Follow-Up tasks;
- Forecast MRR excluding Joined/Lost lines;
- Campaign Tracking Links;
- explicit Meta mappings;
- Reports/CSV;
- M7 auth/security/RBAC.

Marketing work must not break acquisition workflows.

---

# 19. Testing Requirements

Do not depend on live Meta access for automated tests.

Add deterministic automated coverage for each M9 sub-milestone.

## 19.1 Access Rights

Test:

- User Type -> User Role -> Access Right resolution;
- union of effective Permissions;
- ADMIN safety;
- STAFF with/without specific rights;
- VIEWER boundaries;
- server API denial regardless of frontend visibility;
- assignment changes taking effect correctly;
- lockout/last-admin safeguards.

## 19.2 Campaigns

Test:

- owner/collaborators;
- fixed statuses;
- `$0` budget;
- no-spend Campaign;
- Tracking Link behavior;
- explicit Meta mapping;
- permissions.

## 19.3 Marketing Tasks

Test:

- creation/assignment;
- due dates;
- lifecycle;
- Campaign relationships;
- optional Content/Asset/Event relationships;
- permissions;
- no interaction/regression with Lead Follow-Up.

## 19.4 Content

Test:

- multi-channel Content Item;
- optional approval;
- approval-required blocking;
- Approve Content Access Right;
- status transitions;
- assigned Publisher;
- publication history;
- restricted Asset behavior.

## 19.5 Assets

Test:

- upload metadata/reference;
- marketing-use statuses;
- RESTRICTED note requirement where implemented;
- DO_NOT_USE publication blocking;
- archival of historically used Assets;
- permissions.

## 19.6 Acquisition Events

Test:

- Event/session creation;
- multiple Sessions;
- capacity/unlimited capacity;
- registration windows;
- public registration without login;
- multi-participant registration;
- participant-specific Session choice;
- age/program eligibility;
- manual staff registration;
- automatic tracking attribution;
- manual source attribution;
- custom registration questions;
- registration edits;
- attendance outcomes;
- batch preview;
- new household creation;
- existing household/Lead match;
- ambiguous duplicate requiring confirmation;
- participant-to-LeadLine association;
- household consolidation;
- one household Follow-Up task;
- exclude registration;
- ATTENDED/NO_SHOW default inclusion;
- idempotent second batch run;
- transaction rollback/failure path;
- permissions.

## 19.7 Compensation

Test:

- system-established Compensation Attribution;
- manual assignment;
- ADMIN-only correction;
- required correction reason;
- immutable/history preservation;
- per-LeadLine attribution;
- existing Lead Event does not overwrite prior attribution;
- Joined compensation-earned snapshot;
- amount/basis preservation;
- Unpaid/Paid transitions;
- payment date;
- later Campaign/price edits do not rewrite snapshot.

## 19.8 Full regression

Run all existing M4–M8 tests plus new M9 tests.

---

# 20. QA Gates

At each major checkpoint, run the relevant tests.

Before declaring M9 implementation ready for human acceptance, run at minimum:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also verify:

- migrations from a clean SQLite database;
- migrations from current accepted M8 database state;
- seed/config initialization if affected;
- no secrets in Git diff;
- no local Obsidian files committed;
- no accidental Meta token exposure;
- no authorization bypass;
- no duplicated business truth;
- no raw media stored in the relational database unless the repository already has an intentional established storage mechanism.

If commands differ in the actual repository, use the repository's authoritative scripts and document the equivalent gates.

---

# 21. Human Acceptance Checklist to Produce

At completion, provide Scott with a detailed browser acceptance plan covering at least:

## Access Rights

- create/configure a User Type;
- assign User Roles;
- verify resulting Access Rights;
- verify STAFF permission differences;
- verify direct unauthorized route/API denial;
- verify ADMIN cannot be accidentally locked out.

## Marketing Campaign

- create organic `$0` Campaign;
- assign Owner/Collaborators;
- create Tracking Link;
- map/unmap Meta Campaign where current data exists;
- move through Campaign statuses.

## Marketing Tasks

- assign Pedro/Marta-equivalent test users tasks;
- complete/overdue workflow;
- verify tasks stay separate from Lead Follow-Up.

## Content

- create multi-channel Content Item;
- request Assets;
- test no-approval path;
- test approval-required path;
- assign Publisher;
- record manual publication URL/time;
- verify history.

## Assets

- upload;
- approve marketing use;
- restrict;
- block DO_NOT_USE;
- archive historically used Asset.

## Acquisition Event

- create Event with two Sessions;
- capacities and eligibility;
- public registration of multiple participants;
- staff manual registration;
- tracked vs manual source attribution;
- custom questions;
- registration edit;
- roster attendance/no-show;
- batch preview clarity;
- existing Lead match;
- new household creation;
- ambiguous duplicate review;
- exclusion;
- execute batch;
- verify one household Follow-Up task;
- rerun batch and verify no duplicates;
- verify resulting Lead/LeadLine history.

## Compensation

- tracked acquisition auto-establishes Compensation Attribution;
- offline Lead remains manual/unassigned as designed;
- ADMIN correction requires reason;
- Join creates compensation snapshot;
- mark Unpaid/Paid;
- verify history remains unchanged when operational ownership changes.

## Marketing Dashboard

- active Campaigns;
- overdue tasks;
- Content needing action;
- Events;
- planned vs actual spend;
- Campaign acquisition outcomes where data exists.

## Responsive UX

Test major M9 flows on desktop and narrow/mobile widths, especially:

- Event public registration;
- Event roster;
- batch preview;
- Campaign/Content forms;
- Asset selection;
- permission configuration.

---

# 22. Explicit M9 Non-Goals

Do not implement:

- PostgreSQL migration;
- Docker production deployment;
- VPS provisioning;
- multi-tenant shared database;
- second-customer provisioning;
- subscription billing;
- customer self-service onboarding;
- Meta ad creation/editing;
- automated Meta budgets;
- direct/automated Facebook/Instagram publishing;
- Messenger/Instagram DM automation;
- sophisticated multi-touch attribution;
- generalized event ticketing/payments;
- event waitlists;
- arbitrary workflow engine;
- generic project-management suite;
- generic legal consent-management platform;
- generic form-builder platform;
- accounting/AR/AP;
- payment processing;
- QuickBooks integration.

---

# 23. Stop Conditions

Stop and report before making a major architectural substitution if:

- the current `M9` branch is not the active branch;
- M8 accepted repository state is materially inconsistent with this specification;
- implementing Access Rights would require discarding accepted M7 security without a safe migration path;
- current Campaign schema cannot be extended without destructive history loss;
- Event batch processing cannot be made transactional/idempotent using the existing architecture;
- compensation requirements conflict with current Conversion architecture in a way that needs a business decision;
- actual storage architecture makes Asset upload unsafe or impossible without a new infrastructure decision;
- existing tests are failing before M9 changes;
- a requested implementation would expose Meta credentials or secrets;
- implementation would require inventing an unresolved business rule.

Do not fake success.

---

# 24. Implementation Sequence

Recommended order:

## Phase 0 — Audit and plan

- confirm branch/status;
- read handoffs;
- inspect schema/code/tests;
- produce a concise implementation plan mapped to M9.0–M9.7;
- identify migrations and compatibility concerns.

## Phase 1 — M9.0 permissions foundation

Implement User Types/User Roles/Access Rights/effective Permissions and frontend administration first.

Commit/push checkpoint.

## Phase 2 — M9.1 Campaign planning

Expand Campaign domain while preserving current attribution/Meta mapping.

Commit/push checkpoint.

## Phase 3 — M9.2 Marketing Tasks

Implement separate Marketing work queue.

Commit/push checkpoint.

## Phase 4 — M9.3 Content

Implement Content lifecycle, channels, Publisher, approval, publication records.

Commit/push checkpoint.

## Phase 5 — M9.4 Assets

Implement Asset requests/library/marketing-use controls/archive behavior.

Commit/push checkpoint.

## Phase 6 — M9.5 Acquisition Events

Implement Event/Session/Registration/roster/batch workflow.

This is a high-risk area. Keep transaction/idempotency tests strong.

Commit/push checkpoint.

## Phase 7 — M9.6 Compensation Attribution

Implement attribution ownership and compensation ledger/snapshot behavior integrated with Conversion.

Commit/push checkpoint.

## Phase 8 — M9.7 Marketing command center/reporting

Implement Marketing Dashboard/reporting and validate read-only Meta integration relationships.

Commit/push checkpoint.

## Phase 9 — full regression and self-review

Run complete QA gates, inspect diff/history, create handoff, push final M9 implementation state.

Do not merge M9.

---

# 25. Required Completion Handoff

Create a detailed repository handoff document, preferably:

```text
vault/wip/M9_Implementation_Handoff_2026-09-02.md
```

or the repository's established naming convention.

The handoff must include:

1. branch and final HEAD;
2. commit list by M9 checkpoint;
3. push status;
4. files/tables/migrations added or changed;
5. User Type/User Role/Access Right architecture;
6. exact Access Right catalog;
7. Campaign schema/workflow;
8. Marketing Task schema/workflow;
9. Content statuses and approval logic;
10. Asset storage approach and marketing-use behavior;
11. Event/EventSession/Registration architecture;
12. batch processing algorithm, matching, idempotency, transactions;
13. attribution/Compensation Attribution architecture;
14. compensation snapshot/ledger behavior;
15. Marketing Dashboard/reporting;
16. Meta integration impacts;
17. full test/lint/typecheck/build results;
18. migration verification results;
19. known limitations/technical debt;
20. explicit human acceptance checklist;
21. any decisions that still require Scott.

Finish the handoff with exactly one of:

```text
M9 READY FOR HUMAN ACCEPTANCE
```

or:

```text
M9 NOT READY FOR HUMAN ACCEPTANCE
```

Do not claim M9 complete merely because implementation is finished. Scott's human acceptance remains the closure gate.

---

# 26. Final Product Principles

Keep these principles visible throughout implementation:

```text
Build Renzo's real workflow first.
Preserve one canonical product codebase.
Configuration over customer-specific code.
Roles/access are server-enforced.
Marketing Tasks are not Lead Follow-Up Tasks.
Marketing Campaign is not Meta Campaign.
Spontaneous organic posting remains easy.
Managed Campaign work is coordinated in the application.
Tracking Links provide deterministic attribution where possible.
Do not fabricate attribution precision.
Event registrations remain Event records until deliberate batch processing.
Batch processing must be understandable, idempotent, and transactional.
Household communication stays household-level.
Person outcomes stay LeadLine-level.
Acquisition origin, operational ownership, and compensation ownership are separate concepts.
Compensation history must not become blurry as staff touches the Lead later.
M9 does not publish to Meta, but future direct/automated publishing must remain possible.
Preserve history instead of overwriting meaningful business events.
Do not turn M9 into billing, accounting, generic project management, or full gym management.
Human browser acceptance is mandatory before M9 is closed.
```

