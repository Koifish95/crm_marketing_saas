---
type: note
status: current
area: process
updated: 2026-09-01
tags:
  - m8
  - audit
  - ux
---

# M8 post-household UX audit

Discussion backlog after the `/trial` and Lead-detail correction. **Do not treat this as an implementation prompt.** Scott and ChatGPT should pick items one by one.

Inspection method: repository/code review of every reachable page plus the APIs those pages call. Browser tooling was not available; rendered behavior is inferred from Vue templates and server payloads. Representative mixed household used as the stress test: Matt (SELF, Adult, Converted), Sam (CHILD, Kids, Lost), Jane (CHILD, Kids, Trial scheduled).

```text
Total issues found: 16
Critical: 0
High: 6
Medium: 7
Low: 3

Recommended blockers before M8 acceptance:
1. UX-01 — Done in code — /leads list and Pipeline are household-oriented. Still needs Scott browser acceptance.
2. UX-02 — Staff “New lead” is still the old one-person / participant_* form.
3. UX-03 + UX-04 — Dashboard upcoming intros and the Follow-up queue name the contact, not the person who is actually on the calendar. Dashboard “Pipeline by status” (UX-05 remainder) still counts header statuses.

Recommended discussion order:
1. Leads list / pipeline (UX-01, UX-05)
2. Staff new-household form (UX-02)
3. Follow-up and dashboard identity (UX-03, UX-04, UX-06)
4. Reports program filter vs household counts (UX-07)
5. Campaigns / Catalog / Meta discussion (UX-10, UX-11, UX-12)
6. Terminology and leftover compatibility (UX-08, UX-09, UX-13–UX-16)
```

Known `/trial` and Lead-detail defects from the correction prompt were already implemented on `27c5eb3`. They are not re-listed as open product defects.

------------------------------------------------------------------------

## Leads list / pipeline

### UX-01

- **Status:** implemented in code (browser acceptance outstanding)
- **Screen / workflow:** `/leads` list and Pipeline board
- **Severity:** High
- **Current behavior:** Each row is one LeadHeader. Contact, prospect count, distinct programs, derived `householdDisplayStatus`, earliest future intro (with person name when the household has more than one line). Pipeline columns include Active/Closed mixed outcomes.
- **Why it conflicts:** (was) A Matt/Sam household appeared as “Trial attended” from leftover header status.
- **Recommended direction:** Show household contact plus a compact people summary (count, mixed outcomes, programs). Drive list/board columns from line outcomes or a derived household badge (`householdDisplayStatus`), not header JOINED/LOST. “Next intro” should name the person.
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/leads/index.vue`, `server/services/leads.ts` (`listLeads`), `shared/utils/labels.ts`

### UX-05

- **Status:** partial — `/leads` filters now use derived household status and any-line program. Dashboard `byStatus` still counts header statuses.
- **Screen / workflow:** `/leads` filters; Dashboard “Pipeline by status”
- **Severity:** High
- **Current behavior:** Leads list/Pipeline use `householdDisplayStatus` and LeadLine programs. Dashboard `byStatus` still counts headers.
- **Why it conflicts:** Dashboard pipeline can still present header JOINED/LOST / Trial attended as if they were household outcomes.
- **Recommended direction:** Filter people by line program/status; keep a household filter only for contact/source/campaign. Dashboard pipeline should not present header JOINED/LOST as if they were member outcomes.
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/leads/index.vue`, `app/pages/dashboard.vue`, `server/services/leads.ts` (`listLeads`, `dashboardStats`)

### UX-08

- **Status:** implemented in code
- **Screen / workflow:** `/leads` search
- **Severity:** Medium
- **Current behavior:** Search matches header name/phone/email, leftover `participantFirstName`, and `lead_lines` first/last name.
- **Why it conflicts:** (was) Searching “Sam” missed a child who only exists as a line.
- **Recommended direction:** Search line names as well as contact fields. Stop treating `participant_*` as the kids search index.
- **Whether it is:** desirable before M9
- **Files:** `server/services/leads.ts` (`listLeads`)

------------------------------------------------------------------------

## New lead (staff)

### UX-02

