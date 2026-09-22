# Product goals and philosophy

Audience: owners, SIC, and anyone deciding what belongs in the product.

Related: [Overview](2 - product-overview.md) · [Platform](4 - platform.md)

---

## Purpose

Give a small business a **daily operating system for acquisition** — not a replacement for every tool they already run.

- **Martial Arts:** make the path from “interested family” to “joined or lost” unavoidable, visible, and attributable.
- **Sales:** make SIC’s own selling of that product equally unavoidable: company, next action, quote, decision, handoff.
- **Platform:** let SIC run many isolated customer environments without mixing data, and update them without destroying volumes.

---

## Business problems

| Problem | Product response (implemented) |
|---|---|
| Intros live in a notebook; follow-up is memory | Household + trial + follow-up queue |
| “We posted on Instagram” cannot be tied to a join | Campaigns, sources, tracking links, reports |
| Spreadsheets for academy deals SIC is pitching | Sales companies, opportunities, activities, proposals |
| Updating software by copying files onto a live database | Control Plane backup-gated upgrade, named volumes |
| One shared database for every customer | One SQLite + assets volume **per environment** |

---

## Intended customer experience

A competent staff person should be able to:

1. Sign in.
2. See what is overdue today.
3. Open the right household or company.
4. Complete the next real-world action (call, mark attended, send a PDF).
5. Leave a next due date so the queue does not go empty by accident.

The staff chrome is a left-hand navigation rail (off-canvas on a phone, in-flow on a desktop). Public intro booking (`/trial`) is a separate, unauthenticated experience.

**Honest quality note:** Martial Arts domain language is mature. Sales Minimum V1 is **code-shipped for SIC dogfooding** and is **not** owner-accepted as an official product milestone. Everyday selling works; some list pages still show create forms above the work. Do not promise a polished enterprise CRM visual system.

---

## Workflow principles

1. **The queue is the product.** Dashboard and Follow-up / Work today exist so work has a due date.
2. **Record the outcome, then the next attempt.** Completing a call without a next date is how people fall out of the process.
3. **Convert the person, not a vague household blob.** Martial Arts convert/lost is per member (line).
4. **Company-first outbound in Sales.** Do not invent a Lead for a company you called cold.
5. **Won in Sales does not provision Martial Arts.** A checklist reminds SIC; a human uses the Control Plane.
6. **Joined in Martial Arts does not bill the member.** Copy them into the academy’s membership system.
7. **Attribution is captured, not guessed later.** Source/campaign on the household or opportunity.

---

## Product boundaries

```text
                    ┌─────────────────────────────┐
  Marketing posts   │  Martial Arts CRM           │   Gym management /
  walk-ins, ads  →  │  households, trials,        │ → membership billing,
                    │  follow-up, conversion      │   rank, class ops
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
  SIC prospecting → │  Sales CRM                  │ → Control Plane
                    │  companies, quotes, won     │   (provision academy)
                    └─────────────────────────────┘
```

### Belongs in Martial Arts CRM

Households, members, trials, follow-up calls, conversion/lost, catalog of programs/offerings, intro weekly schedule, campaigns/assets/events that feed acquisition, staff users, reports about acquisition.

### Belongs in Sales CRM

Companies, contacts, opportunities, activities, offers, commercial lines, proposals, inbound leads/intake, SIC staff users.

### Belongs in the Control Plane (SIC only)

Customer accounts, product instances, PROD/DEV processes, backups of whole environments, upgrades, hostnames, hosting node.

### Stays in other systems

| System | Why it stays outside |
|---|---|
| Gym membership / billing | Explicit product boundary |
| Registrar DNS | External; SIC or the customer’s IT |
| Email/SMS providers | Not implemented |
| Meta Ads Manager (publishing) | Read-only sync only |
| Accounting | Compensation ledger in MA is marketing credit, not a full accounting package |

---

## Current intentional limitations

These are **on purpose today**, not accidental omissions to hide:

| Limitation | Status |
|---|---|
| No native email/SMS/WhatsApp send | **Not implemented** |
| No Meta publish | **Not implemented** (read-only sync exists in Martial Arts) |
| No e-sign / customer proposal portal | **Not implemented** (staff mark sent/accepted; optional signed PDF upload) |
| No automatic Control Plane create from Sales Won | **Not implemented** (checklist only) |
| No gym-management sync | **Not implemented** |
| No Beauty product | **Not started** |
| No public self-serve signup | **Intentional** |
| No Control Plane operator login | **Intentional for now** (loopback + SSH tunnel). Official S7 is not Successful |
| Live VPS + real product domain + Let’s Encrypt on a paying academy | **Repository-complete path; not live-accepted S7/S8** |
| Zero-downtime / Kubernetes / multi-region | **Out of scope** |
| Shared “generic CRM domain” across products | **Rejected.** Products own their data models |

---

## Implemented vs future

| Topic | Today | Do not promise |
|---|---|---|
| Martial Arts acquisition loop | Implemented | Belt tracking, billing |
| Sales pipeline + proposals | Implemented (V1 dogfood) | Forecasting, kanban, auto-email |
| Isolated PROD/DEV | Implemented | Customer self-serve extra environments |
| Backups / restore / upgrade | Implemented in Control Plane | Cloud vendor auto-offsite (operator pastes a folder) |
| Public hostname + nginx templates | Implemented in repo | “Your live HTTPS site is already running on our VPS” unless SIC has actually done DNS/TLS |
| Beauty | Not started | Anything Beauty |

If a salesperson needs language stronger than this table, that is a commercial decision — not something these docs invent.
