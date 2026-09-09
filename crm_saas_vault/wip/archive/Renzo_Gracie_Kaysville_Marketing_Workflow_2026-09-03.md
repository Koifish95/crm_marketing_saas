---
type: note
status: draft
area: operations
updated: 2026-09-03
tags:
  - m9
  - marketing
  - workflow
---

# Marketing workflow

How internal Marketing is meant to be used at Renzo Gracie Kaysville: what each screen is for, how records attach, and a worked example.

This is an operations note, not the implementation map. Domain terms: [[Domain-Model]]. Household CRM after a lead exists: [[CRM]]. Click-by-click staff steps: [[wip/Renzo_Gracie_Kaysville_Staff_Training_Guide_V1]]. Architect evidence: [[wip/M9_Implementation_Handoff_2026-09-02]].

The app does not post to Meta, send SMS/email, or replace the acquisition Dashboard. Marketing **feeds** Leads / Trials / Follow-up / Join.

---

## Start here

Open **Marketing** (`/marketing`). You need Access Right `VIEW_MARKETING` (ADMIN always has every right). STAFF starts with none until ADMIN assigns a User Role.

The campaign is the hub. Create that first when the work is a real initiative. Then attach tasks, content, assets, or events. Share a **tracking link** (or process an event) so households show up in CRM with that campaign stamped on them.

```text
Campaign (plan)
  ├─ Tracking links  →  /trial or /events/:slug  →  Household (LeadHeader)
  ├─ Marketing Tasks (creative / ops work — not phone calls)
  ├─ Content (caption / approval / “I posted this”)
  ├─ Assets (files + can-we-use-this)
  └─ Acquisition Events  →  public signup  →  batch process  →  Household
        └─ Compensation credit is per person (LeadLine), not the household
```

Do not create a Campaign for a one-off story that you are not trying to measure.

---

## How the pieces link

| Record | Attaches to | Becomes a household when |
|---|---|---|
| Tracking link | Campaign | Someone submits `/trial` (or staff picks the campaign on New lead) **and** the campaign is **Active** |
| Event registration | Event (optional campaign on the event) | Staff runs **Process registrations** — not at signup |
| Content / Asset / Marketing Task | Optional campaign | Never by themselves |
| Follow-up phone call | Household | Already a household; this is CRM, not Marketing |
| Compensation | Prospective member (LeadLine) | Credit can follow the campaign/link/event; it is **not** the same field as household source |

**First-touch acquisition** lives on the household: campaign name, tracking link, UTM. That is what you see under Source on the lead.

**Compensation attribution** lives on each person. It can name a campaign as evidence. Correcting pay credit does not rewrite the household campaign.

### Clicking between them

- Lead → campaign: campaign name under Source (and compensation “evidence campaign” when present) opens that campaign card. Needs Marketing access.
- Campaign → leads: each campaign lists attributed households. The name opens the household; **N households** opens Leads already filtered to that campaign (`/leads?campaignId=`).
- Content, Assets, Events, and Marketing Tasks that name a campaign also link back to that card.
- Marketing hub **Campaign outcomes** names also jump to that campaign.

---

## What each section contains

### Marketing hub — `/marketing`

Command center. Not a copy of Dashboard.

Shows overdue/soon Marketing Tasks, content that needs assets/review/publish, active campaigns, upcoming events, and campaign outcomes. Outcome numbers are labeled:

- **Meta-reported** — spend from a mapped Meta campaign (ADMIN maps ids at `/settings/meta`; names are never auto-matched).
- **Internal CRM** — event registration counts and similar operational rows.
- **Deterministically attributed** — households/people whose LeadHeader campaign is this campaign.

Use it to see what is stuck. Do the work on the child pages.

### Campaigns — `/marketing/campaigns`

A **business initiative**, not a Meta Ads object. Organic with `$0` planned budget is valid.

Contains:

- Lifecycle: Draft → Planned → **Active** → Completed or Cancelled. `active` is synced from Active so tracking resolve stays compatible.
- Owner, collaborators, programs, planned vs actual dates, objective/offer/audience notes.
- **Default tracking link** (created with the campaign) plus optional extra links (flyer, QR, event path).
- Destination defaults to `/trial`. An extra link may be `/events/:slug`.
- **Households from this campaign** — first-touch list with links into CRM.

Writes need `MANAGE_CAMPAIGNS`. `/settings/campaigns` redirects here.

**Attribution rule:** a tracking code or `?campaign=slug` only stamps a new household while the campaign is **Active**. Draft/Planned links will not attach.

### Marketing Tasks — `/marketing/tasks`

Creative and marketing-ops queue. Types include copy, design, asset request, publish, event prep.

Optional links: campaign, content, asset, event. Overdue / due today / upcoming use America/Denver, same idea as Follow-up buckets, **different table**.

**Not** Lead Follow-up. Phone calls after a Trial or processed event stay on **Follow-up** (`/tasks`). Completing a Marketing Task does not call a family.

### Content — `/marketing/content`

Plan a post: title, body, optional campaign, optional approval, assigned publisher, planned manual publish time.

Statuses move through idea → needs assets → draft → needs review → approved → ready to publish → published (or cancelled). There is no `SCHEDULED` status and **no Meta publish**. After you post on Facebook/Instagram yourself, record the public URL.

`DO_NOT_USE` assets attached to the item can block ready-to-publish. Restricted assets warn.

### Assets — `/marketing/assets`

Files on disk (`data/uploads/`), not a DAM or public CDN. Metadata in SQLite. Authenticated download.

Marketing-use: Unknown / Approved / Restricted / Do not use. Restricted requires a note. Do not use blocks publication. This is operational hygiene, **not** a legal consent ledger.

Attach to a campaign or content item when the file belongs to that work.

### Acquisition Events — `/marketing/events` and `/marketing/events/:id`

Open houses, clinics, kids nights. Public page: `/events/:slug`.

Contains sessions, custom questions, registration window, roster attendance (`REGISTERED` / `ATTENDED` / `NO_SHOW` / `CANCELLED`), optional campaign.

**Binding rule:** public or staff registration creates Event rows only. Households appear after `PROCESS_EVENT_REGISTRATIONS`: preview, then execute. Default includes attended and no-show; cancelled stays out unless you include them. Ambiguous phone/email matches must be chosen explicitly — no silent merge. One household `EVENT_FOLLOW_UP` call per event, not a Marketing Task.

Event attendance is not Trial attendance. You may still schedule an intro later.

### Compensation — `/marketing/compensation`

Ledger of **earned** snapshots when a credited person Joins. Seed is 50% of monthly (configurable; later setting changes do not rewrite old rows). Payment Unpaid / Paid. Not accounting. Not on Dashboard.

Assign or correct credit on the person on Lead Detail (`MANAGE_COMPENSATION_ATTRIBUTION`). Staff/offline leads stay unassigned until someone sets credit with a reason.

### Adjacent CRM (not Marketing, but the other end of the link)

| Screen | Role |
|---|---|
| `/leads` and `/leads/:id` | Households. Filter by campaign. Campaign name links back when you have Marketing access. |
| `/leads/new` | Walk-in / phone inquiry; optional campaign pick (same first-touch field). |
| `/tasks` | Confirmation and event follow-up **phone calls**. |
| `/reports` | Funnel and campaign rollups. |
| `/settings/meta` | ADMIN: read-only Meta sync and explicit campaign id map. |

---

## Best practices

