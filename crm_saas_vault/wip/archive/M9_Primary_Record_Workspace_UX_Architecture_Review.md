---
type: note
status: current
area: process
updated: 2026-09-03
tags:
  - m9
  - ux
  - architecture
---

# M9 Primary Record Workspace — architecture review

**Date:** 2026-09-03  
**Branch inspected:** `M9` (HEAD includes `c99c2d2` UI/UIX update; tracks `origin/M9`)  
**Request:** [[wip/M9_Primary_Record_Workspace_UX_Architecture_Cursor_Review_Request_2026-09-03]]  
**Scope:** Review only. No application code, schema, or migrations were changed.

This document compares the proposed Primary Record Workspace pattern with the actual Nuxt 4 / SQLite implementation. Code is authoritative. Vault notes were used for documented rules.

---

## A. Executive recommendation

**Yes — adopt the Primary Record Workspace pattern now, on the existing `M9` branch, as a UI/route normalization.** The Campaign page is the proof that the current “one stacked page = create + list + edit + children” model does not scale. Content repeats the same pattern. Event detail and Lead detail already have stable record URLs but are still vertically stacked operational documents.

Agree with the request on:

- Normalize across the app, not Campaigns-only.
- Keep global queues/libraries/reports. Do not invent duplicate tables for contextual vs global views.
- Prefer stable record URLs.
- Do not invent `CampaignLine` rows.
- Keep `LeadHeader` / `LeadLine` / Trial / FollowUpTask / Marketing Task / internal Campaign vs Meta Campaign as they are.
- This should not require a database redesign.

Disagree with, or narrow, these parts of the proposal:

1. **Do not replace compact indexes with selector-only workspaces.** Acumatica often *is* the workspace plus a selector. For this gym, a scannable index plus a workspace is better. `/marketing` is already the command center. Staff still need to compare several Campaigns (status, budget, approaching dates) without opening one. The Campaign failure is that each *card* is a full editor, not that a list exists. Same for Events, Content, and Leads — those indexes should stay, and become compact.

2. **Do not give every “possible” entity the full tabbed workspace in this pass.** Full workspace now: **Household Lead**, **Marketing Campaign**, **Acquisition Event**. **Content Item** deserves a dedicated detail route, not a five-tab workspace yet. **User**, **Program**, and **Membership Offering** should stay lighter admin editors. Building a reusable shell and then forcing Users/Catalog into it will make a five-person gym feel like unfinished ERP.

3. **Lead tabs must not hide prospective members.** M8 already spent a correction pass making `/leads/:id` a household document whose first work is the people cards (`vault/CRM.md`). A “Members” tab is fine if it is the default. A model where Overview is planning copy and people live two clicks away would undo that correction.

4. **Trials are person-level.** A household Trials tab can summarize intros. Recording attend / no-show / reschedule / convert / lost must stay on the LeadLine. Do not create a second Trial editor at household level.

5. **Campaign → Content / Tasks / Assets / Events tabs are new UI, not a rearrangement.** The current Campaign page does not show those children at all. `listManagedCampaigns` only nests tracking links, owner, collaborators, programs, and attributed households. The related FKs already exist on the child tables. The overhaul should expose them contextually; it should not pretend they are already there.

6. **No schema changes are justified for this UX.** Push back on any design that needs new header/line tables, a Campaign snapshot table, or a parallel Meta Campaign workspace. Optional API work is real (GET-by-id, list filters, slimmer index payloads) and is not a schema change.

The mental model to lock:

```text
Compact index / queue / library / report
        ↓ open one record
PRIMARY BUSINESS RECORD WORKSPACE
        ↓ identify, search, previous/next
Stable header (identity + state + frequent actions)
        ↓
Tabs for related records in that record’s context
        ↓
Global queues when the job crosses many primary records
```

Learn it once: Leads, Campaigns, Events (and later Content detail) should feel like the same kind of screen.

---

## B. Actual primary-record inventory

Classification uses the request’s language: **primary** = central working context; **attached** = belongs to a primary; **work** = queue item; **reference** = catalog/config/external.

