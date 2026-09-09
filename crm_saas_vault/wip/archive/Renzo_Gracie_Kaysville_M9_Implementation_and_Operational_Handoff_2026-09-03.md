---
type: note
status: current
area: process
updated: 2026-09-03
tags:
  - m9
  - handoff
  - operations
---

# Renzo Gracie Kaysville — M9 Implementation and Operational Handoff

**Date:** 2026-09-03  
**Audience:** another ChatGPT instance that already knows the gym at a high level, talking with Scott over voice during a commute.  
**Source of truth:** the `M9` branch in this repository as inspected, not the original M9 prompt.

A shorter architect evidence note already exists at [[wip/M9_Implementation_Handoff_2026-09-02]]. This document is the operational story: what staff actually have, how to use it, where the UI is thinner than the server, and what Scott should poke at in a browser.

Scott’s human acceptance is still the closure gate. Automated tests passing does **not** mean M9 is accepted.

---

## 1. Executive Summary

M9 turned the accepted acquisition CRM (households, Trials, Follow-up calls, conversion, reports, read-only Meta) into a **collaborative marketing-operations system that feeds that CRM**. Marketing is a distinct staff area. It does not replace Leads, Follow-up, or the acquisition Dashboard.

**What Scott and staff can do now**

1. **Access Rights** on top of ADMIN / STAFF / VIEWER, so Pedro or Marta can get Marketing without becoming ADMIN.
2. **Marketing Campaigns** as planned work (organic `$0` is valid), with Tracking Links to `/trial` or `/events/:slug`.
3. **Marketing Tasks** — a work queue that is **not** Lead Follow-up.
4. **Content Items** with optional approval and **manual** publication history. The app does not post to Facebook or Instagram.
5. **Assets** on disk, with marketing-use labels (Unknown / Approved / Restricted / Do Not Use). This is **not** legal consent software.
6. **Acquisition Events** (open houses, clinics): public signup, staff roster, then a **previewed batch** that creates or matches households.
7. **Compensation Attribution** per prospective member, snapshotted when they Join, shown on a Marketing ledger — **not** on the gym Dashboard.

**What changed from M8**

M8 already had households, catalog, conversion, campaigns-as-tracking, reports, and Meta V1. M9 **extends** the same `campaigns` table rather than inventing a second campaign product. It adds Marketing as a hub (`/marketing`), public `/events/:slug`, Access Rights, and compensation. Acquisition behavior (Trial reschedule, household Follow-up consolidation, no silent merge) is preserved.

**Current boundaries**

Still one Nuxt app, SQLite, America/Denver display, integer cents. Still no PostgreSQL, no production Raspberry Pi deploy, no SMS/email send, no Meta create/publish, no waitlists, no DAM, no accounting.

**Intentionally not built (or only half-exposed in the UI)**

The spec asked for several things the **server** implements but the **staff screens** barely expose: campaign collaborators and program join tables, planned/actual campaign dates, event registration open/close timestamps, including cancelled rows in a batch, Marketing Task links to a specific Content/Asset/Event, and a Lead-detail screen to assign compensation. Those APIs exist. Scott will not see most of them unless he uses the API or a later UI pass. `MANAGE_MARKETING_CONFIGURATION` is in the Access Right catalog and **no route uses it**.

**Status:** implemented on branch `M9`, pushed, **not merged**. Tests/lint/typecheck/build green as of this document. Browser QA of Marketing and `/events/:slug` was **not** done in the implementation session.

---

## 2. Git / Repository State

Inspected 2026-09-03.

| Item | Actual |
|---|---|
| Current branch | `M9` |
| Tracks | `origin/M9` |
| HEAD | `b398b8c` (`b398b8cd559304d4ad00f50de8a0d7f7e855ce6d`) |
| Default branch in this clone | `master` at `32b640f` (`origin/master`) — there is no local `main` |
| Merged to `master` / `main`? | **No** |
| Tags | **None** |
| Working tree | `data/renzo.sqlite` modified (local database). Do not commit it. Gitignore sqlite lines were commented in `77a0064` so this file can show up in `git status`. |
| Everything committed? | Application and vault M9 work is committed. Only local SQLite is dirty. |

**M9 commits, oldest → newest**

| Hash | Message |
|---|---|
| `7572920` | Initial M9 branch commit |
| `77a0064` | Removing sqlite files from gitignore to move over to laptop |
| `d99df00` | Add User Types, User Roles, and Access Rights with ADMIN safety. |
| `4aa012e` | Expand Marketing Campaigns with lifecycle, ownership, and destinations. |
| `b6dd059` | Add a Marketing Task queue separate from Lead Follow-up. |
| `460fdf9` | Add content planning with optional approval and publication history. |
| `2749d8f` | Add marketing asset library with disk storage and marketing-use controls. |
| `8e93ccd` | Add Acquisition Events with roster, public signup, and batch Lead processing. |
| `05d78e2` | Add Compensation Attribution and a JOINED earned snapshot ledger. |
| `b6b6ff0` | Add a Marketing command center with labeled Meta, CRM, and attributed outcomes. |
| `b398b8c` | Record M9 QA results and the Collaborative Marketing Operations handoff. |

`origin/M9` is at `b398b8c`. Do not merge `M9` unless Scott asks.

---

## 3. Database / Schema Changes

Migrations **`0013`–`0019`**. Journal currently runs **20** migrations (`0000`–`0019`). Schema: `server/database/schema/index.ts`.

Product-layer tags used below:

- **Platform:** generic marketing-ops / CRM building block.
- **Martial arts:** gym acquisition semantics (Program, Trial vs Event, household kids).
- **Renzo config:** seeded numbers or gym-specific defaults, changeable without a code fork.

### Access catalog (platform)

| Table | Purpose |
|---|---|
| `user_types` | Named type (Administrator / Staff / Viewer). Has `coarseRole` matching ADMIN/STAFF/VIEWER. Unique `code`. |
| `user_roles` | Named capability bundles (Campaign manager, Event processor, …). Unique `code`. |
| `user_type_roles` | Which roles a type contains. Unique pair. |
| `user_role_access_rights` | Which catalog Access Right strings a role grants. Unique pair. Rights are **not** a table of admin-created keys. |
| `user_role_assignments` | Extra roles on a **user**, unioned with the type. Unique pair. |
| `users.user_type_id` | Optional FK. Seed maps existing users from coarse `role`. |