- **Screen / workflow:** `/leads/new`
- **Severity:** High
- **Current behavior:** One contact, one Program, optional kids `participant_*` block (“Contact is the parent/guardian. Participant is the child.”). Cannot add father + son in one create. Experience and program sit on the header.
- **Why it conflicts:** This is the same old “one Lead = one person/program” model that public `/trial` just left. Walk-in families must be created wrong, then repaired with Add person on detail.
- **Recommended direction:** Mirror public booking: household contact, then one or more prospective members with independent programs. Keep source/campaign on the header only.
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/leads/new.vue`, `shared/schemas/lead.ts`, `server/services/leads.ts` (`createLead`)

------------------------------------------------------------------------

## Dashboard

### UX-03

- **Screen / workflow:** Dashboard → Upcoming intros
- **Severity:** High
- **Current behavior:** Name is `personName(trial.lead)` from the header join. Empty copy: “the prospect’s name.” Query does not select the LeadLine.
- **Why it conflicts:** Jane’s Wednesday kids class shows as “Matt Smith.” Staff cannot tell who is walking in.
- **Recommended direction:** Show the line person, relationship, and program; keep household contact secondary (phone).
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/dashboard.vue`, `server/services/leads.ts` (`dashboardStats`)

### UX-09

- **Screen / workflow:** Dashboard conversion card
- **Severity:** Medium
- **Current behavior:** Top cards correctly split Households vs Prospective members vs unique attended people. Conversion hint for non-financial roles is “New members this month.”
- **Why it conflicts:** “Members” implies gym membership, not per-line Conversion snapshots. VIEWER still sees header-status pipeline counts (UX-05).
- **Recommended direction:** Hint “People converted this month.” Keep financial MRR labeled forecasted.
- **Whether it is:** desirable before M9
- **Files:** `app/pages/dashboard.vue`

------------------------------------------------------------------------

## Follow-up

### UX-04