| Entity | Current route(s) | Classification | Recommendation | Rationale |
|---|---|---|---|---|
| LeadHeader (`leads`) | `/leads` list + pipeline; `/leads/new`; `/leads/:id` | **Primary** (true header/line aggregate) | Full workspace. Keep list + `/leads/new`. Tab the detail conservatively. | Already the operational aggregate. Stable URL exists. Page is ~2,200 lines of stacked panels. |
| LeadLine | No own route; expanded on `/leads/:id` | **Attached** | Stay subordinate. Optional deep link `/leads/:id?line=:lineId` (or later `/leads/:id/members/:lineId`). No top-level module. | Substantial lifecycle, but it is not a household. Opening a person should not leave the household. |
| Trial | No own route | **Attached** to LeadLine (also header FK) | Not a module. Actions stay on the person card/detail. | History rows; reschedule cancels + creates. |
| FollowUpTask | `/tasks` queue; also on `/leads/:id` | **Work** | Keep global queue. Contextual list on the household. | Household-spanning call work. `EVENT_FOLLOW_UP` still belongs here, not Marketing Tasks. |
| Campaign | `/marketing/campaigns` list+create+edit cards; hash `#campaign-:id`; `/settings/campaigns` redirect | **Primary** (heterogeneous aggregate) | Full workspace at `/marketing/campaigns/:id`. Compact index remains. | Clearest current failure. Hash is not a stable record URL. Children exist in schema but are not shown. |
| CampaignTrackingLink | Nested on Campaign cards | **Attached** | Campaign tab + header “Copy default link”. | Campaign-native. Copy is frequent. |
| CampaignCollaborator / CampaignProgram | Nested checkboxes on Campaign cards | **Attached** (M2M) | Overview fields, not tabs. | Too sparse for tabs. |
| MarketingTask | `/marketing/tasks` queue | **Work** | Keep global queue. Contextual table on Campaign (and later Content/Event). | Optional FKs to campaign, content, asset, event. Due buckets are the global job. |
| ContentItem | `/marketing/content` list+create+edit cards | **Attached** to Campaign; **complex child** | Keep global queue. Add `/marketing/content/:id` focused detail (sections, not five tabs). Link out from Campaign. | Linear workflow (idea → assets → review → publish). Volume is small. Full prev/next workspace can wait. |
| ContentItemChannel / ContentPublication | Nested on Content cards | **Attached** | On Content detail. | |
| Asset | `/marketing/assets` library | **Library / attached** | Stay a library. Contextual list on Campaign/Content. Do not promote. | File + marketing-use. `eventId` column exists and is unused in UI. |
| AssetUsage | No own UI | **Attached** | Keep as attach machinery. | Second relationship path besides `assets.campaignId`. |
| AcquisitionEvent | `/marketing/events` list+create; `/marketing/events/:id`; public `/events/:slug` | **Primary** | Full workspace using the existing detail route. Compact index remains. | Closest existing workspace. Still one stacked page of details, add-session, questions, roster, process. |
| AcquisitionEventSession | Nested on Event detail | **Attached** | Sessions tab. | |
| AcquisitionEventRegistration + Lines | Nested on Event detail | **Attached** | Roster tab (attendance is a line field). | Not a top-level module. |
| AcquisitionEventQuestion / Answer | Nested on Event detail | **Attached** | Overview (form config), answers on roster. | |
| AcquisitionEventRegistrationHistory | Returned by GET; weak UI | **Attached** | Roster/history disclosure. | |
| AcquisitionEventCommunicationIntent | Written on process; **no staff UI** | **Attached / deferred** | Do not add a Communications tab until send exists. | Intents only; no SMS/email. |
| Conversion / Lost outcome | On LeadLine detail | **Attached outcome** | Stay on the person. | Not workspaces. |
| CompensationAttribution + history + CompensationEarned | On expanded LeadLine; ledger `/marketing/compensation` | **Attached** + **report** | Lead Attribution tab + keep ledger. | Per-line, not household-primary. Ledger is cross-record. |
| Program | `/settings/catalog` stacked with other catalogs | **Reference** | Stay in Catalog. Optional in-page section nav only. | Few rows. Not an operational aggregate. Intro classes live on `/settings/intro-availability`, not on Program. |
| MembershipOffering / HouseholdPricingRule / LeadSource / LostReason | `/settings/catalog` | **Reference** | Lighter editors on Catalog. | |
| User | `/users` list + create/edit/role/access panels | **Admin record** | Keep list + panels. No tabbed workspace this pass. | Handful of staff. Security is already global. |
| UserType / UserRole / AccessRight | `/settings/access`; extra roles on `/users` | **Reference / config** | Stay Settings. | |
| SecurityEvent | `/security` | **Audit log** | Stay global. Optional `?targetUserId=` later. | |
| MetaCampaign / maps / metrics | `/settings/meta`; numbers on `/marketing` overview | **External reference** | Read-only on Campaign Performance. Mapping writes stay Settings. | Never a parallel primary Marketing Campaign. |
| IntroAvailabilityRule / IntroException | `/settings/intro-availability` | **Config** | Not a primary record. | |
| Reports / Dashboard / Marketing overview | `/reports`, `/dashboard`, `/marketing` | **Cross-record** | Remain. | |
| Public booking / event signup | `/trial`, `/events/:slug` | **Public capture** | Out of staff workspace scope. | |

**Missing from the request’s list?** Nothing operational. Compensation ledger, Marketing command center, Follow-up queue, Reports, Catalog, Intro schedule, Meta Settings, and Security are correctly *not* primary workspaces.

**Over-classified in the request:** User, Program, Membership Offering, and a five-tab Content workspace. Those are not aggregates at the same level as Household / Campaign / Event.

**Domain aggregate vs UI parent:**

| Aggregate in the domain | Convenient UI parent only |
|---|---|
| LeadHeader → lines, trials, follow-up, notes, history | Campaign as a place to *view* attributed households (first-touch FK on the header; households are not Campaign children) |
| Campaign → tracking links, collaborators, programs | Campaign as a place to *view* Meta spend (mapped external rows) |
| AcquisitionEvent → sessions, questions, registrations | Event as a place to *view* resulting Leads after batch (Leads remain LeadHeaders) |
| ContentItem → channels, publications | Content as a place to *view* attached assets (assets also live in the library) |

Do not make attributed households, Meta campaigns, or processed Leads look like owned child records that can be created from the parent the way a tracking link can.

---

## C. Actual relationship map

### Household Lead (LeadHeader)

```text
LeadHeader (leads)
├── one-to-many LeadLine
│     ├── one-to-many Trial (lead_line_id; lead_id also set)
│     ├── one-to-many LeadLineStatusHistory
│     ├── one-to-one active Conversion (partial unique where reversed_at is null)
│     ├── one-to-many LeadLineLostOutcome
│     ├── one-to-one CompensationAttribution
│     │     └── one-to-many CompensationAttributionHistory
│     └── one-to-many CompensationEarned (JOINED snapshot)
├── one-to-many Trial (header FK; same rows as line trials)
├── one-to-many FollowUpTask
│     └── optional FollowUpTaskLine → LeadLine
├── one-to-many LeadNote
├── one-to-many LeadStatusHistory
├── one-to-many LeadPossibleDuplicate (warning only)
├── optional many-to-one Campaign (first-touch acquisition)
├── optional many-to-one CampaignTrackingLink
├── UTM fields on the header
├── optional many-to-one Program (compatibility column; people have their own programId)
└── PublicBookingSubmission (idempotency → this header)
```