No deny rules. No nested roles. History of assignment changes goes to `security_events`, not a dedicated access-history table.

### Marketing Campaigns (platform; martial-arts programs optional)

Same `campaigns` table as M8, extended.

Important fields: `kind` ORGANIC\|PAID, `status` DRAFT\|PLANNED\|ACTIVE\|COMPLETED\|CANCELLED, `active` **synced from** `status === 'ACTIVE'`, `budgetCents` planned (nullable, `$0` stored as 0), planning copy (`description`, `objective`, `offer`, `targetAudience`, `notes`), `ownerUserId`, planned `startsAt`/`endsAt`, actual `actualStartsAt`/`actualEndsAt`.

Join tables: `campaign_collaborators`, `campaign_programs`. Unique pairs.

`campaign_tracking_links`: reusable codes, default link on create, `destinationPath` default `/trial`. Unique `code`.

Backfill in migration: previously `active=true` → `ACTIVE`, `active=false` → `COMPLETED`.

**Renzo config:** none hardcoded to Scott. Owner is whichever user id staff pick.

### Marketing Tasks (platform)

`marketing_tasks`: title, `type` (ASSET_REQUEST, DRAFT_CAPTION, PREPARE_CREATIVE, CREATE_TRACKING_LINK, REVIEW, PUBLISH, REVIEW_PERFORMANCE, WEEKLY_SUMMARY, OTHER), `status` PENDING\|COMPLETED\|CANCELLED, `dueAt`, assignee, creator, optional `campaignId` / `contentItemId` / `assetId` / `eventId`, `notes`, completion stamp. **No** Gantt, recurrence, or dependencies. **No** separate notes/history table.

Due buckets Overdue / Due today / Upcoming are **derived** in Denver, same helper as Follow-up (`followUpDueState`). They are not stored.

### Content (platform)

- `content_items`: status IDEA\|NEEDS_ASSETS\|DRAFT\|NEEDS_REVIEW\|APPROVED\|READY_TO_PUBLISH\|PUBLISHED\|CANCELLED. **No SCHEDULED status.** Optional `approvalRequired`, `approvedByUserId`, `approvedAt`, `publisherUserId`, `plannedPublishAt`, `campaignId`.
- `content_item_channels`: FACEBOOK\|INSTAGRAM\|OTHER. Unique pair.
- `content_publications`: append-only publication **records** (channel, `publishedAt`, `publicUrl`, `externalPostId`, actor). Does not call Meta.

Campaign-level “this campaign requires approval” is **not** a campaign column. Approval is **per Content Item**.

### Assets (platform)

- `assets`: metadata + `storagePath` (filename). Bytes on disk (`data/uploads/` or `ASSET_UPLOAD_DIR`). `marketingUseStatus` UNKNOWN\|APPROVED\|RESTRICTED\|DO_NOT_USE. RESTRICTED needs `restrictionNote`. `archived` boolean. Optional campaign/content/event ids. `uploadedByUserId`.
- `asset_usages`: attachment rows (`usageKind` default ATTACHED). Used assets must **archive**, not hard-delete. Unused may delete.

This is operational marketing-use tracking, **not** a consent/legal system.

### Acquisition Events (martial arts acquisition; platform-shaped)

```text
acquisition_events
  → acquisition_event_sessions (capacity, min/max age, program, times)
  → acquisition_event_questions (SHORT_TEXT | YES_NO | SINGLE_CHOICE)
  → acquisition_event_registrations (household contact + attribution)
       → acquisition_event_registration_lines (participant + session + attendance)
       → acquisition_event_question_answers
       → acquisition_event_registration_history
       → acquisition_event_communication_intents
```

Event status: DRAFT\|PUBLISHED\|COMPLETED\|CANCELLED. Unique `slug`. Registration windows: `registrationOpensAt` / `registrationClosesAt` / `registrationManuallyClosed`. Capacity is **per session**; blank = unlimited. **No waitlist table.**

Attendance on **lines**: REGISTERED\|ATTENDED\|NO_SHOW\|CANCELLED.

After batch: `registrations.lead_id`, `lines.lead_line_id`, `processedAt`. Original registration rows stay.

`follow_up_tasks.source_event_id` plus a unique index on (`leadId`, `sourceEventId`) where purpose is `EVENT_FOLLOW_UP`. Purpose enum is INITIAL_SCHEDULE \| EVENT_FOLLOW_UP \| MANUAL.

Communication intents: on public signup the server inserts kind `CONFIRMATION`, channel EMAIL or SMS, status **`RECORDED_INTENT`**. Nothing is sent.

### Attribution and compensation (platform; Renzo 50% seed)

LeadHeader still holds **acquisition** campaign/UTM/source (M8). Unchanged conceptually.

New per **LeadLine**:

- `compensation_attributions` — unique `lead_line_id`. credited user, campaign/link/event, `establishedAt`, method TRACKING_LINK\|CAMPAIGN\|EVENT\|MANUAL, origin SYSTEM\|MANUAL, eligibility UNASSIGNED\|ELIGIBLE\|INELIGIBLE.
- `compensation_attribution_history` — append-only, with `reason` and actor.
- `compensation_earned` — unique `conversion_id`. Snapshot of offering name, monthly cents, basis, bps, amount cents, earned date, payment UNPAID\|PAID, paidAt, paidBy.

**Renzo config:** `app_settings` keys `compensation.basis` = `PERCENT_OF_MONTHLY`, `compensation.percent_bps` = `5000` (50%). Not hardcoded to Scott. ADMIN can change settings via generic `app_settings` if they use that API; there is **no** dedicated compensation-rate screen.

### Meta (unchanged V1, platform integration)

`meta_ad_accounts`, `meta_campaigns`, `meta_ad_sets`, `meta_ads`, `meta_daily_metrics` (spendCents, impressions, reach, clicks, ctr/cpc/cpm as text, leadsCount), `meta_sync_runs`, `campaign_meta_maps` (explicit id map). Read-only Graph v25.0.

### Not implemented as tables

- Waitlists
- Generic form-builder
- DAM / public CDN
- Accounting / invoices
- Real message send
- Admin-created Access Right keys
- Campaign-level approval flag
- Separate Asset Request entity (requests are Marketing Tasks of type ASSET_REQUEST)
- Pending-household `INITIAL_SCHEDULE` unique on `leadId` (explicitly **not** added)

