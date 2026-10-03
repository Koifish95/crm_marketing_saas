---
type: note
status: current
area: operations
updated: 2026-10-02
aliases:
  - Nuxxion First Outreach Playbook
tags:
  - saas
  - sales
  - outreach
---

# Nuxxion First Outreach Playbook

This is the cockpit for the first real outbound experiment. Sales at http://localhost:5040 is the operational record. This note is the checklist and the learning log.

> [!warning]
> The desk can send. It will not send until the mailbox, postal address, and templates are saved, and it will not send more than the daily cap. Approve the three templates in Sales settings before you connect a mailbox.

## What we have built

The laptop can already do this:

```text
OpenStreetMap discovery
→ Prospect Pool
→ enrichment
→ human review
→ promotion
→ Company
→ Contact
→ Opportunity
→ Activities
→ follow-up
→ demo
→ proposal
→ Won / Lost
```

You review a discovered academy, decide to pursue it, and the Sales app creates the company, contact, and working opportunity. You send the email from your own mailbox. You record what you did in Sales.

## What the desk does

Open http://localhost:5040/prospects (or the port Sales actually bound). The home screen shows Stored, Ready, Sending today, and Needs you. Discovery runs one practice state at a time and keeps Utah and the bordering states out of the queue. Settings live at `/settings/prospects`.

Sending uses one mailbox, a Denver weekday window, and a default cap of 5. Three touches, then stop. A human reply waits in Needs you. The product does not answer it. Promote still does not send mail and does not provision a customer.

## What it does not do

It does not:

- send a custom reply
- follow up because an email was opened
- provision a customer when you mark Won
- pull every state in one run
- score academies or scrape social networks

## Where things live

```text
LOCAL PC
Prospect discovery
        ↓
Prospect Pool
        ↓
You review
        ↓
Sales CRM
        ↓
You send email from your mailbox
        ↓
Activities / follow-up
        ↓
Demo
        ↓
Proposal
        ↓
Won

VPS
Control Plane
        ↓
Customer
        ↓
Martial Arts PROD
        ↓
DNS / TLS / backup
```

Sales and the prospect pool run on this PC. The database is `sales_template/data/app.sqlite`. That file is not in Git. The code is in Git. A daily local backup protects the database. Customer production stays on the VPS. The Control Plane does not list these academies.

Open the app: http://localhost:5040. If it does not load, from `sales_template/` run `pnpm dev`. Sign in with the admin user in `sales_template/.env`.

> [!info]- Backup
> From `sales_template/`, `pnpm backup:local` writes a snapshot to `data/backups/`. Task Scheduler task **Nuxxion Sales local backup** runs that daily at 2:00 AM local time. It does not email anyone and it does not replace the live database. This is not the VPS customer backup. See [[history/WO-2026-09-27-sales-local-backup-return]].

## Current prospect pool

Taken 2026-09-27, 3:33 PM America/Denver, from the live Sales database. Statuses were not changed for this note.

| | Count |
|---|---|
| Total | 50 |
| Review | 29 |
| New | 19 |
| Promoted | 2 |
| Skipped | 0 |
| Do not contact | 0 |
| With website | 24 |
| With email | 12 |
| With phone | 20 |
| With website and email | 12 |

The two promoted rows are already in Sales: Wolves Den Jiu Jitsu (Highland), used for the engineering check, and Renzo Gracie Jiu Jitsu Academy (Salt Lake City), which has no website, email, or phone on the prospect. Neither is in this batch.

The Review list is the working queue: http://localhost:5040/prospects

# First outreach batch

Maximum five academies. All five are still status **Review**, priority **Normal**, lane **National**, and not promoted. Discovery source for each is OpenStreetMap, query `US-UT openstreetmap martial arts`. You approve or skip. This note does not approve them.

## Utah Tora Jutsu

|            |                                                                           |
| ---------- | ------------------------------------------------------------------------- |
| Prospect   | 93                                                                        |
| Place      | Lehi, UT                                                                  |
| Website    | https://www.utahtorajutsu.com                                             |
| Email      | info@utahtorajutsu.com                                                    |
| Phone      | +1 801-477-7402                                                           |
| Status     | Review                                                                    |
| Priority   | Normal                                                                    |
| Lane       | National                                                                  |
| Promoted   | No                                                                        |
| Provenance | OpenStreetMap node/13733183351                                            |
| Warning    | None recorded. The email domain matches the website. Still open the site. |