Event batch may set `acquisition_event_registrations.lead_id` and registration-line `lead_line_id` after process. That is a reverse pointer, not household ownership of events.

### Marketing Campaign

```text
Campaign
├── one-to-many CampaignTrackingLink (default created on insert)
├── many-to-many User via CampaignCollaborator
├── many-to-many Program via CampaignProgram
├── optional many-to-one User (owner)
├── one-to-many LeadHeader (first-touch campaignId — attribution, not composition)
├── one-to-many ContentItem (content_items.campaignId, nullable)
├── one-to-many MarketingTask (marketing_tasks.campaignId, nullable)
├── one-to-many Asset (assets.campaignId, nullable)
├── one-to-many AssetUsage (optional campaignId on usage)
├── one-to-many AcquisitionEvent (acquisition_events.campaignId, nullable)
└── one-to-many CampaignMetaMap → MetaCampaign → metrics (explicit id map)
```

**Assumed in the request, only partially true in code:**

- Campaign page does **not** load or render Content, Tasks, Assets, Events, or Meta. Those relationships are queryable from the child side only.
- `GET /api/marketing/campaigns` and `GET /api/campaigns` both call `listManagedCampaigns`, which nests tracking links, owner, collaborators, programs, and a slim `leads[]`. It does not nest the marketing children.
- `getCampaign(db, id)` exists in `server/services/campaigns.ts` but there is **no** `GET /api/marketing/campaigns/:id`.
- Content, Tasks, Assets, and Events list APIs have **no** `campaignId` query filter. Contextual tabs would client-filter a full list today or need a small API addition.
- Organic `$0` budget is already valid. `active` is synced from `status === 'ACTIVE'`.

### Acquisition Event

```text
AcquisitionEvent
├── optional many-to-one Campaign
├── optional many-to-one Program
├── one-to-many Session (optional program/age/capacity)
├── one-to-many Question
├── one-to-many Registration
│     ├── optional many-to-one Campaign / TrackingLink (copyable attribution)
│     ├── one-to-many RegistrationLine → Session
│     │     ├── attendance REGISTERED | ATTENDED | NO_SHOW | CANCELLED
│     │     └── optional leadLineId after process
│     ├── one-to-many QuestionAnswer
│     ├── one-to-many RegistrationHistory
│     ├── one-to-many CommunicationIntent (written on process; no send UI)
│     └── optional leadId after process
└── processing creates/matches LeadHeader + LeadLine
      └── one pending EVENT_FOLLOW_UP FollowUpTask per household+event (source_event_id)
```

`assets.eventId` and `marketing_tasks.eventId` exist as integers (task/asset event FKs are not declared `references()` on those two columns). UI never assigns `assets.eventId`. Marketing Tasks can point at an event from the global task form.

### Content Item

```text
ContentItem
├── optional many-to-one Campaign
├── optional many-to-one User (publisher, approver, creator)
├── one-to-many ContentItemChannel
├── one-to-many ContentPublication (manual; no Meta post)
├── assets via assets.contentItemId and/or AssetUsage
└── optional MarketingTasks (contentItemId)
```

`getContentItem` exists in `server/services/content.ts`. There is **no** `GET /api/marketing/content/:id` and no detail page.

### User (lighter; not recommended as full workspace)

```text
User
├── optional many-to-one UserType → UserTypeRole → UserRole → AccessRight
├── extra UserRoleAssignment
├── coarse role ADMIN | STAFF | VIEWER
├── SecurityEvents as actor/target
├── owned Campaigns / assigned MarketingTasks / FollowUpTasks
└── never hard-deleted
```

### Program (catalog; not a workspace)

```text
Program
├── one-to-many MembershipOffering
├── one-to-many HouseholdPricingRule
├── one-to-many LeadLine / compatibility LeadHeader.programId
├── many-to-many Campaign
├── optional Event / Session programId
└── IntroAvailabilityRule (settings, not catalog)
```

---

## D. Proposed workspace specification per Primary Record

### Shared chrome (all full workspaces)

```text
[Index link]   [Previous] [Next]   [Search/select…………]   [+ New]
PRIMARY HEADER — identity, status, 3–7 facts, primary actions
Overview | …tabs…
```

- **Index link** returns to the compact list (`/leads`, `/marketing/campaigns`, `/marketing/events`).
- **Selector** changes the route id; browser back works.
- **New** goes to a create route or creates a minimal DRAFT and opens it — do not keep a large create form on the index once the workspace exists. Exception: `/leads/new` stays a dedicated household builder.
- **Deep link** `/resource/:id` loads that record; missing id → 404 empty state, not a silent first-record fallback.
- **Cancelled / inactive / completed** remain selectable, badged, and ordered after active unless the user searches them.

### D.1 Household Lead — `/leads/:id`

**Already exists.** This is a refactor of `app/pages/leads/[id].vue`, not a new concept.

| Item | Recommendation |
|---|---|
| Selector display | `personName(header)` + derived `householdDisplayStatus` + phone |
| Selector source | Existing `GET /api/leads?search=`; preserve list filters in query when arriving from `/leads` |
| Header | Contact name as title; derived household status badge; phone (`tel:`); email; source; campaign link (if `VIEW_MARKETING`); possible-duplicate badge |
| Not in header | Consents, UTM dump, header JOINED/LOST controls, Forecast MRR breakdown, notes, workflow correction form |
| Primary actions | Edit household; Add person; Call (`tel:`) when phone exists |
| Default tab | **Members** (do not default to a prose Overview that hides people) |

