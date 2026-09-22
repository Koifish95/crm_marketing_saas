# Product overview

Audience: a prospective or new customer, or anyone who needs to understand the commercial product without reading the repository.

Related: [Goals](3 - product-goals.md) · [Platform](4 - platform.md) · [Glossary](5 - glossary.md)

---

## What this is

SIC (Strategic Insights Consulting) operates a **small-business acquisition CRM platform**. Each paying customer gets their **own application environment** (own database, own files, own staff logins). Customers do not share a database.

Two products exist today:

1. **Martial Arts CRM** — for a martial-arts academy that needs to capture interest, run intro / trial classes, follow up by phone, and record who joined or was lost. Marketing work that *feeds* that pipeline lives in the same app.
2. **Sales CRM** — SIC’s own selling tool for talking to academies (and similar companies), quoting Martial Arts CRM, and handing a won deal to provisioning. It is a separate product, not a mode of Martial Arts.

A private **Control Plane** is SIC’s operations console. Customers never log into it.

---

## The problem it solves

### Martial Arts

An academy already has (or will keep) a gym-management or billing system for members who have joined. What they typically *do not* have is a disciplined place for:

- the household that inquired yesterday
- who is coming to Tuesday’s intro
- who no-showed
- who still needs a conversion call
- which flyer or campaign produced the inquiry
- what happened after the trial

Martial Arts CRM is that place. It is an **acquisition, trial, follow-up, and conversion** system.

### Sales (SIC)

SIC needs to sell Martial Arts CRM without mixing academy households into its own pipeline. Sales CRM is **company-first outbound**: Company → Contacts → Opportunity → Activities → Proposal → Decision → Won or Lost, then a serve / provisioning checklist.

---

## Who it is designed for

| Product | Designed for |
|---|---|
| Martial Arts | Academy owners, front-desk staff, and coaches who schedule intros and make follow-up calls |
| Sales | SIC staff selling the Martial Arts product |
| Control Plane | SIC operators only |

First intended academy-style pilots are SIC’s own sales use and a later academy customer. The original gym implementation that inspired Martial Arts is **not** a customer of this platform and is not managed here.

---

## What it is not

Do **not** buy or sell these products as a replacement for:

| Not this | Why |
|---|---|
| All-in-one gym management | No membership billing, belt/rank, full class attendance, or academy scheduling of every regular class |
| Native SMS, email, or WhatsApp sending | Staff place calls and record outcomes; the app does not send messages |
| Meta / social publishing | Meta integration is **read-only sync and campaign mapping**, not unsupervised posting |
| A shared multi-tenant database | Each environment has isolated SQLite and file storage |
| Self-service SaaS signup | SIC provisions you. There is no public Control Plane |
| Beauty or other industry CRMs | Not started |
| SIC’s Control Plane as a customer admin screen | Customers administer users *inside* their CRM, not in the Control Plane |

After someone **joins** in Martial Arts, membership billing and ongoing student operations stay in the academy’s existing system. Staff copy or export the converted person. There is no gym-management integration.

---

## Major capabilities (implemented)

### Martial Arts

- Staff login with roles (Admin, Staff, Viewer) and optional marketing Access Rights
- Households (called **Leads** in the app) with members (people / programs)
- Public intro booking at `/trial`
- Staff scheduling of trials, attendance, no-shows
- Follow-up call queue (confirm before class; conversion call after outcome)
- Convert (joined) or mark lost, with catalog offerings and lost reasons
- Campaign / source attribution, tracking links
- Marketing: campaigns, content, assets, tasks, acquisition events
- Reports (including conversion and source views; financial cents are Admin-only)
- Admin catalog (programs, offerings, sources, lost reasons), intro weekly schedule
- CSV import/export exists as **Admin APIs** (no everyday staff import screen)

### Sales

- Company-first records with lifecycle (Prospect / Customer / Former Customer)
- Contacts, Opportunities, Activities
- Pipeline: Working → Proposal/Quote → Decision → Won / Lost
- Structured call/email/meeting outcomes; complete and schedule next
- Offers and commercial lines (one-time vs monthly / MRR)
- Proposals: draft, issue, mark sent, accept, decline, revisions, PDF, optional signed PDF upload
- Public inquiry form (`/inquire`) — **off until an Admin enables it**
- Won serve checklist (operator reminder; does **not** auto-create a Control Plane customer)
- Dashboard **Work today**

### Platform (SIC)

- Create a customer account, then add a Martial Arts and/or Sales **product instance**
- Each instance gets isolated **PROD** and **DEV** environments
- Health, start/stop, relaunch, backup, restore, PROD→DEV copy-down, upgrade
- Optional public hostname on PROD and generated nginx edge (**repository-complete; live VPS/DNS/TLS not official**)

---

## Major workflows

### Martial Arts (academy)

```text
Inquiry (staff create or public /trial)
        → Household + members
        → Schedule intro
        → Confirm (follow-up before class)
        → Attend or no-show
        → Conversion call
        → Convert (joined) or Mark lost
        → Membership work continues in the academy’s other system
```

### Sales (SIC)

```text
Company (and contacts)
        → Opportunity (Working)
        → Activities until ready to quote
        → Proposal / Quote
        → Decision
        → Won or Lost
        → If Won: serve checklist, then SIC provisions Martial Arts in the Control Plane
```

Inbound website inquiries, when enabled, create a **Lead**. Convert Lead creates Company + Contact + Opportunity and keeps the Lead. Outbound prospecting should start at **Company**, not Lead.

---

## How it fits the customer’s business

Martial Arts sits **in front of** gym management:

- Marketing and walk-ins feed households here.
- Trials and follow-up happen here.
- “They joined” is recorded here (program, offering, monthly amount).
- Recurring billing, waivers, and class operations stay where they already are.

Sales sits **in front of** SIC operations:

- Selling and quoting happen in Sales CRM.
- Turning a won academy into a running Martial Arts environment happens in the Control Plane (SIC operator), not automatically.

---

## Intended value

| For an academy | For SIC |
|---|---|
| One place for “who do we still owe a call?” | Same selling motion every time |
| Trial calendar tied to a household, not a spreadsheet | Quotes with one-time + MRR lines and PDF proposals |
| Attribution that explains where intros came from | Won deals with a provisioning checklist |
| Marketing assets and campaigns that attach to acquisition | Isolated customer environments you can back up and update |

---

## Important terminology (short)

Full definitions: [Glossary](5 - glossary.md).

| Term in the app | Meaning |
|---|---|
| **Lead** (Martial Arts) | A **household**, not a single person |
| **Member / line** | A person in that household, usually tied to a program |
| **Trial / intro** | A scheduled introduction class for a member |
| **Follow-up** | A staff phone-call task (`/tasks`) |
| **Convert** | That person joined (status Joined) |
| **Lead** (Sales) | Inbound inquiry person; **not** the outbound starting point |
| **Company** | The account SIC is selling to |
| **Opportunity** | A deal on a company |
| **PROD / DEV** | Live vs practice copies of **one product instance** |
| **Control Plane** | SIC-only operator app |

---

## How customers actually receive the software

SIC creates your **Customer Account**, adds a **Product Instance**, and provisions **PROD** (and usually **DEV**). You receive a staff URL and an initial Admin login. You change the password on first sign-in.

You do not install Docker. You do not use the Control Plane.

Live public HTTPS (your academy hostname) is **repository-complete on the operator side** but **not yet an official live hosting milestone**. Until SIC points a hostname at a hosting node, staff typically use a URL SIC gives you (laptop or private host port).