1. **One campaign per initiative**, not per post and not per Meta ad. Extra tracking links are how you tell flyer vs Instagram vs open-house QR apart without forking the plan.
2. **Activate before you share.** Draft is for planning copy and collaborators. If the link is already on a poster, the campaign must be Active or new signups will not attach.
3. **Leave spontaneous posts untracked** unless you actually want them in outcomes. Empty campaign on a walk-in is fine.
4. **Copy the generated link.** Do not rebuild UTM by hand. The `c=` code is what resolves the campaign.
5. **Keep Follow-up and Marketing Tasks separate.** Call the family from Follow-up. Make the graphic from Marketing Tasks.
6. **Kids households:** the guardian is the header; the child is a person line. The campaign stamps the household (who we contact), not a fake parent prospect.
7. **Events:** close the roster, mark attendance, then process. Do not expect a public signup to appear under Leads the same minute.
8. **Do not treat Meta spend as CRM outcomes** until ADMIN maps the internal campaign to a Meta campaign id. Unmapped paid campaigns show “Not mapped.”
9. **Do not use Restricted / Do not use as a joke label.** Restricted needs a real note. Do not use will block publish-ready content.
10. **Pay credit is per person.** Collaborator on a campaign is “who is helping,” not payroll. Completing a phone call does not move compensation to you.

---

## Example — September Kids Trial Push

Scott wants two weeks of organic Instagram plus a Saturday kids open house, all counted as one initiative.

### 1. Create the campaign

Marketing → Campaigns → **September Kids Trial Push**.

- Kind: Organic. Planned budget: `$0`.
- Status: Draft while Marta writes the caption and Pedro finds photos.
- Owner: Scott. Collaborators: Marta, Pedro.
- Program: Kids BJJ.

Save. A **Default** tracking link to `/trial` already exists. Do not share it yet.

### 2. Attach the work

- **Asset:** upload the gym floor photo. Mark **Approved** for marketing (or Restricted with “blur the kids in the back” if needed).
- **Content:** “September kids trial — caption.” Attach the campaign. Approval required. Status: needs review until Scott approves, then ready to publish. Marta posts on Instagram **by hand**, then records the public URL.
- **Marketing Task:** “Post kids reel Friday.” Assign Marta, due Thursday 5:00 PM Denver, linked to that content + campaign.
- **Event:** “Kids Open House — Sep 13.” Attach the same campaign. Add a Saturday morning session. Publish. Public URL is `/events/kids-open-house`.
- Extra tracking link on the campaign: label **Open house flyer**, destination `/events/kids-open-house`. Print that QR on the flyer. Keep the Default link for the Instagram bio.

### 3. Go live

Set the campaign to **Active**. Put the Default link in the Instagram bio. Put the flyer QR at the front desk.

### 4. What happens when people respond

**Instagram bio (Default → `/trial`):** a parent books a kids intro. The app creates a household (guardian on the header, child as a Kids BJJ line), a Trial, and a confirmation **Follow-up** call. Source shows **September Kids Trial Push**. That name is a link back to the campaign. On the campaign card, “Jordan (parent)” appears under **Households from this campaign**.

**Flyer QR (extra link → event):** they register for the open house only. They are **not** a lead yet. After Saturday, Pedro marks attendance and runs Process registrations. Households appear (matched by phone/email if they already exist — ambiguous matches he must pick). One `EVENT_FOLLOW_UP` call per family. The campaign still stamps new households that did not already have first-touch attribution.

### 5. After someone joins

Convert the **child** line, not the household. If credit is eligible, a compensation snapshot lands on **Marketing → Compensation**. Household campaign stays “September Kids Trial Push.” If credit was wrong, correct it on the person with a reason; history keeps the old row.

### 6. Close the loop

When the two weeks are done, set the campaign to **Completed**. Tracking stops attaching new signups. The household list and reports keep what already happened. If this was paid later, ADMIN maps the Meta campaign id on Settings → Meta so spend can sit next to attributed joins without pretending they are the same number.

---

## What this is not

- Not a social media manager. Publication records are “we posted,” not a scheduler.
- Not gym membership software. Join is the acquisition boundary.
- Not payroll or QuickBooks.
- Not automatic Meta campaign matching. Map by id or leave it unmapped.
- Not a reason to duplicate the Lead Follow-up queue inside Marketing.