---

## 4. Access Rights and Permissions

### What was implemented

Exactly the intended chain, with one hard override:

```text
User.role (ADMIN | STAFF | VIEWER)     ← still the CRM/Settings gate
User ── User Type ── User Roles ── Access Rights (fixed catalog)
     └── extra User Role assignments
Effective Marketing rights = union of those grants
ADMIN (coarse role) ⇒ every Access Right in code, even if tables are empty
```

STAFF **starts with no marketing roles on the Staff type**. Seeded User Roles exist as a catalog. ADMIN assigns them. VIEWER stays dashboard-only; even if someone attached marketing roles to a Viewer type, CRM and Marketing pages/APIs still 403 VIEWER on coarse-role checks for CRM, and Marketing middleware still needs `VIEW_MARKETING` — VIEWER is not given that by seed.

### Catalog (actual keys)

`VIEW_MARKETING`, `MANAGE_CAMPAIGNS`, `MANAGE_MARKETING_TASKS`, `MANAGE_CONTENT`, `APPROVE_CONTENT`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`, `PROCESS_EVENT_REGISTRATIONS`, `VIEW_MARKETING_REPORTS`, `MANAGE_MARKETING_CONFIGURATION`, `MANAGE_COMPENSATION_ATTRIBUTION`.

Seeded roles (examples, **not** people): MARKETING_VIEWER, CAMPAIGN_MANAGER, MARKETING_TASK_MANAGER, CONTENT_MANAGER, CONTENT_APPROVER, ASSET_MANAGER, EVENT_MANAGER, EVENT_PROCESSOR, MARKETING_CONFIGURATOR, COMPENSATION_ADMIN. Each includes `VIEW_MARKETING` plus its specialty. COMPENSATION_ADMIN also gets `VIEW_MARKETING_REPORTS`.

Administrator type is seeded with **all** User Roles. That is convenience; ADMIN already bypasses the catalog in `requireAccessRight`.

### Where ADMIN configures this

- `/settings/access` — which roles a type contains; which catalog rights a role grants.
- `/users` — User Type on a person; extra User Roles (“these add Access Rights on top of the User Type”).
- `GET /api/auth/me` returns `{ user, accessRights }` for **hiding buttons**. Hidden buttons are not security.

### Server enforcement

`requireAccessRight` in `server/utils/auth.ts`: load session, if coarse ADMIN return, else resolve rights from SQLite and 403. Marketing APIs use this. Campaign **writes** moved to `MANAGE_CAMPAIGNS`. `GET /api/campaigns` remains **CRM-readable** (`requireCrmAccessUser`) so Leads/New Lead campaign pickers still work for STAFF without Marketing.

CRM, Users, Security, intro schedule, catalog, Meta sync remain `requireCrm*` / `requireAdminUser`.

Nav: one **Marketing** rail item if ADMIN or `VIEW_MARKETING`. Middleware `app/middleware/marketing.ts` redirects others to `/dashboard`.

### Anti-lockout

ADMIN always has every Access Right in code. Last-ADMIN guards from M7 on deactivate/demote still apply. Do not put Scott’s only ADMIN on a Viewer type and then demote him — coarse role is what keeps the gym from locking the console.

### Hard-coded leftovers

- Coarse ADMIN/STAFF/VIEWER for CRM and Settings.
- ADMIN bypass for all Access Rights.
- `MANAGE_MARKETING_CONFIGURATION` is unused by any handler (configuration that exists is either ADMIN Settings or seed).
- Compensation rate is settings keys, not a User Role.

### Practical Renzo examples (not hard-coded)

These names are **examples**. The app does not special-case Scott, Pedro, or Marta.

- **Scott** as ADMIN: sees Marketing, Users, Settings, compensation ledger, Meta map. No extra roles required.
- **Pedro** as STAFF + EVENT_MANAGER + EVENT_PROCESSOR: can build open-house rosters and run the batch; cannot approve content or edit compensation unless those roles are added.
- **Marta** as STAFF + CONTENT_MANAGER + ASSET_MANAGER: can draft captions and upload photos; cannot process Event registrations; cannot approve if approval is required unless she also has CONTENT_APPROVER.
- A **front-desk STAFF** with no extra roles: Leads and Follow-up only. Direct `/marketing` URL bounces to Dashboard. APIs 403.

Best practice: keep Staff type empty of marketing roles; grant extras per person. Do not invent new Access Right strings in the UI — the catalog is code.

---

## 5. Marketing Campaign Workflow

### Terminology (say this out loud; people mix these up)

| Term | What it is in this app |
|---|---|
| **Marketing Campaign** | An internal initiative row (`campaigns`). “Kids Wrestling Open House push.” |
| **Meta Campaign** | Facebook/Instagram ads object stored after a read-only sync. Mapped by **id**, never by name. |
| **Meta Ad Set / Ad** | Children of a Meta Campaign in stored inventory. M9 does not create them. |
| **Content Item** | A planned post/caption record. May belong to a Marketing Campaign. |
| **Tracking Link** | A reusable URL on a Marketing Campaign (`?c=CODE` plus UTM). Destination `/trial` or `/events/kids-wrestling-open-house`. |

### Lifecycle (verified)

Statuses in code and UI: **Draft, Planned, Active, Completed, Cancelled** (`DRAFT|PLANNED|ACTIVE|COMPLETED|CANCELLED`). `active` boolean follows Active only, so old tracking resolve still works.

**Create** (`/marketing/campaigns`): name, Organic/Paid, status, planned budget USD (`$0` valid), owner, description. Server also accepts collaborators, program ids, planned/actual dates — **the create form does not expose those**.

**Edit** on each campaign card: status, owner, objective, offer, target audience, notes. Save. Tracking: copy default link; add extra labeled links with a destination path.

**Collaborators:** schema + API. **No collaborator picker in the Vue page.** Planned dates: same. Programs: displayed if present, not edited in UI.

**`$0` / organic:** valid. Planned budget is not Meta spend. Command center compares planned budget (internal) vs mapped Meta spend (Meta-reported) when a map exists.

**Meta mapping:** still ADMIN `/settings/meta`, explicit internal campaign ↔ Meta campaign id.

**Related work:** staff create Marketing Tasks / Content / Events and optionally attach a campaign id (Events create form currently does **not** ask for campaign; API can store `campaignId`).

**Reporting:** `/marketing` campaign outcomes table; `/reports` still acquisition reports.

### Example: Kids Wrestling promotional Campaign

1. Scott creates Organic campaign “Kids Wrestling Open House — Sept”, owner Scott, budget `$0`, status Draft → Planned → Active when the week starts.
2. He adds a tracking link with destination `/events/kids-wrestling-open-house` (after the Event slug exists).
3. He maps a Meta campaign on Settings → Meta **only if** they actually ran ads; organic Facebook posts do not need a map.
4. Content Items and photo Asset Requests hang off this campaign as Marketing Tasks.
5. Public registrations carry `c=` + UTM onto the **registration**, then onto **new** LeadHeaders at batch time.
6. When the push is done, status Completed. Later catalog price changes do not rewrite compensation already snapshotted at Join.

---

## 6. Organic Marketing vs Managed Marketing

**Designed operating model (still the intent, and the UI copy says so):**

Renzo people may post a Saturday gym photo on Instagram **without** opening this app. That is healthy. The app is the source of truth when work is **managed**: a campaign, an event, an approval, a tracking link, or a promised asset.

**Make it a Marketing Campaign when** more than one person must coordinate, money or Meta ads are involved, you need a tracking link, or you will run an Event/content calendar.

**Leave it a spontaneous post when** someone on the floor posts a story and there is no follow-up work to assign.

Scott can own Campaigns and Tracking Links while Marta publishes. **Owner** is campaign planning / default compensation credit (system uses campaign owner as credited user). **Publisher** is the Content Item’s `publisherUserId` — who is supposed to hit Post on Facebook. They can be different people. Collaborators were meant for shared planning; until the UI exists, treat owner + Marketing Tasks as the coordination tool.

Day-to-day: if Scott says “we’re pushing Kids Wrestling this month,” it is a Campaign. If Pedro stories a funny roll, it is not.

---

## 7. Marketing Task Workflow

**Not Lead Follow-up.** `/tasks` is still phone-call work after intros (and now Event follow-up calls). `/marketing/tasks` is creative/ops work. Tests assert zero coupling.

**Create:** title, type, due datetime, optional assignee, optional campaign. Schema also has content/asset/event FKs; **the queue form does not set them.**

**Statuses:** PENDING, COMPLETED, CANCELLED. Complete/cancel from the queue. Notes field exists on the row; there is no threaded history.

**Due buckets:** Overdue / Due today / Upcoming / All, Denver calendar.

**Types (labels in the UI):** Request assets, Draft caption, Prepare creative, Create tracking link, Review, Publish (manual), Review performance, Weekly summary, Other.

**Examples**

- “Request five kids-class photos” → type Request assets, assign Marta, due Friday.
- “Draft Instagram caption for Open House” → Draft caption, link campaign.
- “Review promotional offer copy” → Review.
- “Publish approved Open House graphic” → Publish (manual) — reminder to post, not an API post.
- “Review Campaign performance” → after the week, with Meta sync if ads ran.

**Best practice:** only tasks that block a Campaign or Event. Do not recreate Asana. If the queue is full of “think about branding,” it has failed.

---

## 8. Content Workflow

**Statuses in the database (verified):** Idea, Needs Assets, Draft, Needs Review, Approved, Ready to Publish, Published, Cancelled. **No Scheduled.**

**What the staff screen actually does:** create with title, caption, channels (Facebook / Instagram / Other), publisher, checkbox “Approval required.” Create lands in **Needs Review** if approval is required, else **Draft**. Buttons: Approve (if required and `APPROVE_CONTENT`), Ready to publish, Record publication + URL. There are **no** buttons for Idea / Needs Assets / Cancelled on that page, though PATCH can set status.

**Multi-channel:** one Content Item can have Facebook **and** Instagram. That is the intended “same caption, two placements” model. Make **separate** Content Items when the copy or creative truly differs (different offer, kids vs adults, different publisher).

**Approval:** per item `approvalRequired`. `APPROVE_CONTENT` required to stamp approver + time and to move to publish-ready if approval is on. There is **no** campaign-level approval switch.

**Publication:** `POST .../publications` writes channel, optional URL, optional external id, actor, timestamp. **Does not call Meta.** `externalPostId` is for a future publish integration so the row can store Graph ids later without a rewrite.

**Future path preserved?** Yes at schema level: publications table + external id + plannedPublishAt. M9 does not schedule or auto-post. Planned publish time is on the model; the create form does not collect it.

---

## 9. Asset Workflow

**Requests:** Marketing Task type “Request assets,” not a separate request object.

**Upload:** `/marketing/assets`, multipart, bytes under `data/uploads/`. Authenticated GET `/api/marketing/assets/:id/file` with `VIEW_MARKETING`. No public CDN.

**Statuses (verified):** Unknown, Approved, Restricted, Do Not Use. Restricted requires a note (UI sends a fallback sentence if the note is empty — **review this**; gym should write a real reason). Do Not Use **blocks** recording publication if the asset is attached. Restricted **warns** in `assertAssetsAllowPublication`.

**Minors:** label kids photos Restricted or Do Not Use unless the gym has already decided they can be used. The app **does not** store parent legal consent. The upload notice in the UI says so.

**Archive vs delete:** if `asset_usages` exist, delete is refused; archive instead. Unused may delete.

**Best practice:** Unknown means “not reviewed.” Don’t publish Unknown kids content. Approved means “gym is okay using this in marketing,” not “a lawyer signed a form.”

---

## 10. Acquisition Events

### Terminology

| Term | Meaning |
|---|---|
| **Acquisition Event** | A gym happening we promote (open house). Not a Meta event. Not a Trial. |
| **Event Session** | One time/capacity/age/program slice (“Saturday 10am Ninjas”). |
| **Event Registration** | One household contact’s signup packet. |
| **Registration line / participant** | One person in that packet, tied to one session. |
| **Event attendance** | REGISTERED / ATTENDED / NO_SHOW / CANCELLED on the **line**. |
| **Lead / LeadHeader** | Household we contact, created **only after batch**. |
| **Trial** | A scheduled intro class attempt. Event attendance is **never** written as Trial attendance. |

Events are not Trials because an open house is a marketing/acquisition happening with roster semantics. Intro class bookkeeping stays on `trials` after someone actually books an intro.

### Implemented behavior

Create at `/marketing/events` (title, description, optional Program). Starts **Draft**. Detail: add sessions (name, start, optional capacity/ages), questions, **Publish** (status PUBLISHED), complete, **Close/reopen registration** (manual flag). Public page only works while **Published**.

**Windows:** schema/API support opensAt/closesAt. **Staff UI does not edit those timestamps** — only the manual close toggle. Server still rejects public signup outside the window if timestamps were set via API.

**Capacity:** per session; remaining shown on public form. Full session rejected. No waitlist.

**Public `/events/:slug`:** no login. Household contact (phone required like other public flows; honeypot `company`). Multiple participants; **each picks a session**. Custom questions. Attribution from query `c`, `source`, UTM, stored in the same `sessionStorage` key as `/trial` (`renzo-trial-attribution`). Confirmation is on-page text, not email.

**Staff registration:** one participant per submit (walk-in/phone/referral). Can edit attendance and exclude-from-processing on the roster. History rows on registration.

**Tracking:** public registration copies campaign/link/UTM onto the registration. Staff can set source without a link.

**Communications:** intent row only. Scott should not tell parents “you’ll get a text” unless they later add send.

### Example: Kids Wrestling Open House

Two sessions: Saturday 10:00 (ages 4–7, cap 20) and 11:30 (ages 8–12). Parent Jamie registers two children, one in each session, from a Tracking Link. Roster shows Jamie + two lines REGISTERED. After the day, staff mark ATTENDED / NO_SHOW. Batch later. No Lead exists until that batch.

---

## 11. Event Roster and Batch Lead Processing

**Binding rule (implemented):** signup creates Event rows only.

Intended sequence vs actual:

1. Registration occurs — **yes**.
2. Roster — **yes** (`/marketing/events/:id`).
3. Staff mark attendance / no-show / cancelled — **yes** per line.
4. Authorized staff (`PROCESS_EVENT_REGISTRATIONS`, ADMIN always) opens batch — **yes**, “Preview processing.”
5. Preview — **yes**. Shows counts: included, new households, existing matches, ambiguous, excluded, follow-up calls to create. Ambiguous rows: dropdown of matching households.
6. Existing households via `findMatchingContactLeads` (phone/email) — **yes**.
7. Ambiguous (2+ headers) requires choosing a household; execute **throws** without a confirmation that is one of the matches — **yes**. Never silent merge.
8. Exclude: `excludeFromProcessing` on the registration (UI). API also has `excludeRegistrationIds` and `includeCancelledRegistrationIds`. **UI does not send include-cancelled**; cancelled lines stay out unless staff later uses the API.
9. Execute is one transaction; confirm dialog warns: creates/matches households, one Event follow-up per household, **does not create Trials**, rerun is safe.
10–11. New headers with skip-default-line then lines; existing headers get new lines if names don’t match, or reuse line; **does not overwrite** existing header campaign. Compensation `maybeEstablish` only when **creating a new line**.
12. `ensureEventFollowUpTask` — one `EVENT_FOLLOW_UP` per household+event (unique index).
13. Registration keeps `lead_id` / line `lead_line_id`.

**Idempotency:** already-linked lines skip create; second run is ALREADY_PROCESSED / no extra Follow-up.

**Preview UI gap:** ambiguous copy says “registration {{id}}” and options include `({{ match.id }})`. Spec asked not to use raw ids as the primary explanation. **Review in acceptance** — names are there, ids are still shown.

**Default include:** ATTENDED + NO_SHOW. REGISTERED-only households with no attended/no-show line are not in the default batch. Staff must mark the roster first.

---

## 12. Event-to-Acquisition Lifecycle

```text
Marketing Campaign
  → Tracking Link
  → Event Registration (roster only)
  → Attendance on the day
  → Batch → LeadHeader + LeadLines + household EVENT_FOLLOW_UP
  → Staff call
  → optional Trial on a person
  → Trial attendance
  → more Trials if needed
  → Join or Lost per LeadLine
