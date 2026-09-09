---
type: note
status: current
area: process
updated: 2026-09-05
tags:
  - m9
  - qa
  - acceptance
---

# M9 Human QA Workbook

Scott’s executable acceptance pass for **M9 Collaborative Marketing Operations**. Open this in Obsidian. Test the running app in a browser. Do not treat automated tests as a substitute.

**Branch:** `M9`  
**App:** http://localhost:5000  
**Do not merge. Do not mark M9 accepted from this file.**

Rules: [[CRM]], [[Decisions]], [[Domain-Model]], [[Authentication]], [[Implementation-State]], [[Design-System]]. Leftover list (not this workbook): [[wip/M9_Remaining_Human_QA]]. Inbox: [[wip/note]].

> [!warning]
> Event → intro Follow-Up consolidation (one open household call after Trials) is the 2026-09-05 rule in [[CRM]] / [[Decisions]]. Confirm Follow-up cards show purpose (**Confirm intros** / **Event follow-up**). If you still see two competing open “Confirm intros” after EVENT-14, treat that as blocking and stop the Follow-Up family.

> [!info]
> Settled (do not re-litigate): household headline is coarse aggregate; Content belongs to at most one Campaign; Assets reuse via usages; public Event signup does not warn about duplicates. The only product question in this workbook is public Event **consent checkboxes**.

---

## How to use this file