**Tabs:**

| Tab | Contents | Contextual Add | Link out |
|---|---|---|---|
| **Members** (default) | Current person cards + focused line detail (trials, convert, lost, offering). Keep this as the acquisition story. | Add person | — |
| **Follow-up** | Household FollowUpTask list; assign/complete/cancel; disclose manual schedule | Add call (`MANUAL`) | `/tasks` |
| **Attribution** | Header first-touch campaign/UTM/tracking; per-line Compensation Attribution + history + earned. Forecast MRR summary at top. | — | Campaign workspace; `/marketing/compensation` for earned ledger |
| **Notes & history** | Household notes; header status history; possible-duplicate matches | Add note | Other matching `/leads/:id` |
| **Overview** (optional, last) | Consents, compatibility header workflow (single-line JOINED), created date, raw header program. Skip this tab if it is only leftovers — dump those under a disclosed “Household details” on Members instead. | — | — |

**Trials:** Nested under the person on Members. A household-level “all intros” list is a useful *summary* on Members or Attribution, not a separate editor. Outcomes stay on the line.

**LeadLine dedicated route:** Not as a primary module. Support `?line=` to expand that person so a Campaign or Event can deep-link a member without a new resource.

**Permissions:** `requireCrmAccessUser` read; `requireCrmWriteUser` edits; ADMIN reverse conversion; `MANAGE_COMPENSATION_ATTRIBUTION` (ADMIN always) for compensation writes; `VIEW_MARKETING` for campaign links. Unchanged model.

**Mobile:** Keep member cards (already the small-screen pattern). Tabs as a horizontally scrollable tablist. Header stacks identity then actions. Do not put convert/lost in the header.

**Risk:** This page is already the result of an M8 household UX correction. Tab extraction must preserve: derived household status, person-first cards, mixed JOINED+LOST, follow-up empty compactness, Forecast `$0` when closed.

### D.2 Marketing Campaign — `/marketing/campaigns/:id`

**Highest-value new workspace.** Current page mixes a large create form with one `AppPanel` per campaign containing every planning field, collaborator/program checkboxes, attributed households, and tracking links (`app/pages/marketing/campaigns.vue`, ~742 lines).

| Item | Recommendation |
|---|---|
| Selector display | Name · status · kind (`Organic`/`Paid`) |
| Selector source | New slim index payload (id, name, slug, status, kind, owner, budgetCents) — **do not** reuse `listManagedCampaigns` with nested households for the combobox |
| Header | Name; status; kind; owner; planned budget; planned start→end (compact Denver dates) |
| Header actions | Save/status (or status as header field); **Copy default tracking link**; Open attributed households (`/leads?campaignId=`) |
| Not in header | Offer, target audience, notes, actual dates, collaborator checkboxes, program checkboxes, channel, objective/description (objective *may* be header if one line; prefer Overview) |

**Tabs:**

| Tab | Contents | Contextual Add | Link out |
|---|---|---|---|
| **Overview** | Description, objective, offer, target audience, notes, channel, actual dates, programs, collaborators | — | — |
| **Content** | Content items with `campaignId` | Add Content (pre-set campaign) | `/marketing/content/:id` |
| **Tasks** | Marketing Tasks for this campaign | Add Task (pre-set campaign) | `/marketing/tasks` (global due queue) |
| **Assets** | Assets with `campaignId` or usage.campaignId | Upload/attach with campaign set | `/marketing/assets` |
| **Tracking** | Default + extra links; destination `/trial` or `/events/:slug`; copy | Add extra link | Public URL |
| **Events** | Events with this `campaignId` | Add Event (pre-set campaign) | `/marketing/events/:id` |
| **Performance** | Internal attributed households (existing nested leads, plus link to `/leads?campaignId=`); CRM funnel counts; planned budget vs Meta-reported spend when mapped; read-only Meta map status | — | `/settings/meta` for mapping writes (ADMIN); household `/leads/:id` |

**Meta mapping:** Keep writes on `/settings/meta` (ADMIN, explicit id map). Performance shows mapped vs not mapped using data `getMarketingOverview` already computes. Do not add a Meta Campaign workspace.

**Proposed field split vs request:** Agree that offer / audience / programs / collaborators / notes belong in Overview. Put **Copy default link** in the header because that is daily work; keep the Tracking tab for managing extras and destinations. Do not make Programs or Collaborators their own tabs.

**Permissions:** Hub `VIEW_MARKETING`; writes `MANAGE_CAMPAIGNS`; Content/Task/Asset/Event adds use those manage rights (hide Add if missing); Performance read is `VIEW_MARKETING` (overview already exposes labeled Meta vs CRM vs attributed). `MANAGE_MARKETING_CONFIGURATION` is **unused in code** today — do not invent a use for it on this screen.

**Mobile:** Selector full-width; header facts as a 2-column wrap; tabs scroll; tracking copy must remain a large touch target; related tables follow the Leads list pattern (cards &lt; `md`, table from `md`).

### D.3 Acquisition Event — `/marketing/events/:id`

**Already a detail route.** Refactor `app/pages/marketing/events/[id].vue` (~1,000 lines). Keep `/marketing/events` as compact index + create (title, campaign, program, registration window).

| Item | Recommendation |
|---|---|
| Selector display | Title · status · next session date |
| Header | Title; status; public `/events/:slug`; campaign; registration open/closed/manual-close |
| Header actions | Publish / Complete / Close registration / Copy public URL |

**Tabs:**