Open in Sales: http://localhost:5040/prospects/93

- [ ] Open prospect in Sales
- [ ] Open academy website
- [ ] Confirm this is a legitimate martial arts academy
- [ ] Confirm website belongs to this academy
- [ ] Confirm email appears reasonable
- [ ] Review programs/offering
- [ ] Look for existing trial/free-class/lead intake
- [ ] Decide whether Nuxxion appears relevant
- [ ] APPROVE FOR OUTREACH
- [ ] SKIP
- [ ] DO NOT CONTACT

## Tenacity Martial Arts

| | |
|---|---|
| Prospect | 84 |
| Place | Kearns, UT |
| Website | https://www.tenacityma.com/ |
| Email | tenacitymartialarts@gmail.com |
| Phone | +1 801-259-9688 |
| Status | Review |
| Priority | Normal |
| Lane | National |
| Promoted | No |
| Provenance | OpenStreetMap node/12171187893 |
| Warning | None recorded. The Gmail name matches the academy. Still open the site. |

Open in Sales: http://localhost:5040/prospects/84

- [ ] Open prospect in Sales
- [ ] Open academy website
- [ ] Confirm this is a legitimate martial arts academy
- [ ] Confirm website belongs to this academy
- [ ] Confirm email appears reasonable
- [ ] Review programs/offering
- [ ] Look for existing trial/free-class/lead intake
- [ ] Decide whether Nuxxion appears relevant
- [ ] APPROVE FOR OUTREACH
- [ ] SKIP
- [ ] DO NOT CONTACT

## Warrior Mountain Academy

| | |
|---|---|
| Prospect | 91 |
| Place | Lehi, UT |
| Website | https://warriormountainacademy.com |
| Email | warriormountainacademy@gmail.com |
| Phone | +1-801-651-4301 |
| Status | Review |
| Priority | Normal |
| Lane | National |
| Promoted | No |
| Provenance | OpenStreetMap node/13647092989 |
| Warning | None recorded. The Gmail name matches the academy. Still open the site. |

Open in Sales: http://localhost:5040/prospects/91

- [ ] Open prospect in Sales
- [ ] Open academy website
- [ ] Confirm this is a legitimate martial arts academy
- [ ] Confirm website belongs to this academy
- [ ] Confirm email appears reasonable
- [ ] Review programs/offering
- [ ] Look for existing trial/free-class/lead intake
- [ ] Decide whether Nuxxion appears relevant
- [ ] APPROVE FOR OUTREACH
- [ ] SKIP
- [ ] DO NOT CONTACT

## Utah Valley Self Defense

| | |
|---|---|
| Prospect | 92 |
| Place | Lindon, UT |
| Website | https://www.uvselfdefense.com/ |
| Email | uvselfdefense@gmail.com |
| Phone | +1-801-609-1280 |
| Status | Review |
| Priority | Normal |
| Lane | National |
| Promoted | No |
| Provenance | OpenStreetMap node/13673098485 |
| Warning | None recorded. The Gmail name matches the academy. Still open the site. |

Open in Sales: http://localhost:5040/prospects/92

- [ ] Open prospect in Sales
- [ ] Open academy website
- [ ] Confirm this is a legitimate martial arts academy
- [ ] Confirm website belongs to this academy
- [ ] Confirm email appears reasonable
- [ ] Review programs/offering
- [ ] Look for existing trial/free-class/lead intake
- [ ] Decide whether Nuxxion appears relevant
- [ ] APPROVE FOR OUTREACH
- [ ] SKIP
- [ ] DO NOT CONTACT

## Lawrence Championship Martial Arts

| | |
|---|---|
| Prospect | 56 |
| Place | American Fork, UT |
| Website | https://lawrencecma.com/ |
| Email | americanforklcma@gmail.com |
| Phone | +1 801 492 1300 |
| Status | Review |
| Priority | Normal |
| Lane | National |
| Promoted | No |
| Provenance | OpenStreetMap node/1122706262 and way/1537365849, already one prospect |
| Warning | Two map objects were merged. That is expected. The website domain matches the academy name. Still open the site. |