```

Event history stays on registration tables. Trials are separate. Follow-up is household-level. Join/Lost is per person.

A person **can join without a fake Trial**. Conversion is still the Join path from Lead detail. Event attendance is not auto-converted to Trial ATTENDED.

**After an Event:** mark roster → preview → fix ambiguous → process → work `/tasks` Event follow-up → schedule intros for people who want a class → convert per person. Write notes; don’t pretend the open house was an intro.

---

## 13. Attribution

Four different ideas. Mixing them is how Scott loses credit or Pedro “steals” a campaign in the data.

### Acquisition Attribution

**Where it lives:** LeadHeader `campaignId`, `campaignTrackingLinkId`, UTM, `source`. Set at household create (public `/trial`, staff New Lead, **new** Event-batch households). **Existing** households keep the original campaign; Event processing stores `preservedCampaignId` in history and does not overwrite.

### Lifecycle History

Trials, notes, Event registrations, status history. Additive.

### Operational Ownership

Follow-up `assignedUserId`, whoever is working the lead this week. Completing a call does not change Lead status and does not change compensation.

### Compensation Attribution

Per LeadLine, who gets paid if they Join. Separate table.

**Unknown / walk-in:** source WALK_IN/PHONE, no campaign → compensation stays UNASSIGNED until someone with `MANAGE_COMPENSATION_ATTRIBUTION` assigns with a reason (API). **No Lead-detail form for that yet.**

**Examples**

- Tracking link to `/trial`: header + compensation system-established (method TRACKING_LINK, credited = campaign owner if set).
- Same phone books an Event later as an **existing** household: Event history on the registration; header campaign unchanged; compensation on **new** kids lines can establish from the Event; lines that already existed are not re-attributed.
- Pedro completes Follow-up on Scott’s campaign lead: Pedro is operational owner of the task; Scott remains compensation credited user if he was owner at establish.

Later Trials do not rewrite header campaign. That was already M8 first-touch.

---

## 14. Compensation Attribution and Compensation Ledger

**Per LeadLine**, unique row. Auto `maybeEstablishSystemCompensation` when a **new** line is created from public trial with campaign/link evidence, or from Event batch **new** lines with campaign/link/event evidence. Credited user = **campaign owner**. If no owner, eligibility UNASSIGNED even if campaign is known. Method EVENT if `eventId` present, else TRACKING_LINK, else CAMPAIGN. Origin SYSTEM. If a row already exists, later evidence is ignored (no overwrite).

**Manual:** `POST /api/marketing/compensation/:leadLineId` with credited user, eligibility optional, **reason min 3 chars**. Origin MANUAL. History appended. If the person already Joined with an active conversion, the handler also tries `snapshotCompensationEarned`.

**UI:** `/marketing/compensation` lists **earned snapshots** (Joined) and Mark paid. **There is no staff UI to assign/correct attribution on a Lead.** That is a gap vs the spec’s “ADMIN correction in the product.” API exists for acceptance via HTTP or a later screen.

**Snapshot at Join:** inside `convertLeadLine` transaction. Only if attribution is ELIGIBLE **and** has `creditedUserId`. Amount = monthly cents × bps / 10000, integer. Basis and bps copied onto the earned row. Later offering or 50%→40% setting changes do not rewrite it. Unique on conversion id.

**Paid:** UNPAID default; Mark paid sets paidAt + actor. Not QuickBooks.

**Household with two kids:** two LeadLines → two attribution rows → two possible earned rows if both Join. One Follow-up call.

**Existing Lead in a Scott Event:** prior compensation on old lines stays. New children processed from the Event can get Event/campaign credit. Header acquisition origin stays whatever it was.

**Scott vs Pedro:** Follow-up assignee is irrelevant to the ledger. Campaign **owner** at establish time is the automatic credit. If Scott forgets to set owner, credit stays unassigned until a reasoned correction.

**Not:** invoicing, AR/AP, payroll, tax, or Dashboard widgets. Seed 50% is Renzo configuration, not “Scott the user is hardcoded.”

---

## 15. Marketing Dashboard

Route `/marketing`. Copy: **not** the acquisition Dashboard.

**Actually shown**

- Counts: overdue Marketing Tasks, due today, asset-request tasks; content needing review / assets / ready; active campaigns; approaching start/end within 14 Denver days; upcoming events with registration **row** counts and participant counts (labeled as CRM event rows, not unique people).
- Links into each Marketing area including Compensation.
- **Campaign outcomes table** for **Active** campaigns: planned budget (internal), Meta spend if mapped (Meta-reported) or “Not mapped,” attributed people and joined (deterministically attributed from header `campaignId`, unique LeadLines), event registration count (internal CRM).

**Not on this hub:** compensation totals unpaid/paid as a KPI tile; Meta CTR/CPC tables (those live in Meta reports if synced); the compact acquisition Dashboard cards (households this month, etc.).

Funnel people unique-by-LeadLine. Event counts are registration packets, labeled.

---

## 16. Meta Integration

M9 did **not** add write APIs. Meta V1 remains:

- Read-only Graph **v25.0**, permission `ads_read`.
- ADMIN `/settings/meta` manual sync.
- Store account → campaigns → ad sets → ads.
- Daily metrics: spend (cents), impressions, reach, clicks, ctr/cpc/cpm text, Meta-reported leadsCount.
- Map Marketing Campaign ↔ Meta Campaign by **id**.

**Still not implemented:** create/edit ads, budgets, automated publish, CAPI, Lead Ads ingest, Messenger, scheduled sync, name matching.

Command center spend is **sum of stored daily metrics** for mapped Meta campaign external ids. If credentials are empty, the gym app still runs; spend shows 0 / not mapped.

Internal Joined/MRR on the hub is **not** Meta’s lead counter. Labels exist so Scott doesn’t compare apples to oranges on a commute conversation.

---

## 17. Public Signup Experience

**Intro:** `/trial` unchanged in role. Tracking `?c=` still first-touch on a **new** household. Phone required. Household builder. Possible-duplicate warning is internal only.

**Event:** `/events/:slug` public allowlisted like `/trial`. Only Published events. Contact + N participants + session each + questions. Same attribution sessionStorage so a person who clicks an Event link then later hits Trial in the same browser can still carry UTM (and vice versa) — **same key**, so the last click in that browser wins. Worth Scott knowing.

**Duplicates:** Event public signup does **not** create Leads, so it does not merge or warn like `/trial`. Matching happens at **batch**. Two parents sharing a phone will become AMBIGUOUS then.

**Mobile:** public event form is the intended mobile path; not Playwright-tested. Capacity remaining is shown.

**Validation:** public phone required; honeypot; windows and capacity on the server.

---

## 18. Day-to-Day Renzo Operating Procedure

Conversational script for the commute.

### Normal day

Pedro opens **Follow-up** (`/tasks`) and works overdue intro calls. That queue is parents who booked a class. It may also show **Event follow-up** after an open house batch — still a phone call to the household, not “make a graphic.”

If Pedro has Marketing rights, he also glances at **Marketing**. Overdue asset requests and content needing review live there. He does not dump those onto Follow-up.

Marta, if she has content/asset rights, uploads photos, sets Restricted on kids faces she’s unsure about, drafts Content, does not press Ready to publish until assets are Approved.

Scott, as ADMIN, unblocks Access Rights if Marta’s buttons are missing, maps Meta if ads ran, and ignores compensation until someone actually Joins.

### Starting a Campaign

Name it for humans (“Kids Wrestling Open House Sept 2026”), Organic or Paid, owner Scott if he should earn credit, `$0` if no ad budget. Save. Copy the Tracking Link. If the destination is an Event, create the Event first so the path `/events/that-slug` exists. Put the link in ads or the bio. Spontaneous posts still allowed without a Campaign.

### Running an Event

Draft Event → sessions with honest capacity → optional questions (“How did you hear about us?” is already source/UTM; don’t duplicate unless you need a wrestling-experience yes/no) → Publish → share Tracking Link → registration lands on the roster **without** filling Leads → day-of attendance → Preview processing (fix ambiguous phones) → Process → call the Event follow-up task → schedule Trials for people who want a class → Join per kid.

### Ending a Campaign

Mark Campaign Completed so it leaves the Active list. Review Marketing hub: planned vs Meta spend if mapped; attributed Joins. Don’t “fix” old Lead campaigns to make the chart prettier — that’s rewriting acquisition origin.

---

## 19. Best Practices

| Topic | Enforced by software | Human practice |
|---|---|---|
| Campaign naming | Unique slug from name | Include program + month. Don’t name it after a Meta campaign id. |
| Ownership | Optional FK | Set owner **before** traffic if Scott should auto-receive compensation. |
| Tracking Links | Destination must start with `/` | One link per distinct landing (trial vs this event). Don’t reuse one link for Facebook and Instagram and then argue about channel. |
| Attribution | First-touch on new headers; Event batch won’t overwrite existing | Don’t create a new household in staff New Lead just to “tag” a campaign when they’re already in the CRM — use Event batch match. |
| Duplicate Leads | No silent merge | At Event preview, pick the real household. Don’t process ambiguous blindly. |
| Event processing | Default ATTENDED+NO_SHOW | Mark the roster the same day. Don’t batch REGISTERED-only rows. |
| Follow-up | One EVENT_FOLLOW_UP per household+event | Call the parent once, not once per kid. |
| Content | Approval gate if flagged | Don’t require approval on every meme; do require it on paid offers and kids imagery. |
| Assets | DO_NOT_USE blocks publish record | Restricted + a real note for minors. This is not a waiver file. |
| Access Rights | ADMIN bypass; STAFF empty | Extra roles on people, not “make Marta ADMIN.” |
| Compensation | Snapshot at Join; history on corrections | Use the API/later UI with a reason. Don’t expect Follow-up assignment to pay anyone. |
| Campaign completion | Status field | Complete it so the command center stays about **now**. |
| Reporting | Labels on sources | Never present Meta leadsCount as gym Joins. |
| Data hygiene | Don’t commit sqlite or uploads | Local `data/renzo.sqlite` is gym data. |

---

## 20. Human Acceptance Testing Guide

Do these in a browser as Scott. Automated tests already cover many rules; they do not prove the screens.

For each: **Setup / Action / Expected**.

### Access Rights

1. **Configure a type** — Setup: ADMIN `/settings/access`. Action: add CAMPAIGN_MANAGER to Staff type (or don’t — recommended leave Staff empty). Expected: save notice; Staff type roles persist after refresh.  
2. **Assign extras** — Setup: a STAFF user. Action: `/users` extra role EVENT_PROCESSOR. Expected: that user `accessRights` includes PROCESS_EVENT_REGISTRATIONS and VIEW_MARKETING.  
3. **Denial** — Setup: STAFF with no extras. Action: open `/marketing`. Expected: Dashboard redirect; API 403.  
4. **VIEWER** — Action: `/leads`, `/marketing`. Expected: blocked.  
5. **ADMIN lockout** — Action: strip Administrator type roles. Expected: Scott still uses Marketing (code bypass).

### Campaigns

6. **Organic $0** — Create Organic, budget 0, Draft. Expected: saved; default tracking link to `/trial`.  
7. **Owner** — Set owner to Scott. Expected: persists.  
8. **Collaborators** — Try to add Pedro as collaborator **in the UI**. Expected: **no picker** (API-only). Record as UX gap.  
9. **Extra tracking to Event** — Destination `/events/your-slug`. Expected: copied URL starts with that path and `c=`.  
10. **Statuses** — Walk Draft → Planned → Active → Completed. Expected: Active appears on Marketing hub; Completed drops off Active list.  
11. **Meta map** — If tokens exist, map/unmap. Expected: hub shows spend or “Not mapped.”

### Tasks / Content / Assets

12. **Task vs Follow-up** — Create Marketing Task; open `/tasks`. Expected: not listed on Lead Follow-up.  
13. **Content no approval** — Uncheck approval, Ready to publish, record URL. Expected: publication history; no Meta post.  
14. **Content approval** — Check approval; STAFF with MANAGE_CONTENT but not APPROVE_CONTENT. Expected: cannot Approve; Ready to publish fails until ADMIN/approver.  
15. **Multi-channel** — Facebook+Instagram on one item. Expected: both stored.  
16. **Upload asset** — Expected: listed; file GET works logged in.  
17. **Restricted / Do Not Use** — Attach Do Not Use and record publication. Expected: blocked. Restricted warns.

### Events

18. **Two sessions** — Create, add two sessions with capacities. Publish.  
19. **Public multi-child** — Parent, two kids, different sessions. Expected: roster two lines, **no new Lead** yet.  
20. **Deadline** — Close registration. Expected: public form rejects. Reopen. (Timestamp windows: not in UI.)  
21. **Staff walk-in** — Add registration from roster form.  
22. **Question** — Add yes/no; public must answer if required.  
23. **Attendance** — ATTENDED / NO_SHOW / CANCELLED.  
24. **Preview** — Expected: counts; cancelled excluded; REGISTERED-only excluded until marked.  
25. **Match existing** — Use a phone already on a Lead. Expected: MATCH, not a second household.  
26. **Ambiguous** — Two headers same phone. Expected: must choose; process fails without choice.  
27. **Execute** — Expected: Lead(s), one EVENT_FOLLOW_UP, registration linked.  
28. **Rerun** — Expected: no extra Leads/tasks.  
29. **Existing campaign preserved** — Header that already had a campaign keeps it.

### Compensation / hub / M8

30. **Auto credit** — Trial via tracking link, campaign owner set, Join. Expected: earned row, 50% of monthly cents unless settings changed.  
31. **Walk-in Join** — Expected: no earned row until assignment API (no Lead UI).  
32. **Mark paid** — Expected: PAID + date.  
33. **Change Follow-up assignee** — Expected: ledger owner unchanged.  
34. **Marketing hub** — Labels visible; not a clone of `/dashboard`.  
35. **M8 regression** — `/trial` household book, reschedule Trial, Follow-up buckets, convert, reverse, reports, VIEWER 403 CRM.

---

## 21. Automated Test / Build Results

Run **2026-09-03** on this machine against HEAD `b398b8c` (working tree: local sqlite only).

| Command | Result |
|---|---|
| `pnpm test` | **54 files, 250 passed**, ~176s |
| `pnpm lint` | **passed** (exit 0). ESLint may print a Node CJS/ESM experimental warning; that is pre-existing. |
| `pnpm typecheck` | **passed** (`nuxt typecheck`, exit 0) |
| `pnpm build` | **passed** (“Build complete!”) |

M9-focused files: `tests/m9/access-rights.test.ts`, `access-rights-http.test.ts`, `campaigns.test.ts`, `marketing-tasks.test.ts`, `content.test.ts`, `assets.test.ts`, `events.test.ts`, `events-http.test.ts`, `compensation.test.ts`, `overview.test.ts`.

**Migrations:** previously verified in the implementation close: clean SQLite `pnpm db:setup` and current `data/renzo.sqlite` both applied `0000`–`0019` and seeded types + compensation 50%. Not re-run as a destructive reset for this document.

**Not run:** Playwright / browser suite (none exists).

---

## 22. Known Limitations / Deferred Work

- Direct Facebook/Instagram publishing, scheduled auto-publish, Meta write operations.
- SMS/email/WhatsApp send (intents only).
- Event waitlists, ticketing, payments.
- Configurable workflow engines / Gantt.
- General-purpose event product (this is acquisition open-house shaped).
- Legal consent management / DAM / CDN.
- Accounting, invoicing, payment processing.
- PostgreSQL (M10 in current milestone list), Docker migrate/seed, Pi deploy.
- Multi-tenant / second customer provisioning. One canonical codebase; Renzo is first customer via **configuration** (compensation bps, programs), not `if (customer === 'renzo')`.
- Household `INITIAL_SCHEDULE` DB unique index — **not** added; still application consolidation.
- **UI thinner than API** (acceptance-critical): campaign collaborators, campaign program picker, campaign planned dates, event open/close timestamps, event↔campaign on create form, Marketing Task FKs to content/asset/event, include-cancelled batch, compensation **assignment** on Lead detail, `MANAGE_MARKETING_CONFIGURATION` unused, Content status buttons incomplete vs full enum, ambiguous preview still shows raw ids.
- Gitignore sqlite currently commented; don’t commit `data/renzo.sqlite` or `data/uploads/*`.
- No browser QA in the build session.

---

## 23. Recommended Next Steps

**Immediate (Scott, this week):** human acceptance checklist in §20. Use ADMIN, one STAFF with no rights, one STAFF with Event roles. Run a fake Open House on localhost:5000.

**Corrections on `M9` (before merge):** anything Scott hits that is a true bug (403 wrong, double Leads, overwritten campaign, compensation snapshot wrong). UX gaps in §22 can be M9.X on this branch if Scott wants them before merge, or a follow-up.

**Do not merge** `M9` into `master` until Scott says so.

**After acceptance:** merge when asked; then operational pilot (real Event, real Tracking Link, real Access Rights for Marta/Pedro). Keep Meta read-only until ads_read on the gym account is confirmed.

**Wait for later milestones:** PostgreSQL, production host, messaging send, Meta publish, waitlists, accounting.

---

## 24. Voice Discussion Brief

Use this section as the commute script. Scott is driving. Do not ask him to read schema.

### What M9 built, in one breath

The gym app still runs intros and phone follow-up. M9 adds a Marketing wing: who is allowed to do marketing work, campaigns with tracking links, a task list for creative work, content and photo files with “can we use this in ads” labels, open-house events that don’t become Leads until you process the roster, and a simple commission ledger when someone Joins — fifty percent of the monthly amount unless you change the setting, credited to the campaign owner, not whoever happened to complete the call.

### Workflows worth talking through

1. Spontaneous Instagram vs a real Campaign.  
2. Open house: roster first, Leads later.  
3. One call per household after an event.  
4. Scott’s credit vs Pedro working the lead.  
5. Meta numbers vs gym Joins — the hub labels them on purpose.

### Architectural decisions to pressure-test

- ADMIN always has every Marketing right even if the assignment screens are wrong. That’s safety; it also means “take away Scott’s marketing” doesn’t work unless you demote him.  
- STAFF get **no** marketing until you assign roles. Front desk won’t wander into Events by accident.  
- Campaigns were extended, not cloned. Organic `$0` is a first-class campaign.  
- Compensation is LeadLine-level and frozen at Join.  
- Event attendance is not a Trial.  
- Same browser `sessionStorage` key for Trial and Event attribution — last click wins.

### What Scott should critically evaluate

- Can Marta actually do her job with the **buttons on the page**, not the API? Collaborators, event dates, compensation assignment on a lead — those are missing from screens.  
- Is 50% still the deal? It’s a setting, default 5000 basis points.  
- Restricted vs Do Not Use on kids photos — does the gym understand this isn’t a waiver archive?  
- Event preview still shows database ids next to names.  
- Closing registration is a toggle; calendar open/close windows are hiding in the API.

### Friction he may feel

- Two task lists: Follow-up vs Marketing Tasks. Easy to look in the wrong place.  
- Processing an Event before marking attendance does almost nothing useful (REGISTERED isn’t in the default batch).  
- If he forgets campaign owner, Joins won’t mint ledger rows.  
- STAFF will say “I can’t open Marketing” — that’s by design until roles are assigned.

### Hands-on testing that matters more than unit tests

A fake two-session kids event, two children, a phone that already exists on two households (ambiguous), rerun batch, then Join one child and look at the ledger. Plus a STAFF user with zero extra roles hitting `/marketing`.

### Questions to ask Scott after he’s clicked around

- Who at Renzo should have Event processing vs only content?  
- Do you want collaborator and compensation-assignment screens before merge, or is API+ADMIN enough for a pilot?  
- Will open houses always batch ATTENDED and NO_SHOW the next morning?  
- Are you comfortable keeping spontaneous posts out of the app?  
- When you look at Marketing vs Dashboard, is the labeling enough to avoid arguing with Meta’s lead count?  
- Any Campaign you would never put in this system?

### Spec vs Cursor — say this honestly if asked

The spec was largely implemented **in services and tables**. The **staff UI is a first operational slice**, not a full form for every column. Cursor did not invent a unique Follow-up index, did not send SMS, did not publish to Meta, did not put commission on the acquisition Dashboard, and did not auto-grant STAFF marketing. It did seed 50% as configuration rather than hard-coding Scott. Campaign-level content approval is per Content Item, not a campaign flag. `MANAGE_MARKETING_CONFIGURATION` is a dormant right. Compensation correction is enforced on the server and missing on Lead detail. Those are the main “planned vs what you’ll see in the car after you park and open the laptop” differences.

If something feels like a bug (double household, lost tracking, VIEWER seeing Leads), that’s an `M9` branch fix. If it feels like “I wish this field were on the page,” decide whether it blocks acceptance or waits.

---

*End of operational handoff. Do not merge `M9` from this document.*