| Tab | Contents | Contextual Add | Link out |
|---|---|---|---|
| **Overview** | Description, program, campaign, registration window, custom questions (form config) | Add question | Public page |
| **Sessions** | Session list + add/edit | Add session | — |
| **Roster** | Registrations + lines, attendance, Q&amp;A, staff registration form, exclude-from-processing | Staff registration | `/leads/:id` when processed |
| **Process** | Preview counts, ambiguous matches, execute, resulting households / follow-up created | — | `/leads/:id`, `/tasks` |

**Merge vs request:** Merge **Registrations** and **Attendance** — attendance is `registration_lines.attendance`, not a separate entity. Drop **Communications** as a top-level tab until messaging exists (intents are recorded on process and have no UI). **History** can be a disclosure on Roster (registration history rows already come back from GET). **Follow-Up & Leads** = Process tab, because that is when Leads and `EVENT_FOLLOW_UP` appear.

**Permissions:** `MANAGE_ACQUISITION_EVENTS` for setup; `PROCESS_EVENT_REGISTRATIONS` for Process tab actions; `VIEW_MARKETING` to open the workspace. Unchanged.

**Mobile:** Roster is the hard part — keep contact cards with attendance controls, not a wide spreadsheet as the only view.

### D.4 Content Item — `/marketing/content/:id` (lighter detail, not full PRW yet)

Keep `/marketing/content` as the **status queue** (needs assets / review / ready / published). That is the operational view the command center already counts.

Detail page sections (can be in-page headings or two tabs, not five):

1. **Plan** — title, status, campaign, publisher, channels, body, planned publish, notes, approval required  
2. **Creative** — attached assets, attach/upload  
3. **Publish** — approve (`APPROVE_CONTENT`), mark ready, record publication, publication history  

Selector/prev/next: optional later. A back link to the queue and a campaign crumb are enough for M9 volume.

**Do not** treat Content as a peer of Campaign in the rail. Campaign remains the planning parent; Content is a child that sometimes needs a bigger desk.

**Permissions:** `MANAGE_CONTENT` edit/publish-record; `APPROVE_CONTENT` approve; `MANAGE_ASSETS` attach; `VIEW_MARKETING` read.

### D.5 User / Program / Offering — do not build full workspaces now

**User:** Keep `/users` list + existing create/edit/role/access/confirm panels. A `/users/:id` route would help bookmarks later; it is not required to fix Campaign/Lead/Event noise. Security activity stays `/security`. Assigned marketing work is discoverable from Marketing Task assignee filters, not a User “Assigned Work” tab.

**Program / Offering:** Stay on `/settings/catalog`. If Catalog is hard to QA, add in-page section anchors (Programs, Sources, Offerings, Pricing, Lost reasons) — that is a settings page pattern, not Primary Record Workspace.

---

## E. Global screens that should remain

| Screen | Job | Contextual twin |
|---|---|---|
| `/dashboard` | Current-period acquisition snapshot | — |
| `/leads` | Household search, filters, pipeline board | Campaign Performance → `?campaignId=` |
| `/leads/new` | Household builder (too large for workspace New) | — |
| `/tasks` | Acquisition call queue across households | Lead → Follow-up tab |
| `/reports` | Cross-record funnel / MRR / CSV | — |
| `/marketing` | Command center (Meta vs CRM vs attributed) | Campaign Performance is the per-record slice |
| `/marketing/campaigns` | **Compact campaign index** (after overhaul) | Workspace `/marketing/campaigns/:id` |
| `/marketing/tasks` | Marketing work due across campaigns | Campaign → Tasks |
| `/marketing/content` | Content status queue | Campaign → Content; item detail |
| `/marketing/assets` | Library and marketing-use | Campaign/Content attach |
| `/marketing/events` | Event index | Workspace `/marketing/events/:id` |
| `/marketing/compensation` | Earned snapshot ledger / mark paid | Lead Attribution tab |
| `/settings/*` | Intro, catalog, access, Meta, process | Meta read-only on Campaign Performance |
| `/users`, `/security`, `/account` | Admin / audit / self | — |
| Public `/trial`, `/events/:slug` | Capture | Tracking links and Event public URL |

**Do not duplicate business logic.** Vue should keep calling the same services:

- Create task from Campaign tab: `POST /api/marketing/tasks` with `campaignId` set. Same Zod schema as the global form.
- Add content from Campaign: `POST /api/marketing/content` with `campaignId`.
- Household list from Campaign: existing `GET /api/leads?campaignId=`.
- Event process: existing preview/execute endpoints.

**Share edit UI as Vue components**, not as copied pages: e.g. `MarketingTaskForm`, `TrackingLinkList`, `ContentStatusActions` used by both queue and workspace. Server rules stay in `server/services/`.

---

## F. Reusable component / route architecture

### Current UI system

Primitives in `app/components/`: `AppButton`, `AppField`, `AppBadge`, `AppAlert`, `AppEmpty`, `AppPanel`, `AppPageHeader` (already has an `actions` slot), `AppStat`, `AppConfirm`. Staff enum copy: `shared/utils/labels.ts`. Layout: `app/layouts/internal.vue` (navy rail; Marketing is one hub link). **There is no tab, combobox, or record-chrome component today.**

Pages that most need splitting: `leads/[id].vue` (~2189), `events/[id].vue` (~1001), `campaigns.vue` (~742), `content.vue` (~526). The overhaul should extract feature components anyway; do not leave 2k-line pages with tabs glued on.

### Recommended additions (few, named like existing `App*` primitives)

| Component | Role |
|---|---|
| `AppRecordWorkspace` | Page shell: toolbar + header slot + tabs + default slot. Used by Lead, Campaign, Event, later Content. |
| `AppRecordSelector` | Accessible combobox: search input, listbox, optional Previous/Next. Driven by a small list API, not a full aggregate. |
| `AppRecordTabs` | `tablist` / `tab` / `tabpanel`, keyboard left/right, `aria-selected`. URL sync via query `?tab=` so refresh keeps the tab. |
| `AppRelatedTable` | Optional later, after two workspaces share the same table+empty+Add pattern. Do not invent it on day one if Event roster and Lead members need custom cards. |