- **Screen / workflow:** `/tasks` queue
- **Severity:** High
- **Current behavior:** Title is the household contact. Trial label is class/date. `listFollowUpTasks` does not load `lineLinks`. Copy: “Call prospects who scheduled an intro.”
- **Why it conflicts:** A call about Sam’s intro is listed as Matt. Staff open the household to find out who. Lead detail already shows linked people; the queue does not.
- **Recommended direction:** Show linked prospective member(s) and keep the contact/phone for dialing. Load `lineLinks` on the queue API.
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/tasks.vue`, `server/services/follow-up.ts` (`taskWith` / `listFollowUpTasks`)

### UX-06

- **Screen / workflow:** Follow-up created by public household booking
- **Severity:** Medium
- **Current behavior:** Each scheduled Trial still gets its own pending `INITIAL_SCHEDULE` call (M5 rule). A parent + two children produces three tasks to the same phone.
- **Why it conflicts:** Household follow-up is supposed to be one relationship. Three identical “confirm the intro” calls is awkward staff behavior, even if each trial is distinct.
- **Recommended direction:** Discuss one household confirmation call with line links vs keep per-trial tasks and make the queue disclose each person (UX-04). Do not silently change M5 idempotency.
- **Whether it is:** desirable before M9 (product rule, not a visual tweak)
- **Files:** `server/services/follow-up.ts` (`ensureInitialFollowUpTask`), `server/services/public-trial.ts`

------------------------------------------------------------------------

## Reports

Reports already distinguish households vs unique people, conversions vs snapshots, and forecasted MRR vs cash. Layout is a metrics dump more than a gym-owner narrative. Do not redesign in this pass.

### UX-07

- **Screen / workflow:** `/reports` program filter
- **Severity:** High
- **Current behavior:** Households are headers in range (source/campaign only). Prospective members / funnel / conversions filter by **line** `programId`. The same Adult filter therefore compares “all households this month” to “Adult people this month.”
- **Why it conflicts:** Staff will read the top four cards as one funnel. They are different populations once a program is selected. A mixed Adult+Kids household still increments Households under an Adult filter.
- **Recommended direction:** Either (a) also restrict households to those with ≥1 matching line, and label that, or (b) disable/hide Households when a program filter is on. Document the formula on the card.
- **Whether it is:** required before M8 acceptance
- **Files:** `app/pages/reports/index.vue`, `server/services/reports.ts` (`headerMatches` vs `cohortLines`)

### UX-10

- **Screen / workflow:** `/reports` labels, CSV, timing
- **Severity:** Medium
- **Current behavior:** Hints say “Lead headers” / “Unique LeadLines.” CSV kind `leads` is people-with-household columns (`householdName`, `person`, `relationship`). `timeToConversion` is household createdAt → conversion joinedAt. Meta table shows mapped **households** vs Meta spend; CSV still has `metaLeads`.
- **Why it conflicts:** Internal jargon on a staff screen. CSV filename/kind “leads” vs columns that are people. Timing is household-clock even when conversion is per person (usually acceptable, but not labeled). Meta “leads” vs CRM households can be misread as the same thing.
- **Recommended direction:** Staff copy: households / people. CSV kind `people` or keep `leads` with a visible column legend. Label timing as inquiry (household) → person conversion. Keep Meta-reported leads separate from mapped households (already mostly true in the table).
- **Whether it is:** desirable before M9
- **Files:** `app/pages/reports/index.vue`, `server/services/reports.ts`

**Reports discussion answers (no redesign):**

- Household vs person metrics: differentiated in copy and formulas; broken when program filter is on (UX-07).
- Labels vs formulas: formulas in `REPORT_FORMULAS` are correct; UI still says LeadHeader/LeadLine.
- Conversions: line/person based in data; “Joined in this date range” is clear enough.
- Forecasted MRR: labeled “not cash” for ADMIN.
- Filters/CSV: source/campaign are header-level (correct). Program filter is the problem. CSV people export is actually well-shaped.
- Layout: useful as an audit table, not as a weekly gym narrative — defer.

------------------------------------------------------------------------

## Catalog

### UX-11

- **Screen / workflow:** `/settings/catalog`
- **Severity:** Medium
- **Current behavior:** One long page: programs, sources, lost reasons, offerings, household first/additional prices. Copy correctly says forecasted value, lost is per prospective member, line overrides replace a person. Inactive programs “stay on history.”
- **Why it conflicts:** Understandable to the implementer; heavy for a non-developer gym owner. “First member / additional member” is household-correct but easy to confuse with “first month vs additional month.” Offerings vs household rules vs line override is three pricing layers with little worked example.
- **Recommended direction:** Keep the model. Add a short example (“Dad Adult $175, second Adult $155, child uses Kids offering”). Confirm inactive = hidden from new conversion pickers. Do not split into a new IA unless Scott wants it.
- **Whether it is:** desirable before M9
- **Files:** `app/pages/settings/catalog.vue`

**Catalog discussion answers:** Programs / offerings / household pricing / lost reasons / sources are present. Active/inactive exists. Safety of editing prices is “type dollars, save” with no preview of which open lines would change forecast. That last point is Medium operational risk, same item.

------------------------------------------------------------------------

## Campaigns

### UX-12

- **Screen / workflow:** `/settings/campaigns` and public `/trial?c=`
- **Severity:** Medium
- **Current behavior:** Copy is strong: marketing effort, default reusable link, do not invent Facebook vs Instagram from one link, planned budget ≠ Meta spend. Create flow is name / organic|paid / budget. Extra links are a secondary “add” on the card.
- **Why it conflicts:** Nowhere does it say attribution lands on the **household**, not each person. Staff can still think a tracking link “belongs” to the adult vs the child. Organic vs paid is a dropdown with no one-line definition.
- **Recommended direction:** One sentence: “Attribution is stored on the household we call, not on each prospective member.” Keep extra links secondary (already).
- **Whether it is:** desirable before M9
- **Files:** `app/pages/settings/campaigns.vue`, `app/pages/trial.vue` (no campaign copy on the public form — OK)

**Campaigns discussion answers:** Campaign ≠ social post (good). Default link is the obvious action (copy). Extra links are not the create-time default (good). Organic vs paid is labeled, not explained. Budget vs spend is distinguished.

------------------------------------------------------------------------

## Meta

### UX-16

- **Screen / workflow:** `/settings/meta` and Reports Meta panel
- **Severity:** Low
- **Current behavior:** Header says read-only, explicit map, names never auto-matched. Stats show Configured vs not, Graph version, `ads_read`. Empty state mentions missing credentials/fixtures. Reports keep Meta spend vs mapped households/MRR separate.
- **Why it conflicts:** Sync button is disabled when unconfigured (good) but “Stored campaigns” can still look like live ads access after a fixture/test sync. CSV `metaLeads` vs UI “Households” (UX-10). No in-product banner that live `ads_read` on the gym ad account is unverified.
- **Recommended direction:** If `configured === false`, keep the current empty/disabled treatment. If configured but never successfully synced against production, a persistent “not verified live” note. Align CSV header with Households.
- **Whether it is:** safe to defer (already documented in the V2 handoff)
- **Files:** `app/pages/settings/meta.vue`, `app/pages/reports/index.vue`

**Meta discussion answers:** Read-only is obvious in the page description. Connection/sync/mapping states exist. Internal map is distinct from Meta’s ad-set/ad hierarchy. Metrics are separated. It does not loudly imply live access when env is missing; it is quieter when env exists but has never been proven.

------------------------------------------------------------------------

## Public landing

### UX-13

- **Screen / workflow:** `/`
- **Severity:** Low
- **Current behavior:** “Adult and kids intros. No experience required.”
- **Why it conflicts:** Does not mention booking more than one family member, which is now the public product.
- **Recommended direction:** “Book for yourself, a child, or the family.”
- **Whether it is:** safe to defer
- **Files:** `app/pages/index.vue`

------------------------------------------------------------------------

## Navigation / terminology

### UX-14

- **Screen / workflow:** Staff nav (`internal` layout)
- **Severity:** Low
- **Current behavior:** Item labeled **Leads**. Gym staff may still say “lead.”
- **Why it conflicts:** After the model change, “Leads” is the household list. Not wrong, but the list UI (UX-01) does not explain that.
- **Recommended direction:** Keep “Leads” if Scott wants gym language; otherwise “Households.” Either way, the list must show people (UX-01). Do not rename routes in this audit.
- **Whether it is:** safe to defer
- **Files:** `app/layouts/internal.vue`

------------------------------------------------------------------------

## Lead detail leftovers (already corrected screen)

### UX-15

- **Screen / workflow:** `/leads/:id`
- **Severity:** Medium
- **Current behavior:** Correction landed: household header, member cards, focused detail, forecast, household follow-up/notes. Remaining: **Household workflow** still offers JOINED + monthly rate for single-line compatibility; contact save still PATCHes `participant_*`; header actions are Edit / Add person / Household workflow — **Add follow-up** is only in the lower section (the correction mock had it in the header).
- **Why it conflicts:** Compatibility JOINED is demoted but still present. `participant_*` on save can drift from lines. Follow-up add is easy to miss on mobile after a long member list.
- **Recommended direction:** Keep single-line JOINED behind workflow. Stop writing `participant_*` from the contact form. Optional: header “Add follow-up” that scrolls to the household follow-up panel.
- **Whether it is:** desirable before M9 (not a blocker; correction already usable)
- **Files:** `app/pages/leads/[id].vue`

------------------------------------------------------------------------

## Reviewed — no household-model correction recommended

These screens were inspected. They do not encode “Lead = one person” in a way that needs a product change for M8:

- **Login** (`/login`) — staff identity only.
- **Account** (`/account`, `/account/password`) — user profile.
- **Users** (`/users`) — ADMIN user admin.
- **Security activity** (`/security`) — auth audit log.
- **Intro schedule** (`/settings/intro-availability`) — recurring class rules by program/age. Correctly not household-shaped.
- **Public `/trial`** — already corrected this pass (one person vs family; per-person program/slot; household confirmation).
- **Auth layout / forced password** — no CRM entity model.

------------------------------------------------------------------------

## Explicit non-implementation

No newly discovered items above were implemented. Reports, Catalog, Campaigns, and Meta were reviewed for discussion only.