Open in Sales: http://localhost:5040/prospects/56

- [ ] Open prospect in Sales
- [ ] Open academy website
- [ ] Confirm this is a legitimate martial arts academy
- [ ] Confirm website belongs to this academy
- [ ] Confirm email appears reasonable
- [ ] Review programs/offering
- [ ] Look for existing trial/free-class/lead intake
- [ ] Decide whether Nuxxion appears relevant
- [ ] APPROVE FOR OUTREACH
- [ ] SKIP
- [ ] DO NOT CONTACT

# How to work one prospect

1. Open **Prospects**. The list starts on Utah and Review.
2. Open the academy. Read the name, city, website, email, and phone. Provenance shows OpenStreetMap.
3. Open the website in your browser. If it is the wrong business, click **Skip**. If you must never pursue it, click **Do not contact**.
4. If you will pursue it, click **Promote**. The screen says “Promoted into Sales. No email was sent.”
5. Click **Open company** and **Open opportunity**. Expect a company, a contact named Front Desk when an email or phone existed, and a Working opportunity named `{Academy} — Martial Arts CRM`, source Cold Outreach.
6. Send the email from your mailbox. Copy the address from the prospect or the contact. The app will not send it.
7. On the opportunity, under **Activities**, add an Email. Description: `Initial outreach email`. Due: now. Click **Add activity**.
8. Click **Complete** on that activity. Pick an outcome. Write what happened in Notes. Leave **Schedule another activity** checked. Set the next due date a few days out and the description to `Follow-up email`. Click **Complete**.
9. On the morning that follow-up is due, open **Dashboard**. It appears under **Due today**. Until that calendar day in America/Denver, it is not on Work today. The opportunity still shows `Next: Follow-up email`.
10. If they reply, complete the follow-up with outcome **Reached** and put the reply in Notes. You can also use **History → Add note**.
11. If they want a demo, add a **Meeting** activity at the agreed time. Afterward, **Complete** it with **Meeting Held** or **No Show**.
12. When you are ready to quote, add commercial lines, then under **Proposal** create a draft, **Issue**, and after you email the PDF yourself click **Mark Sent**. **Record Accepted** does not mark the deal Won.
13. Click **Mark Won** only for a signed agreement. The page then says the sale is complete and lists manual Control Plane steps. Sales does not create the customer.
14. If they are not interested, or they never reply after the attempts you planned, click **Mark Lost** and choose a reason. If they say stop contacting them, also check **Do not contact** on the company and Save. Doing that on the prospect after promotion sets the same company flag.

## Things the screen does not mean

1. Adding an Email activity does not mean the email was sent. It is an open task.
2. You send the email yourself.
3. Completing that Email activity is how you record that you did it.
4. Email uses the same outcomes as a call: **Reached**, **No Answer**, **Left Message**, **Meeting Held**, **No Show**, **Other**. There is no Sent or Replied button. For “I sent it and have not heard back,” use **No Answer** or **Other**, and say that in Notes.
5. Notes are where you write the actual result.
6. **Schedule another activity** creates the follow-up. It is checked by default. If you leave the description blank, it is saved as `Follow-up`.
7. Work today shows overdue and due-today tasks, up to eight each. A follow-up due in three days stays off that list until that day. Open deals with no next action still appear under **Active opportunities**, up to eight, labeled `No next action`.
8. Proposal **Mark Sent** records that you sent it. It does not email the PDF.
9. **Mark Won** does not provision a Martial Arts environment.
10. After Won, you create or reuse the customer in the Control Plane, add a Martial Arts product instance, provision it, and continue onboarding outside Sales. See [[S4-Provision-Runbook]] and [[Customer-1-Production-Deploy-Runbook]].

# Experiment 001 — Utah first outreach

Purpose: learn whether academies the software found can become real Nuxxion conversations.

Batch size: at most the five academies above. No automated sending.

For each academy you mark APPROVE FOR OUTREACH:

- [ ] Promote prospect
- [ ] Verify Company
- [ ] Verify Contact
- [ ] Verify Working Opportunity
- [ ] Send initial email manually
- [ ] Create/complete Email Activity
- [ ] Record exact message used
- [ ] Record personalization used
- [ ] Schedule follow-up
- [ ] Record reply if received
- [ ] Record bounce if received
- [ ] Record DNC request immediately
- [ ] Record demo if booked
- [ ] Mark Lost when appropriate
- [ ] Mark Won only when actually sold

## Experiment tracker

Fill this as you go. Sales remains the record. This table is only so you can see the batch in one place.

| Academy | Prospect | Approved? | Promoted? | Initial email date | Subject / variant | Personalized? | Follow-up due | Reply? | Bounce? | DNC? | Demo? | Proposal? | Won? | Lost? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Utah Tora Jutsu | 93 | | | | | | | | | | | | | | |
| Tenacity Martial Arts | 84 | | | | | | | | | | | | | | |
| Warrior Mountain Academy | 91 | | | | | | | | | | | | | | |
| Utah Valley Self Defense | 92 | | | | | | | | | | | | | | |
| Lawrence Championship Martial Arts | 56 | | | | | | | | | | | | | | |

# Outreach message — approval required

> [!warning]
> No prospect should be contacted until you approve the actual message.

There is no approved outbound email in the vault. Write it here before you send the first one.

| Piece | Draft |
|---|---|
| From address | |
| Subject | |
| Opening | |
| Problem statement | |
| Nuxxion value proposition | |
| Call to action | |
| Signature | |
| What you will personalize | |
| Follow-up #1 | |
| Follow-up #2 | Leave blank until the first replies tell you a second note is worth sending. |

Source material, not an approved script or an approved price:

- What Martial Arts CRM is, and what it is not: [[Martial-Arts-Product-Boundary]]
- Monthly price and setup fee are still blocked, not approved: [[Customer-1-Commercial]]
- Sales has seeded offer rows for dogfooding (Martial Arts CRM monthly and a setup fee). Those numbers are not a price you are authorized to quote until you decide they are. See [[Current-State]].
- Product intent, outside this vault: `docs/2 - product-overview.md` and `docs/3 - product-goals.md`

# What we are learning

Answer these while you work the five. They decide the next engineering cycle.

- [ ] Are these real businesses?
- [ ] Are the discovered emails usable?
- [ ] Are we reaching generic inboxes or decision-makers?
- [ ] Is Promote → Sales intuitive?
- [ ] Is logging the email annoying?
- [ ] Is scheduling the follow-up annoying?
- [ ] Does Work Today help?
- [ ] Are replies easy to record?
- [ ] What personalization am I actually doing?
- [ ] Am I repeatedly using the same message?
- [ ] What CTA feels natural?
- [ ] How long am I waiting between attempts?
- [ ] How many attempts feel appropriate?
- [ ] Are prospects replying?
- [ ] Are demos being booked?
- [ ] What is actually slowing me down?

## Decision gates

> [!info] What the answers mean
> If the contact information is bad, the next build is better enrichment.
>
> If these Utah academies are real and you need more of them, expand discovery.
>
> If you are pasting the same email on the same schedule by hand, then consider a controlled sender. Not before.
>
> If typing the activity is what slows you down, improve the Sales workflow.
>
> If replies or demos are happening, stop engineering and sell.
>
> If nobody responds, look at the offer, the message, and who you targeted before building more infrastructure.

# Related notes

- [[Home]]
- [[Current-State]]
- [[SaaS-Decisions]]
- [[Sales-SIC-Dogfooding-Readiness-Assessment]]
- [[Control-Plane]]
- [[history/WO-2026-09-27-sales-prospect-pool-return]]
- [[history/WO-2026-09-27-sales-local-backup-return]]
- [[Martial-Arts-Product-Boundary]]
- [[Customer-1-Commercial]]
- [[S4-Provision-Runbook]]
- [[Customer-1-Production-Deploy-Runbook]]

Sales screen guide, outside this vault: `docs/8 - sales-user-guide.md`. Control Plane operator guide, outside this vault: `docs/11 - sic-operator-guide.md`. New-customer steps, outside this vault: `docs/12 - new-customer-runbook.md`.