Avoid a mega `PrimaryRecordWorkspace` that owns data fetching. Keep Nitro handlers thin; each page still `useFetch`es its record. The shell is layout + a11y.

**URL sync:** path param = record id; `?tab=` = tab; `?line=` = expanded member on Lead. Do not use hashes for record identity (`campaignStaffPath` today is `/marketing/campaigns#campaign-12`).

**Suggested routes (staff):**

```text
/leads                              index (keep)
/leads/new                          create (keep)
/leads/:id                          workspace (refactor)
/marketing/campaigns                compact index + New
/marketing/campaigns/:id            workspace (new)
/marketing/events                   compact index + New
/marketing/events/:id               workspace (refactor)
/marketing/content                  queue (compact the cards)
/marketing/content/:id              focused detail (new)
/marketing/tasks                    queue (keep)
/marketing/assets                   library (keep)
```

Nuxt file routes: `app/pages/marketing/campaigns/index.vue` + `app/pages/marketing/campaigns/[id].vue` (split the current single `campaigns.vue`). Same for content if detail is added.

**Record selector implementation pattern:**

1. One composable `useRecordSelectorList(resource)` that fetches a slim list (cache with `useAsyncData` keyed by resource).
2. Previous/Next = index of current id in the **filtered selector list** (default sort: Campaigns by name; Events by next session; Leads by current `/leads` query if present, else recent).
3. Keyboard: combobox pattern (ArrowUp/Down, Enter, Escape); Previous/Next buttons; do not steal global `n`/`p` from inputs.
4. Deleted record: GET 404 → empty state + selector still works.
5. Inactive/cancelled: include in list with badge; selector search matches name.

**Timezone:** Campaign and Event forms currently convert `datetime-local` with `getTimezoneOffset()` in Vue (`campaigns.vue`, `events/[id].vue`). That violates `shared/utils/time.ts` as the display/convert path. The workspace rewrite should fix this while touching those forms — not a schema issue.

**Payload split (API, not schema):** Index/selector must not download every attributed household for every campaign. `listManagedCampaigns` is already too fat for a combobox and for CRM `GET /api/campaigns` on `/leads/new`. Add a slim list (or `?view=summary`) and keep the full graph on GET-by-id / Performance tab.

---

## G. Gaps between current backend and UI

Natural to expose during this overhaul:

| Already in server | Weak or missing in UI | Fit |
|---|---|---|
| Content / Tasks / Assets / Events `campaignId` | Invisible on Campaign page | Campaign tabs |
| `getCampaign` / `getContentItem` services | No HTTP GET-by-id | Thin handlers |
| Marketing overview campaign outcomes (Meta spend vs planned vs attributed people) | Only on `/marketing` table | Campaign Performance |
| Compensation attribution + history on Lead GET | Buried in expanded line (~line 1408+) | Lead Attribution tab |
| Event registration history on GET | Barely surfaced | Roster disclosure |
| Tracking `destinationPath` `/events/:slug` | Present on Campaign cards | Tracking tab |
| Lead `?campaignId=` filter | Used from Campaign household count link | Keep; Performance CTA |

Keep deferred (do not build UI just because the column exists):

| Backend | Why defer |
|---|---|
| `acquisition_event_communication_intents` | No send; intents recorded on process |
| `assets.eventId` | Unused in UI; library + campaign/content attach is enough |
| `MANAGE_MARKETING_CONFIGURATION` | Cataloged Access Right with **zero** API/UI callers |
| Meta publish / CAPI / scheduled sync | Explicitly out of M9 |
| Household merge | Open product rule: warnings only |
| SMS/email/WhatsApp | Milestone-gated |
| Content five-tab “Approval / History / Publications” as peer workspace | Detail sections suffice |

Stale vault note (not a code gap): `vault/Domain-Model.md` still ends with “ContentItem — Not in the database.” M9 implemented it. Fix when docs are updated for this convention.

---

## H. Risks and pushback

1. **Selector-only screens hurt this product.** A gym with a dozen campaigns needs a compact table. Replacing `/marketing/campaigns` with only a combobox would make QA and daily scanning worse.

2. **Tabbing Lead too hard would hide the job.** Staff open a household to work people and intros. If Members is not default, the workspace copies Acumatica’s shape and loses M8’s household document.

3. **Seven Campaign tabs on mobile** is a lot. Performance + Tracking + Overview are justified. If QA finds Assets+Content+Events empty for organic campaigns, allow empty states rather than hiding tabs (hidden tabs become mystery meat). Do not auto-hide tabs based on counts.

4. **Previous/Next across all Leads** is weakly defined when the user arrived from a filtered list. Walk the last filter set (query on the workspace URL) or the selector’s current search — not an unfiltered id order. Document that.

5. **Fat list endpoints.** Putting Content/Tasks/Assets/Events onto `listManagedCampaigns` would make the index worse. Load children on the workspace GET or filtered child lists.

6. **Shared components vs premature abstraction.** Ship Campaign workspace + `AppRecordTabs` + `AppRecordSelector` first. Extract `AppRelatedTable` only when Event and Campaign share a real table pattern. Lead members should stay cards.

7. **Datetime-local timezone bugs** will be copied into the new screens if the Vue offset hack is reused.

8. **Event Process is a dangerous tab.** Preview/execute and ambiguous matches must stay explicit. A prettier workspace must not one-click process. Keep `AppConfirm`.