1. Complete **Prerequisites** and **Reusable dataset**.
2. Work sections in order. Blocking families are marked.
3. Check `- [ ]` only from the browser, never from memory of unit tests.
4. On failure, fill [[#Defects Found]] before deciding whether to stop.
5. End at [[#Final M9 Acceptance Gate]]. Leave both ACCEPT / DO NOT ACCEPT unchecked until you decide.

**Viewport sizes for UX:** wide (~1440), laptop (~1280), tablet (~768), phone (~390).

---

## Index

- [[#Acceptance dashboard]]
- [[#Prerequisites]]
- [[#Reusable dataset]]
- [[#AUTH / PERM — Authentication and Access Rights]]
- [[#CAM — Campaigns]]
- [[#CONTENT — Content]]
- [[#TASK — Marketing Tasks]]
- [[#ASSET — Assets]]
- [[#EVENT — Acquisition Events]]
- [[#EVENT-14 — Required Event → Household → Trials → Follow-Up]]
- [[#LEAD — Household Leads]]
- [[#TRIAL — Trials]]
- [[#FOLLOW — Follow-Up]]
- [[#CONV — Conversion / Lost]]
- [[#COMP — Attribution / Compensation]]
- [[#UX — UI/UX / Responsive]]
- [[#E2E — Cross-module end-to-end]]
- [[#Defects Found]]
- [[#When to stop vs continue]]
- [[#Product Decision Pending]]
- [[#Final M9 Acceptance Gate]]

---

## Acceptance dashboard

| Domain | Result | Notes |
|---|---|---|
| Environment / prerequisites | | |
| Authentication / Permissions | | |
| Campaigns | | |
| Content | | |
| Marketing Tasks | | |
| Assets | | |
| Acquisition Events | | |
| Household Leads / LeadLines | | |
| Trials | | |
| Follow-Up | | |
| Conversion / Lost | | |
| Attribution / Compensation | | |
| UI/UX / Responsive | | |
| End-to-End Regression | | |

**Gates** (leave unchecked until the matching family is done in the browser)

- [ ] All blocking tests passed
- [ ] All discovered blocking defects resolved
- [ ] Permissions pass completed
- [ ] Event → Household → Trials → consolidated Follow-Up path passed
- [ ] Default tracked-acquisition credit owner configured and verified
- [ ] Compensation attribution passed
- [ ] Aggregate Household status scenarios passed
- [ ] Final end-to-end scenario passed
- [ ] UI/UX acceptance pass completed
- [ ] M9 ready for Scott's acceptance decision

---

## Prerequisites

**Starting state**

- Node 22+, `pnpm dev` bound to port **5000** (never treat 3000 as the staff app).
- Local SQLite is fine. Do not use production data.
- Timezone for “today” / due buckets is **America/Denver**.
- Meta credentials may be missing. The app must still run. Do not fail Campaign QA solely because Meta is disconnected.

> [!tip]
> Local SQLite was wiped and seeded for this pass (2026-09-05). Skip **AUTH-02 create** — the QA accounts already exist. Sign in with email + `QaPass1!` (no forced password). Open existing **QA M9 Camp** (Draft, `/marketing/campaigns/2`) instead of creating a second one in CAM-02. **QA Open House** is Published with Saturday Ninjas and Sunday Samurai — public URL `/events/qa-open-house`. Start EVENT-02 for public signup. Still run **CAM-06** (set Campaign Active) before COMP. No households, Trials, or Follow-ups were pre-created. Default tracked-acquisition credit owner is already **QA Owner B**.

**Accounts you will create** (Users is ADMIN-only)

| Account | Coarse role | Extra User Roles | Password after first-login change |
|---|---|---|---|
| Bootstrap ADMIN | ADMIN | (all rights in code) | development: `admin` / `setup` |
| QA Owner A | STAFF | none required (display name only) | `QaPass1!` |
| QA Owner B | STAFF | none required | `QaPass1!` |
| QA Staff None | STAFF | **none** | `QaPass1!` |
| QA Campaign Mgr | STAFF | `Campaign manager` (`VIEW_MARKETING` + `MANAGE_CAMPAIGNS`) | `QaPass1!` |
| QA Reports Viewer | STAFF | `Marketing viewer` (`VIEW_MARKETING` + `VIEW_MARKETING_REPORTS`) | `QaPass1!` |
| QA Event Staff | STAFF | `Event manager` + `Event processor` | `QaPass1!` |
| QA Viewer | VIEWER | none | `QaPass1!` |

New users get temporary password **`Change1!`** and land on `/account/password` until they set a permanent password (8+ characters, one uppercase, one special). Use a second browser or a private window for non-ADMIN sessions.

**Access Rights that matter in this pass**

| Right (UI label) | Code | Human meaning |
|---|---|---|
| View Marketing | `VIEW_MARKETING` | Rail **Marketing**, hub, Campaign/Event/Content/Task/Asset routes |
| View marketing reports | `VIEW_MARKETING_REPORTS` | Detailed Campaign **Performance** API/tab body; Compensation ledger GET |
| Manage campaigns | `MANAGE_CAMPAIGNS` | Create/update Campaigns and tracking links |
| Manage marketing tasks | `MANAGE_MARKETING_TASKS` | Create/edit Marketing Tasks |
| Manage content | `MANAGE_CONTENT` | Create/edit Content |
| Approve content | `APPROVE_CONTENT` | Approve when review is required |
| Manage assets | `MANAGE_ASSETS` | Upload/classify/attach |
| Manage acquisition events | `MANAGE_ACQUISITION_EVENTS` | Event/session/roster writes |
| Process event registrations | `PROCESS_EVENT_REGISTRATIONS` | Preview + Process |
| Manage compensation attribution | `MANAGE_COMPENSATION_ATTRIBUTION` | Assign/correct credit |

ADMIN has every right in code. STAFF starts with **none**. Hidden nav is not authorization — also hit the URL and (where practical) an API from the logged-in session.

**Compensation precondition**

Before COMP-* and E2E-01:

```text
ADMIN → Settings (/settings)
→ panel “Default tracked-acquisition credit owner”
→ Credited user = QA Owner B
→ Save
```

Until that is set, generated-link SYSTEM credit stays **Unassigned**. That is current behavior, not a reason to skip configuration.

---

## Reusable dataset

Use these names. Mark tests **FRESH** when they must not reuse a processed Event or converted person.

| Record | Value |
|---|---|
| Campaign | **QA M9 Camp** (Organic, start Draft, later Active) |
| Campaign owner | **QA Owner A** |
| Tracked-acquisition credit owner | **QA Owner B** (Settings) |
| Tracking link | Default Campaign link (copy from header **Copy default tracking link**) |
| Content | **QA Camp caption** |
| Asset | **QA gym photo** (any small jpg/png) |
| Marketing Task | **QA post draft** |
| Event | **QA Open House** |
| Session 1 | **Saturday Ninjas** (Kids-capable time) |
| Session 2 | **Sunday Samurai** |
| Guardian / header | **Nora Quinn**, phone `8015550101`, email `nora.quinn.qa@example.com` |
| Child prospect | **Isla Quinn**, age **8**, Kids BJJ |
| Adult / Self prospect | **Nora Quinn**, Adult BJJ (Add person Self on the Event household) |
| Duplicate public signup | Same phone `8015550101`, child **Mira Quinn** |
| Walk-in (no tracking link) | **Wes Walker**, phone `8015550199`, Walk-in |
| Mixed-status household | **Quinn Mix** (separate from Nora unless a test says reuse) |

Programs: **Adult BJJ**, **Kids BJJ**. Lost reason when needed: **Not interested**. Offering: seed Adult / Kids membership (pick the listed offering on Convert).

---

## AUTH / PERM — Authentication and Access Rights

**Blocking family.** UI hiding is not proof.

### AUTH-01 — ADMIN login

**Purpose.** Bootstrap ADMIN can enter the staff app.

**Starting state.** Logged out. Dev credentials.

**Steps**
1. Open `/login`.
2. Sign in as `admin` or `admin@local` / `setup`.

**Expected**
- [x] Lands on `/dashboard` (not forced password). ✅ 2026-09-05
- [x] Rail shows Dashboard, Leads, Follow-up, Marketing, Reports, Users, Security activity, Settings. ✅ 2026-09-05

**Must not happen**
- [x] Forced password on bootstrap ADMIN. ✅ 2026-09-05
- [x] Missing Marketing or Settings for ADMIN. ✅ 2026-09-05

**Rule.** Development bootstrap ADMIN is `mustChangePassword = false`. [[Authentication]]

**Blocking:** Yes if ADMIN cannot operate.

> [!failure]
> Capture login identifier used and the landing URL.

---

### AUTH-02 — Create the QA users

**Purpose.** Build the permission matrix accounts.

**Starting state.** ADMIN session. `/users`.

**Steps**
1. Create each row in the Prerequisites table (STAFF or VIEWER).
2. For STAFF with marketing: open **Access**, User Type **Staff**, add the Extra User Roles listed.
3. QA Staff None: User Type Staff, **no** extra roles.
4. In a private window, complete `/account/password` with `QaPass1!` for each new user.

**Expected**
- [x] Each user can sign in after the password change.
- [x] QA Staff None Access shows no marketing Extra User Roles.

**Must not happen**
- [x] QA Staff None accidentally given Marketing viewer or Campaign manager.

**Blocking:** Yes. Later PERM tests depend on this.

---

### PERM-01 — STAFF with no Marketing rights

**Purpose.** Default STAFF cannot use Marketing.

**Starting state.** QA Staff None signed in.

**Steps**
1. Look at the navy rail.
2. Open `/marketing` by typing the URL.
3. Open `/marketing/campaigns`, `/marketing/events`, `/leads`, `/tasks`.

**Expected**
- [x] Rail has Dashboard, Leads, Follow-up, Reports. **No Marketing.**
- [x] Direct `/marketing*` redirects to `/dashboard` (marketing middleware).
- [x] `/leads` and `/tasks` work (CRM).

**Must not happen**
- [x] Marketing hub usable without `VIEW_MARKETING`.

**Rule.** STAFF starts with no Access Rights. Nav hide is not enough; middleware must bounce.

**Blocking:** Yes.

---

### PERM-02 — VIEWER is dashboard-only

**Purpose.** VIEWER cannot CRM or Marketing.

**Starting state.** QA Viewer signed in.

**Steps**
1. Inspect the rail.
2. Visit `/leads`, `/tasks`, `/reports`, `/marketing`, `/users`, `/settings` by URL.

**Expected**
- [x] Rail is Dashboard (and account). No Leads, Follow-up, Marketing, Reports, Users, Settings.
- [x] Those URLs redirect to `/dashboard`.

**Must not happen**
- [x] Lead list or Marketing hub for VIEWER.

**Blocking:** Yes.

---

### PERM-03 — `VIEW_MARKETING` without `VIEW_MARKETING_REPORTS`

**Purpose.** Campaign manager can work Campaigns but not detailed Performance / compensation ledger.

**Starting state.** QA Campaign Mgr. Campaign **QA M9 Camp** may already exist from CAM-02; if not, ADMIN creates it first.

**Steps**
1. Confirm rail **Marketing**.
2. Open `/marketing` and `/marketing/campaigns`.
3. Open `/marketing/campaigns/:id` → tab **Performance**.
4. Open `/marketing/compensation`.

**Expected**
- [x] Marketing hub and Campaign workspace load.
- [x] Performance tab shows: “Detailed campaign performance needs the Marketing reports right. Household count and the Leads filter stay available.”
- [ ] Compensation page does not show the ledger (API is `VIEW_MARKETING_REPORTS`; expect an access/load error or empty failure, not ADMIN numbers).

**Must not happen**
- [ ] Detailed Performance Meta/funnel body for this user.
- [ ] Ability to Save Campaign if you stripped Manage campaigns (this user **should** be able to save; that is correct).

**Rule.** [[Authentication]]: `VIEW_MARKETING_REPORTS` gates `GET /api/marketing/campaigns/:id/performance` and compensation GET. `CAMPAIGN_MANAGER` seed role is View Marketing + Manage campaigns, **not** reports.

**Blocking:** Yes.

---

### PERM-04 — `VIEW_MARKETING_REPORTS`

**Purpose.** Marketing viewer can read detailed Performance and the compensation ledger, not necessarily manage Campaigns.

**Starting state.** QA Reports Viewer.

**Steps**
1. Open a Campaign → **Performance**.
2. Open `/marketing/compensation`.
3. Try **New campaign** / save Campaign details if the control is visible.

**Expected**
- [ ] Performance detailed panel loads (or an empty-but-authorized panel, not the “needs Marketing reports right” alert).
- [ ] Compensation ledger route returns data or an empty list, not a permissions bounce from `VIEW_MARKETING_REPORTS`.
- [ ] Create/save Campaign is denied without `MANAGE_CAMPAIGNS`.

**Blocking:** Yes for the reports distinction.

---

### PERM-05 — Event process right vs Event manage

**Purpose.** Processing is its own right.

**Starting state.** QA Campaign Mgr (has Manage campaigns, not Event processor). Published Event with a registration if you already ran EVENT-*; otherwise ADMIN-create a throwaway Event.

**Steps**
1. Open `/marketing/events/:id?tab=process` as QA Campaign Mgr.
2. Click **Preview** if the button is offered.

**Expected**
- [ ] Workspace may be readable with View Marketing.
- [ ] Preview/Process fails or is unavailable without `PROCESS_EVENT_REGISTRATIONS`.

**Must not happen**
- [ ] Batch execute as a user who only manages Campaigns.

**Blocking:** Yes if process is callable without the right.

---

### PERM-06 — ADMIN still has Settings, Users, Meta mapping

**Purpose.** Mapping writes stay ADMIN Settings, not Campaign Performance.

**Starting state.** ADMIN.

**Steps**
1. `/settings`, `/users`, `/settings/access`, `/settings/meta`.
2. Campaign Performance: **Meta mapping in Settings** link (when reports are visible).

**Expected**
- [ ] Settings hub includes intro schedule, catalog, Access Rights, Meta, Trial outcome setting, **Default tracked-acquisition credit owner**.
- [ ] `/settings/campaigns` redirects to `/marketing/campaigns`.

**Blocking:** Continue if only Meta is disconnected; blocking if Settings hub is missing.

---

## CAM — Campaigns

### CAM-01 — Campaign index

**Starting state.** ADMIN or QA Campaign Mgr.

**Steps.** `/marketing/campaigns`.

**Expected**
- [ ] Compact index, not a stacked editor-per-card.
- [ ] **New campaign** visible to managers.

**Blocking:** No (cosmetic unless create is missing).

---

### CAM-02 — Create Campaign lands on record URL — FRESH

**Starting state.** `/marketing/campaigns/new`.

**Steps**
1. Name `QA M9 Camp`, Kind Organic, Status **Draft**, Owner **QA Owner A**, budget optional.
2. Submit.

**Expected**
- [ ] URL is `/marketing/campaigns/:id` (not stay on `/new`).
- [ ] Header identity is the Campaign name with selector + Previous/Next.

**Must not happen**
- [ ] Create+list+editor on one page.

**Blocking:** Yes.

---

### CAM-03 — Workspace tabs and selector

**Steps.** On `QA M9 Camp`, walk Overview, Content, Tasks, Assets, Tracking, Events, Performance. Search the header selector; use Previous/Next if another Campaign exists.

**Expected**
- [ ] Tabs: Overview, Content, Tasks, Assets, Tracking, Events, Performance.
- [ ] Selector search switches Campaigns; selected record stays obvious.

**Blocking:** No unless selector is broken.

---

### CAM-04 — Draft tracking-link copy does not crush the header

**Starting state.** Campaign still **Draft**.

**Steps**
1. Click **Copy default tracking link**.
2. Confirm **This campaign is not Active yet** / **Copy anyway**.
3. Watch the header and the copy notice.

**Expected**
- [ ] Confirm dialog is **centered**.
- [ ] Success copy is a short notice such as **Copied the default tracking link.** (not a raw `http://localhost:5000/trial?c=…` bar in the header flex).
- [ ] Title / Previous / Next / CAMPAIGN do not collapse into one-letter-per-line wrapping.

**Must not happen**
- [ ] Confirm stuck top-left over the rail.
- [ ] Long URL stretching the actions column.

**Blocking:** Yes for layout/dialog; continue the rest of Campaign QA.

---

### CAM-05 — Tracking tab and destination

**Steps.** Tab **Tracking**. Inspect default link. Optional: extra link. Copy from this tab too.

**Expected**
- [ ] URL can wrap (`break-all` / no header crush).
- [ ] Destination is `/trial` unless you set an Event slug path.

**Blocking:** No.

---

### CAM-06 — Set Campaign Active for attribution tests

**Steps.** Overview → Status **Active** → Save (success alert near Save).

**Expected**
- [ ] Save feedback is visible next to Save, not only at the top of a long page.
- [ ] Later tracking-link signups can stamp this Campaign.

**Blocking:** Yes for COMP/E2E.

---

### CAM-07 — Content / Tasks / Assets / Events context create

**Steps.** On each of those tabs, create or attach using the in-context controls (New content title, task, upload, New event title) if you have the child right. ADMIN can do all.

**Expected**
- [ ] New Content opens `/marketing/content/:id?campaignId=` (or equivalent) with a way **Back to Campaign**.
- [ ] Child writes still need the matching Access Right for non-ADMIN.

**Blocking:** No if global create still works.

---

### CAM-08 — Attributed households link

**Steps.** After at least one tracked household exists (COMP-02 or E2E), open Performance/household list and use the Leads filter `/leads?campaignId=`.

**Expected**
- [ ] Household names link into `/leads/:id`.
- [ ] `VIEW_MARKETING` is enough to see count/link; detailed Performance still needs reports.

**Blocking:** No.

---

## CONTENT — Content

### CONTENT-01 — Global list and create

**Steps.** `/marketing/content` → **New content item** → title `QA Camp caption` → open `/marketing/content/:id`.

**Expected**
- [ ] Detail route, selector, not a one-page list+editor.
- [ ] Campaign is a **single** optional select (not many Campaign chips).

**Must not happen**
- [ ] Assigning two Campaigns on one Content item.

**Blocking:** Yes if many-to-many UI appears.

---

### CONTENT-02 — Campaign navigation

**Steps.** Set Campaign to **QA M9 Camp**. Use header **Campaign:** name link and **Back to Campaign**.

**Expected**
- [ ] Opens `/marketing/campaigns/:id`.
- [ ] `?campaignId=` Back to Campaign returns to that Campaign.

**Blocking:** No (navigation gap is major, not data-integrity).

---

### CONTENT-03 — Edit, attach asset, approval/publish as implemented

**Steps.** Fill caption/body. Attach **QA gym photo** if uploaded. If approval is required, Approve with `APPROVE_CONTENT`. Record a publication if the Publish control exists.

**Expected**
- [ ] Attach confirmation is next to the attach action (not only page-top).
- [ ] Status labels match the app: Idea / Needs assets / Draft / Needs review / Approved / Ready to publish / Published / Cancelled.
- [ ] This is planning + manual publication history, **not** Meta posting.

**Blocking:** No unless save is broken.

---

## TASK — Marketing Tasks

### TASK-01 — Queue and detail

**Starting state.** `/marketing/tasks`. These are **not** Lead Follow-up (`/tasks`).

**Steps**
1. Create **QA post draft** (from index or Campaign Tasks tab).
2. Open `/marketing/tasks/:id`.
3. Set assignee, due date, complete or cancel.

**Expected**
- [ ] Compact queue (Overdue / Due today / Upcoming / All).
- [ ] Click → stable detail URL + selector.
- [ ] Campaign link present when associated.
- [ ] Status Open / Completed / Cancelled (task status **Open** for PENDING).

**Must not happen**
- [ ] Marketing Task appearing on household Follow-up `/tasks`.

**Blocking:** Yes if queues are the same table.

---

## ASSET — Assets

### ASSET-01 — Upload and Used in

**Steps**
1. `/marketing/assets` → **Upload** `QA gym photo`.
2. Open `/marketing/assets/:id`.
3. Attach the same file to Content and/or a second Campaign usage if the UI allows.
4. Inspect **Used in**.
5. Remove one usage only.

**Expected**
- [ ] Used in lists Campaigns and Content (direct assignment and usages) with working links.
- [ ] Removing one usage does not delete the file or the other usage.
- [ ] Restrict / Do not use stay disabled until a restriction note (≥3 characters); **Saved**/error is visible.

**Must not happen**
- [ ] Asset belonging to only one Campaign with usages wiped.

**Blocking:** Yes if reuse is destroyed.

---

## EVENT — Acquisition Events

**Blocking family.**

> [!warning]
> Process **Preview includes Attended and No-show by default**, not Registered. On Roster set Attendance to **Attended** (or **No-show**) or the person will not enter the batch.

### EVENT-01 — Create Event and sessions — FRESH

**Starting state.** ADMIN or QA Event Staff. Prefer Campaign **Events** tab **Add event** titled `QA Open House`, or `/marketing/events`.

**Steps**
1. Land on `/marketing/events/:id`.
2. Overview: attach Campaign **QA M9 Camp** if not already.
3. Sessions: add **Saturday Ninjas** and **Sunday Samurai** with future start times. Copy should explain a session is the date/time people pick; at least one is required before Publish.
4. Optional: add one registration question.
5. Status **Published**. Save.

**Expected**
- [ ] Tabs: Overview, Sessions, Roster, Process.
- [ ] Selector + Previous/Next.
- [ ] Public URL available (Copy public URL — short notice, centered confirm if any).

**Blocking:** Yes.

---

### EVENT-02 — Public registration (child) — FRESH

**Starting state.** Logged out or a separate window. Event Published.

**Steps**
1. Open `/events/:slug` (slug from Overview).
2. Contact: Nora Quinn, phone `8015550101`, email `nora.quinn.qa@example.com`.
3. Participant: Isla Quinn, age 8, session Saturday Ninjas.
4. Submit.

**Expected**
- [ ] Confirmation: `You're registered for QA Open House. We'll follow up after the event.`
- [ ] **No** SMS/email consent checkboxes (current behavior). Do not fail this test for missing consent — see Product Decision Pending.
- [ ] **No** Lead created yet (Events are not Leads until Process).

**Must not happen**
- [ ] Immediate household on `/leads` from public Event signup alone.

**Blocking:** Yes.

---

### EVENT-03 — Public duplicate is allowed with no customer warning — FRESH

**Steps**
1. On the same public page, register again: same phone `8015550101`, participant **Mira Quinn**, either session.
2. Submit.

**Expected**
- [ ] Second registration succeeds.
- [ ] Public UI does **not** warn about an existing registration or CRM household.

**Must not happen**
- [ ] Blocked signup.
- [ ] Silent merge of Event rows into one registration.

**Rule.** Duplicate detection is staff-facing and advisory.

**Blocking:** Yes if the customer is blocked or auto-merged.

---

### EVENT-04 — Roster attendance save feedback and exclude

**Starting state.** ADMIN or Event manager. `/marketing/events/:id?tab=roster`.

**Steps**
1. Confirm two registrations (Nora+Isla, Nora+Mira) and Possible duplicate badges with match reason / links.
2. Change Isla’s Attendance to **Attended**. Watch **Saving…** then **Saved**.
3. Repeat for Mira **Attended**.
4. Toggle **Exclude from processing** on one row, then uncheck it. Confirm row Saved.

**Expected**
- [ ] Possible duplicate is visible on staff Roster.
- [ ] Immediate-save shows Saving / Saved / error on **that row**.
- [ ] Failures are not only a page-top alert.

**Blocking:** Yes for missing duplicate evidence; major for missing Saved.

---

### EVENT-05 — Process preview lists people

**Starting state.** Attendance Attended on included lines. Tab **Process**.

**Steps**
1. Click **Preview**.
2. Read the count line **and** the people list.

**Expected**
- [ ] Counts plus named groups: NEW / MATCH / AMBIGUOUS / ALREADY_PROCESSED as applicable.
- [ ] Duplicate warnings remain visible.
- [ ] Copy that one confirmation call is per household for this event.
- [ ] Empty state before Preview is not a blank card without instruction.

**Must not happen**
- [ ] Counts-only with no names after Preview.

**Blocking:** Yes.

---

### EVENT-06 — Execute process → households + Event follow-up

**Steps**
1. Confirm **Process these registrations into Leads?** is **centered**.
2. **Process now**.
3. Open resulting household(s) from the result links.
4. Open `/tasks` and the household **Follow-up** tab.

**Expected**
- [ ] Household **Nora Quinn** with child line **Isla Quinn** (and Mira if grouped into the same household by phone).
- [ ] One pending **Event follow-up** per household+event (purpose label **Event follow-up**), not one call per child.
- [ ] Same-phone group did **not** create a second Follow-up solely because there were two registrations.
- [ ] Re-Preview shows ALREADY_PROCESSED; second Process is idempotent (no duplicate households).

**Must not happen**
- [ ] Two pending Event follow-ups for the same household+event.
- [ ] Public Event attendance treated as a Trial.

**Blocking:** Yes.

---

### EVENT-07 — Force-create vs match (if MATCH is offered)

**Starting state.** If Preview offers MATCH to an existing household.

**Steps**
1. Leave match selected once; Process.
2. On a later FRESH duplicate path, check **This is a different household — create new instead of matching.**
3. Open the new Lead.

**Expected**
- [ ] Match attaches to the existing household when chosen.
- [ ] Force-new still processes; new household shows **Possible duplicate** with a link.

**Must not happen**
- [ ] Silent identity merge when staff asked for a new household.

**Blocking:** Yes if force-new cannot keep a warning.

---

### EVENT-08 — Copy public URL layout

**Steps.** Copy public URL from the Event header.

**Expected**
- [ ] Short copied notice outside the identity/actions flex crush.
- [ ] Dialogs centered.

**Blocking:** No (same class as CAM-04).

---

## EVENT-14 — Required Event → Household → Trials → Follow-Up

**Blocking.** This path is explicitly still awaiting your browser pass.

**Purpose.** Guardian-only Event household, Add Self, two Trials, **one** open confirmation call.

**Starting state.** EVENT-06 household for Nora/Isla exists. Prefer a household that still has a pending **Event follow-up** and **no** Self line yet. If you already converted people, Process a **FRESH** child-only Event instead of reusing a closed household.

**Business rule.** Overlapping pending Event follow-up and intro confirmation are one household phone call. Scheduling a Trial retargets the Event task to **Confirm intros** (due date not reset; source event kept). Cards show purpose. Event tasks must not list later Trial times until retargeted. [[CRM]]

**Steps**
1. Open `/leads/:id` for Nora Quinn (Members tab is default).
2. Confirm header contact is Nora; members show **Isla** as Child, **no Self**.
3. Click **Add person**.
4. Confirm relationship **Self** and first/last name **Nora** / **Quinn** are prefilled. Program empty. Do not add a second phone on the line.
5. Set program **Adult BJJ**. Save the person.
6. On Nora’s member card: **Schedule trial** — pick a valid Adult BJJ slot.
7. On Isla’s card: **Schedule trial** — pick a valid Kids BJJ slot (age 8).
8. Open tab **Follow-up**. Also open `/tasks`.
9. Open **Notes & History**.

**Expected**
- [ ] Add Self used the household header name.
- [ ] Nora (Self, Adult BJJ) and Isla (Child, Kids BJJ) are distinct LeadLines.
- [ ] Each Trial belongs to that person.
- [ ] Exactly **one** pending household Follow-up after both Trials.
- [ ] Purpose is **Confirm intros** (not a leftover competing **Event follow-up** still Open).
- [ ] Confirm intros lists **both** Nora’s and Isla’s scheduled intros (names, program, Denver datetime).
- [ ] `/tasks` Work line includes purpose; Event leftover does not show Isla’s Trial time as if it were still an Event-only task.
- [ ] History is understandable: not a doubled transition. `Trial scheduled.` note may be hidden when it repeats the to-status label.

**Must not happen**
- [ ] Two open phone calls (child-only Event card **and** combo Confirm intros).
- [ ] Event follow-up card showing Trial datetimes while purpose is still Event follow-up.
- [ ] Self line with a duplicate contact phone.
- [ ] Fake parent LeadLine invented in addition to header+Self.

**Blocking:** Yes. Stop Follow-Up / E2E if this fails.

> [!failure]
> Capture household URL, both Trial times, both Follow-up cards (purpose, linked people, intros), and `/tasks` rows.

---

## LEAD — Household Leads

### LEAD-01 — Index, workspace, selector, filters

**Steps.** `/leads`. Search. Open a household. Confirm Members is default. Use Previous/Next. From the list with a status/program filter, confirm All leads restores filters. If the URL has `?line=`, that person is expanded.

**Expected**
- [ ] Header is household selector, not a second editor.
- [ ] Tabs: Members, Follow-up, Attribution, Notes & History.
- [ ] Actions: Edit household, Add person, Household workflow, Call when phone exists.

**Blocking:** No unless workspace is unusable.

---

### LEAD-02 — Guardian-only vs Self (already partly EVENT-14)

**Steps.** On a household with Self, Add person: Self is hidden or disabled with hint that Self already exists.

**Expected**
- [ ] At most one Self.
- [ ] Phone stays on the header.

**Blocking:** Yes if a second Self saves.

---

### LEAD-03 — Duplicate warning on staff create

**Steps.** `/leads/new` with phone `8015550101` (Nora’s). Submit anyway if warned.

**Expected**
- [ ] Staff possible-duplicate warning.
- [ ] New household still created (public booking never merges; staff create also does not silently merge).

**Blocking:** No.

---

### LEAD-04 — Aggregate household status matrix — FRESH household **Quinn Mix**

Create **Quinn Mix** as walk-in with three people (or add lines): Adult A, Adult B, Child C. Use offerings when converting.

| ID | Setup | Expected household badge |
|---|---|---|
| LEAD-04a | All three open (no JOINED/LOST) | **Active** |
| LEAD-04b | All JOINED | **Joined** |
| LEAD-04c | All LOST | **Lost** |
| LEAD-04d | One JOINED, one LOST, none open | **Closed · mixed outcomes** |
| LEAD-04e | JOINED + still-open person | **Active · mixed outcomes** |
| LEAD-04f | LOST + still-open person | **Active · mixed outcomes** |
| LEAD-04g | JOINED + LOST + still-open | **Active · mixed outcomes** |

**Must not happen**
- [ ] Household headline **No-show** / **Trial scheduled** / **Trial attended** when any line is JOINED or LOST (person cards may still show those operational labels).

**Rule.** Coarse aggregate. Person No-show is not the household badge. [[Decisions]] 2026-09-04.

**Blocking:** Yes for the matrix. Use **Quinn Mix**; do not smash the Nora EVENT-14 household until that path is recorded.

**List filters** on `/leads`: Active, Active · mixed outcomes, Joined, Closed · mixed outcomes, Lost — must match those headlines.

---

## TRIAL — Trials

### TRIAL-01 — Schedule / reschedule / outcomes on an open person

**Starting state.** Open (non-JOINED/LOST) Adult BJJ line.

**Steps.** Schedule trial. Reschedule to another slot. Optionally Attended (allowed before start if Settings “Authorized staff may mark Attended or No-show before the Trial scheduled start time” is on — default ON).

**Expected**
- [ ] Reschedule keeps history (old Trial cancelled, new row; pending confirmation not duplicated).
- [ ] Completing a Follow-up call does **not** change Lead/line status.

**Blocking:** Yes if reschedule overwrites the old Trial row in place.

---

### TRIAL-02 — Terminal people are not reopened by leftover Trial outcomes — BLOCKING

**Purpose.** JOINED + LOST household stays closed mixed.

**Starting state.** Build (or reuse LEAD-04d): Person A JOINED, Person B LOST, household **Closed · mixed outcomes**. Prefer leftover `SCHEDULED` Trials recorded **before** convert/lost if the UI still shows Attended/No-show on those rows. If outcome buttons are hidden because nothing is SCHEDULED, that is acceptable — then skip the leftover-outcome clicks and still verify Converted Attended on a non-SCHEDULED Trial does nothing.

**Steps**
1. On the JOINED person, if a leftover SCHEDULED Trial exists, mark **Attended** or **No-show**.
2. On the LOST person, if a leftover SCHEDULED Trial exists, mark **No-show**.
3. Confirm household badge.

**Expected**
- [ ] JOINED stays JOINED.
- [ ] LOST stays LOST.
- [ ] Trial history may update.
- [ ] Household remains **Closed · mixed outcomes**.
- [ ] Reopen only via **Reopen** (LOST) and **Reverse conversion** (JOINED), each with a note.

**Must not happen**
- [ ] LOST → No-show / open because of Trial outcome.
- [ ] Household badge falling through to **No-show**.

**Blocking:** Yes. Stop if identities reopen.

---

## FOLLOW — Follow-Up

Lead Follow-up is `/tasks` and household tab **Follow-up**. Purpose labels: **Confirm intros**, **Event follow-up**, **Follow-up call**.

### FOLLOW-01 — Trial-generated confirmation

**Starting state.** Walk-in **Wes Walker**, schedule Adult Trial (no Event).

**Expected**
- [ ] One pending **Confirm intros**, unassigned, due two weekdays later 5:00 PM Denver.
- [ ] `/tasks` views Open / Overdue / Due today / Upcoming are mutually exclusive for the same pending task.

**Must not happen**
- [ ] Same task listed as both Overdue and Due today.
- [ ] `OVERDUE` stored as a status (status stays Open).

**Blocking:** Yes.

---

### FOLLOW-02 — Event follow-up then intro (see EVENT-14)

Do not duplicate EVENT-14. If EVENT-14 passed, check here:

- [ ] EVENT-14 passed (one Confirm intros, both intros, no competing Event follow-up).

**Blocking:** Yes.

---

### FOLLOW-03 — Complete / assign / cancel / manual

**Steps.** Assign a call. Complete with outcome Reached + note. Add another call (**Add another call** / **Schedule follow-up**) as MANUAL **Follow-up call**.

**Expected**
- [ ] Completed history kept.
- [ ] A genuinely new Trial after a completed confirmation can create a new pending Confirm intros.
- [ ] VIEWER still cannot open `/tasks`.

**Blocking:** No unless complete corrupts status (that would be blocking).

---

## CONV — Conversion / Lost

### CONV-01 — Independent line convert and lost

**Starting state.** Household with two open people and offerings available.

**Steps**
1. Convert person A (select membership offering; snapshot MRR). Note on Members.
2. Mark lost person B, reason **Not interested**, note.
3. Confirm person A still JOINED.

**Expected**
- [ ] Conversion snapshot is integer cents / listed offering, not a float.
- [ ] Forecast MRR on Attribution excludes JOINED/LOST lines.
- [ ] Lost requires a reason.
- [ ] Household badge follows the LEAD-04 matrix.

**Must not happen**
- [ ] Convert on one person converting the sibling.
- [ ] Completing a phone call marking JOINED.

**Blocking:** Yes.

---

### CONV-02 — Reverse and reopen

**Steps.** Reverse conversion on A (note). Reopen B (note).

**Expected**
- [ ] History/audit kept.
- [ ] People return to open pipeline only through those actions.

**Blocking:** Yes if reverse is impossible.

---

## COMP — Attribution / Compensation

**Blocking family.** Configure Settings first.

### COMP-00 — Configure default tracked-acquisition credit owner

**Steps.** ADMIN `/settings` → **Default tracked-acquisition credit owner** → **QA Owner B** → Save.

**Expected**
- [ ] Save succeeds. Credited user shows QA Owner B.
- [ ] Description states tracking-link credit; Campaign ownership is operational only; walk-ins stay unassigned unless ADMIN assigns.

**Blocking:** Yes for the rest of COMP.

---

### COMP-01 — Generated tracking link credits Settings user, not Campaign owner — FRESH

**Starting state.** **QA M9 Camp** Active, owner **QA Owner A**, Settings owner **QA Owner B**.

**Steps**
1. Copy default tracking link (Active: no “not Active yet” confirm, or confirm if still shown).
2. Open the URL (incognito). Book `/trial` as **Pat Tracked**, Adult BJJ, phone `8015550188`.
3. Open the household → Members person details (compensation block) and Attribution tab.

**Expected**
- [ ] Campaign still owned by QA Owner A.
- [ ] Attribution credits **QA Owner B**, origin **SYSTEM**, method tracking-link/campaign as implemented.
- [ ] Campaign owner A is not the credited user.

**Must not happen**
- [ ] Credit to Campaign owner A because they own the Campaign.

**Rule.** [[Decisions]] 2026-09-04 tracked-acquisition owner.

**Blocking:** Yes.

---

### COMP-02 — Walk-in without generated link stays Unassigned

**Steps.** `/leads/new` **Wes Walker** (or existing), source Walk-in, no tracking code. Open compensation on the line.

**Expected**
- [ ] Credited user Unassigned / eligibility UNASSIGNED until ADMIN assigns.

**Must not happen**
- [ ] Credit to Campaign owner or Follow-up assignee.

**Blocking:** Yes.

---

### COMP-03 — Follow-up assignee is not credit

**Steps.** Assign EVENT-14 or FOLLOW-01 call to QA Owner A. Do not convert yet. Check attribution.

**Expected**
- [ ] Assignee change does not set credited user.

**Blocking:** Yes if it does.

---

### COMP-04 — Manual ADMIN correction

**Steps.** On a line, set credited user, eligibility ELIGIBLE, reason at least 3 characters (**Explain this assignment in a few words.**). **Save compensation**. Confirm history row.

**Expected**
- [ ] Origin MANUAL. History listed.
- [ ] Reason shorter than 3 characters is rejected with that copy, not a raw Zod dump.

**Blocking:** No unless correction is impossible.

---

### COMP-05 — Join snapshots earned credit; later owner change does not rewrite

**Steps**
1. Convert the tracked Pat Tracked line while credited to QA Owner B.
2. Change Campaign owner to someone else; optionally change Settings owner.
3. Open `/marketing/compensation` ledger (ADMIN or reports+compensation rights).

**Expected**
- [ ] Earned row credits QA Owner B at join; amount from snapshot, not live catalog.
- [ ] Changing Campaign owner does not rewrite that earned row.
- [ ] Ledger is not on `/dashboard`.

**Note.** Historical SYSTEM rows from **before** the Settings rule may still name a Campaign owner. Backfill is **optional**; do not fail COMP-05 for old rows. Record them under deferred.

**Blocking:** Yes if new joins still follow Campaign owner.

---

## UX — UI/UX / Responsive

Walk **Campaign, Event, Lead, Content, Marketing Task** record screens. Check each box per surface if useful; otherwise note exceptions under Defects (Cosmetic).

### UX-01 — Visual hierarchy

- [ ] Page → section → subsection → record is obvious (`AppFieldGroup`, not one wall of fields).
- [ ] Related fields sit together; secondary metadata recedes.
- [ ] Records in lists are distinguishable (`.record-list` / roster).
- [ ] Selector looks like a control; selected record is clear; Previous/Next is secondary.
- [ ] Nested cards/borders are not excessive.
- [ ] Semantic color is for meaning (status/danger), not decoration.

**Blocking:** No. Continue.

### UX-02 — Dialogs and immediate-save

- [ ] `AppConfirm` centered (Campaign copy, Event process, destructive confirms).
- [ ] Event Roster Attendance/Exclude Saving/Saved.

**Blocking:** No unless unusable.

### UX-03 — Widths

At ~1440, ~1280, ~768, ~390:

- [ ] Rail/menu usable (phone: Menu).
- [ ] Long tracking URLs do not destroy headers.
- [ ] Tables/roster can scroll rather than overflow the viewport destructively.

**Blocking:** No. Separate cosmetic vs workflow.

---

## E2E — Cross-module end-to-end

### E2E-01 — Fresh tracked acquisition through join — FRESH — BLOCKING

**Starting state.** COMP-00 done. **QA M9 Camp** Active, owner A, Settings credit B. New person **E2E Riley** (do not reuse converted Pat).

**Steps**
1. Copy **QA M9 Camp** default tracking link.
2. Incognito: open the link → `/trial` → book E2E Riley, Adult BJJ, unique phone `8015550177`.
3. Sign in ADMIN. Open the household from `/leads` (filter campaign if needed).
4. Confirm Campaign link on Attribution; compensation SYSTEM → QA Owner B.
5. Confirm **Confirm intros** Follow-up exists; complete it (Reached) — status must stay Trial scheduled / Active, not Joined.
6. Mark Trial **Attended**.
7. **Convert** with an offering.
8. Open `/marketing/campaigns/:id` household list and `/marketing/compensation`.
9. Optional: Marketing hub Campaign outcomes still distinguish Meta-reported vs internal vs attributed.

**Expected**
- [ ] One household, one Adult LeadLine, one attended Trial, JOINED, household **Joined** (single person).
- [ ] Follow-up completion did not convert.
- [ ] Credit QA Owner B on attribution and earned ledger.
- [ ] Campaign workspace shows the household; `/leads?campaignId=` lists it.
- [ ] This is one acquisition system, not disconnected modules.

**Must not happen**
- [ ] Credit to Campaign owner A.
- [ ] Second household from the same tracking retry with the same submission (retry identity is the opaque key; a **new** browser book is a new household — that is allowed).

**Blocking:** Yes.

---

## Defects Found

### BUG-M9-___ — Short title

**Test:**  
**Severity:** Blocking / Major / Minor / Cosmetic  
**Route:**  
**Record(s):**  

**Expected:**  

**Actual:**  

**Reproduction:**
1.
2.
3.

**Evidence:**
- Screenshot:
- Console/error:
- Notes:

**Status:** Open

---

## When to stop vs continue

### Stop testing immediately when

- Data integrity is at risk (duplicate households from a single Process, merged identities without staff choice)
- Lifecycle transition corrupts state (JOINED/LOST reopened by Trial outcome)
- Authorization is bypassed (VIEWER or STAFF-none reaches Marketing/CRM writes)
- Processing destructively mutates/duplicates records
- Continuing would contaminate later tests (destroy the EVENT-14 household before that test is recorded)

### Continue and record when

- Cosmetic/layout issue
- Copy problem
- Isolated convenience/navigation issue
- Defect does not contaminate later state

---

## Product Decision Pending

Do **not** grade pass/fail. Do **not** answer here.

### PD-01 — Public Event consent checkboxes

**Current behavior.** `/events/:slug` has **no** SMS/email consent checkboxes. Public `/trial` has “It’s ok to text or call me about this intro.” / email. Staff `/leads/new` has “OK to text or call” / “OK to email”. Schema still stores `smsConsent` / `emailConsent` only.

**Decision needed.** Should public Event registration include consent checkboxes?

**Not undecided (already locked):** household coarse status; Content at most one Campaign; public Event duplicate warning stays staff-only.

---

## Final M9 Acceptance Gate

### Blocking acceptance

- [ ] Permissions pass completed
- [ ] Event → Household → Adult + Child Trials → one Follow-Up path passed
- [ ] Default tracked-acquisition credit owner configured
- [ ] Generated-link compensation attribution passed
- [ ] Terminal LeadLine regression passed
- [ ] Aggregate Household status scenarios passed
- [ ] Event duplicate workflow passed
- [ ] Cross-module end-to-end scenario passed
- [ ] No unresolved data-integrity defects
- [ ] No unresolved authorization defects
- [ ] All blocking defects resolved

### Final review

- [ ] Campaign workflow accepted
- [ ] Content workflow accepted
- [ ] Marketing Tasks workflow accepted
- [ ] Assets workflow accepted
- [ ] Event workflow accepted
- [ ] Household Lead workflow accepted
- [ ] Trial workflow accepted
- [ ] Follow-Up workflow accepted
- [ ] Conversion/Lost workflow accepted
- [ ] Attribution/Compensation workflow accepted
- [ ] UI/UX accepted
- [ ] Deferred items documented

## Scott's M9 Decision

- [ ] ACCEPT M9
- [ ] DO NOT ACCEPT M9

**Date:**

**Blocking issues remaining:**

**Deferred non-blocking issues:**

**Product decisions remaining:**

**Notes:**