9. **Do not move Meta mapping writes onto Campaign.** ADMIN id-map on `/settings/meta` is a safety feature (never map by name). Performance is read-only.

10. **Users-as-workspace and Catalog-as-workspace** add routes, tests, and QA surface for almost no operational gain. That would delay the Campaign/Lead/Event fix that human QA is actually stuck on.

11. **No Playwright.** Route and component tests will not catch “I cannot find Copy link.” Scott still has to click the new workspaces. Phase so Campaign is clickable first.

12. **Hash bookmarks.** Lead detail, Marketing overview, tasks, assets, content, and Domain-Model all use `campaignStaffPath` → `#campaign-:id`. Changing it without redirects will strand links and fail `tests/m9/campaigns.test.ts`.

---

## I. Recommended implementation plan

All on existing **`M9`**. Do not implement these phases in this review. No schema/migrations.

### Phase 0 — Convention + URL helper (small, first)

**Commit:** Redirects and `campaignStaffPath` before any large Vue split.

- Change `campaignStaffPath(id)` to `/marketing/campaigns/${id}`.
- Keep `campaignAnchorId` only if needed for old hashes.
- `app/pages/marketing/campaigns.vue`: if `route.hash` is `#campaign-N`, `navigateTo` the new path (`replace: true`).
- `/settings/campaigns` already redirects to `/marketing/campaigns` — keep.
- Update `tests/m9/campaigns.test.ts` path assertion.
- Update vault CRM / Domain-Model campaign link sentences in the docs phase (or here if those files are already open).

### Phase 1 — Shared chrome primitives

**Commit:** `AppRecordTabs`, `AppRecordSelector`, `AppRecordWorkspace` + unit/a11y-oriented tests if you have a component test pattern; otherwise a thin Story-less page is fine and staff QA covers it.

- Match existing `App*` naming and `1tbs` style.
- Tabs write `?tab=` without dropping other query keys (`line`, `campaignId` filters).

### Phase 2 — Slim campaign list API + GET by id

**Commit:** API only.

- `GET /api/marketing/campaigns/:id` → existing `getCampaign`.
- Slim list: either `GET /api/marketing/campaigns?view=summary` or a dedicated lister used by selector + index (id, name, slug, status, kind, owner, budgetCents, dates). **Stop sending full `leads[]` on the index.**
- Optional: `GET /api/campaigns` (CRM) should use the slim list so `/leads/new` is not pulling every household per campaign.
- Add `campaignId` query to content, marketing-tasks, assets, events list schemas/services (filter in SQL, not only Vue).

No new tables. Extend Zod in `shared/schemas/`.

### Phase 3 — Campaign index + workspace (the milestone that unblocks QA)

**Commit 3a:** Compact `/marketing/campaigns` index (table/cards: name, status, kind, owner, budget, household count as a link). Move create to `/marketing/campaigns/new` **or** a short index form that POSTs then `navigateTo` the new id.

**Commit 3b:** `/marketing/campaigns/[id].vue` workspace: header + Overview + Tracking + Performance (all data already on `getCampaign` + overview/leads filter). Copy default link in header.

**Commit 3c:** Content, Tasks, Assets, Events tabs with contextual Add (pre-filled FKs) reusing existing POST endpoints. Link to child detail/queue.

This is the first human-QA checkpoint.

### Phase 4 — Event workspace refactor

**Commit:** Split `events/[id].vue` into workspace + tab components. Same route. Same process preview/execute. Compact `events/index.vue` cards (stop making the index feel like another editor).

### Phase 5 — Lead workspace refactor

**Commit:** Split `leads/[id].vue` into header + Members (default) + Follow-up + Attribution + Notes. Preserve M8 household rules. Add `?line=` expand. Add selector/prev-next using existing `GET /api/leads`.

Highest regression risk (conversion, lost, trials, follow-up, compensation). Run `tests/m8/*` and `tests/m9/compensation.test.ts`; Scott click-tests `/leads/:id`.

### Phase 6 — Content queue compact + detail route

**Commit:** Compact content index (status queue, not full editors). `GET /api/marketing/content/:id` + `/marketing/content/[id].vue` focused detail. Campaign Content tab “Open” uses it.

### Phase 7 — Polish indexes that still use giant cards

**Commit:** Assets and Marketing Tasks stay queues/libraries; only tighten create-vs-list visual hierarchy if they still feel like Campaign-before. Users/Catalog: optional section nav only — **skip** unless Scott still wants them in this pass.

### Phase 8 — Documentation (same branch, own commit)

See section J.

### Test / CI expectation per behavior phase

`pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Likely breakage: `tests/m9/campaigns.test.ts` (paths), any HTTP tests that assume campaign list shape with nested `leads`, Vue-free service tests should stay green if APIs are additive.

**No schema commit is required.** If someone proposes one during implementation, reject it unless a real FK is missing for `marketing_tasks.eventId` / `assets.eventId` — and that is unrelated cleanup, not this UX.

---

## J. Documentation changes

Make the convention durable in the same implementation work (not this review file).

| Note | Update |
|---|---|
| [[Design-System]] | New **Primary Record Workspace** section: shell, selector, header rule, tabs, mobile collapse, what is *not* a workspace. This is the authoritative UI rule. |
| [[Architecture]] | Interaction model: index vs workspace vs queue; staff routes list. |
| [[CRM]] | Lead workspace tabs; keep household-document default on Members; campaign link becomes `/marketing/campaigns/:id`. |
| [[Domain-Model]] | Campaign UI URL; remove stale “ContentItem not in the database”; note Content detail vs Campaign parent. |
| [[Authentication]] | No new rights. Note which tabs reuse which existing Access Rights. |
| [[Decisions]] | New dated ADR (draft below). |
| [[Implementation-State]] | After the work ships, not before. |
| [[How-to-Run]] | New record URLs. |
| [[wip/M9_Implementation_Handoff_2026-09-02]] | Leave as historical evidence; do not rewrite. |

Do not treat `vault/wip/` as the map. After Scott accepts the spec, the Design-System + Decisions entries are the map.

### Proposed durable design rule (for [[Design-System]] / [[Decisions]])

```markdown
## Primary Record Workspace

Business entities that are the central context for related records use a
record workspace: compact index or queue to find work, then a stable URL
`/{area}/{id}` with searchable selection, previous/next where a list order
exists, a short header (identity, state, frequent actions), and tabs for
related records. Related creates inherit the current record id.

Header fields identify the record and its state. Planning and rare
configuration live in Overview or a tab — not in an ever-growing header.

Child records may have their own detail screens without becoming peers of
the parent (Campaign → Content Item).

Global queues, libraries, and reports remain when the job crosses many
primary records. Do not duplicate tables for contextual vs global views.
Server services stay canonical; Vue does not own workflow side effects.

Full workspaces: Household Lead, Marketing Campaign, Acquisition Event.
Content Item uses a focused detail route. Users, Programs, offerings,
assets, tracking links, trials, follow-up tasks, and marketing tasks are
not top-level workspaces.

Public `/trial` and `/events/:slug` stay conversion surfaces, not staff
workspaces.
```

### Proposed [[Decisions]] entry (after Scott accepts)

```markdown
## 2026-09-03 — Primary Record Workspace is the staff record pattern
Status: accepted
Context: M9 Campaign/Content screens stacked create, list, and child
editing until human QA could not see the work.
Decision: Normalize Household Lead, Marketing Campaign, and Acquisition
Event onto a record workspace (stable URL, selector, short header, tabs)
while keeping global queues and compact indexes. No schema change. Content
gets a detail route without full workspace chrome. Users and Catalog stay
lighter editors. Internal Campaign remains distinct from Meta Campaign.
```

---

## K. Questions requiring Scott / ChatGPT decisions

Only product/UX choices the repository cannot settle:

1. **Lead default surface.** Confirm Members-first (recommended) vs an Overview-first workspace that summarizes the household before people. This is the main risk of copying ERP layout onto the CRM.

2. **Campaign index vs workspace-only.** Confirm keeping a compact `/marketing/campaigns` index (recommended) vs making that path itself the workspace with no portfolio table.

3. **Content rank.** Confirm lighter `/marketing/content/:id` now (recommended) vs full selector/prev-next/tab workspace in this same pass.

4. **Campaign New.** After POST create: land on the new workspace (recommended) vs stay on the index. Also: is a dedicated `/marketing/campaigns/new` page wanted, or a short modal/panel on the index?

5. **LeadLine deep link.** Is `?line=` on the household enough, or do you want a path segment `/leads/:id/members/:lineId` for sharing a person with staff?

6. **Meta on Performance.** Confirm read-only mapped spend + “Not mapped” with a Settings link (recommended) vs allowing ADMIN to set the Meta campaign id from the Campaign workspace.

7. **Users / Catalog in this pass.** Confirm skip full workspaces (recommended). If Scott still wants Users tabbed for Access vs Security, that is a separate bounded commit after Campaign/Event/Lead.

8. **Previous/Next on Leads.** Walk the filtered list the user came from (recommended) vs always walking all households by name/id.

Nothing below needs a human decision before a spec can be written: component names, SQL vs client filter for small lists, whether `?tab=` vs path segments for tabs (`?tab=` is enough), or whether to add `AppRelatedTable` in phase 1 vs 3.

---

## Appendix — current route / UI pain (evidence)

| Surface | Mixes list/create/edit? | Stable record URL? | Related UI? | Pain |
|---|---|---|---|---|
| `/marketing/campaigns` | Yes — large create form + per-campaign editor cards | Hash only | Tracking + attributed households only | The stated problem. No content/tasks/assets/events/Meta. `listManagedCampaigns` nests all households. |
| `/marketing/content` | Yes — same card pattern | No | Channels, publications, attach asset | Will become Campaign-like as items grow. |
| `/marketing/events` | Create form + compact-ish list | List has links to `:id` | Counts only | Acceptable index once cards stay small. |
| `/marketing/events/:id` | No list; stacked setup + roster + process | Yes | Sessions, questions, roster, process | Real workspace candidate; too much on one scroll. Add-session and add-question sit beside details. |
| `/leads` | List/board + filters | No (index) | — | Healthy. Keep. |
| `/leads/new` | Create only | N/A | Members builder | Healthy. Keep. |
| `/leads/:id` | Detail only | Yes | Lines, trials, follow-up, forecast, notes, compensation | Healthy IA, oversized page, everything stacked. |
| `/marketing/tasks` | Queue + create | No | Links to campaign hash | Healthy queue. |
| `/marketing/assets` | Library + upload | No | Campaign hash | Healthy library. |
| `/users` | List + panels | No | Type, extra roles | Fine for headcount. |
| `/settings/catalog` | Five catalogs stacked | No | — | Settings density, not record-workspace. |
| `/marketing` | Overview | Links use campaign hash | — | Update links after Phase 0. |

Inspected: `server/database/schema/index.ts`, `server/services/{campaigns,content,events,marketing-tasks,assets,marketing-overview}.ts`, `app/pages/marketing/*`, `app/pages/leads/*`, `app/pages/users.vue`, `app/pages/settings/catalog.vue`, `app/layouts/internal.vue`, `shared/utils/{campaign,access-rights}.ts`, `vault/{CRM,Domain-Model,Design-System,Authentication,Implementation-State}.md`, `tests/m9/campaigns.test.ts`.
