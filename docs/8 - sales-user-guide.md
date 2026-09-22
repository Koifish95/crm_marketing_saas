# Sales CRM user guide

Audience: SIC staff selling Martial Arts CRM (and similar commercial work in this product).

This is **SIC’s Sales product**, not the academy Martial Arts app. Local development: http://localhost:5040.

Admin: [Customer administrator](9 - customer-administrator-guide.md).  
Provisioning a won academy: [SIC operator](11 - sic-operator-guide.md) (not automatic from Won).

Sales Minimum V1 is **implemented and code-shipped for dogfooding**. It is **not** an owner-accepted official milestone. Work the spine below; do not expect forecasting, kanban, or CRM email.

---

## Operating model

**Outbound (default):**

```text
Company → Contacts → Opportunity → Activities
        → Proposal / Quote → Decision → Won or Lost
        → Serve checklist (if Won)
```

**Inbound:** public `/inquire` or `/t/{token}` (when enabled) creates a **Lead**. **Convert Lead** creates Company + Contact + Opportunity and **keeps** the Lead.

Do **not** start a cold outbound motion as a Lead.

Pipeline stages (Opportunity):

**Working → Proposal/Quote → Decision → Won / Lost**

A demo is a **Meeting** activity, not a stage. Manual create and Lead convert default to **Working**. Older records may still say `proposal_quote` internally; the label is **Proposal / Quote**.

---

## Logging in

Same pattern as Martial Arts: `/login`, username or email, 8-hour cookie, forced password change when flagged.

Staff need Access Rights **View Sales** / **Manage Sales** (seeded role **Sales user** has both). Admin has access in the usual Admin way. Viewer does not work the pipeline.

---

## Navigation (Company-first)

| Order | Item | Use |
|---|---|---|
| 1 | Dashboard | Work today + pipeline snapshot |
| 2 | Companies | Accounts you sell to |
| 3 | Opportunities | Deals |
| 4 | Activities | Cross-cutting task list |
| 5 | Contacts | People at companies |
| 6 | Leads | Inbound only |
| 7 | Campaigns / Offers / Proposals | Library and quote documents |

---

## Dashboard / Work today

**When:** Start of day.

**What you see:**

- Open opportunity count, open one-time $ and MRR
- Leads by stage; activity overdue / due today / upcoming
- Period won/lost, win rate
- **Work today:** overdue activities, due today, open opportunities with next action
- Source and campaign performance (zero-rows for unused sources are hidden except Unattributed)
- Proposal counts (draft, issued, sent, accepted, declined, past valid-through)

**Notes:** Click into the opportunity or activity. The dashboard does not complete work for you.

---

## Companies

**When:** You have a named academy (or company) to sell to.

**Steps:**

1. **Companies → New company** (toggled create form).
2. Name required. Optional website, phone, city, state, notes.
3. Lifecycle: **Prospect / Customer / Former Customer** (separate from the Active flag).
4. Open the company. Header shows city/phone. **Edit details** when you need to change them — the page is not one long always-on form.

**Afterward:** Add contacts, then an opportunity.

**Notes:** Lifecycle “Customer” is a sales status. It does not provision Martial Arts.

---

## Contacts

**When:** You know who you call (owner, GM).

**Steps:** Create from the company or **Contacts**, with company required, first/last name, optional email/phone/title.

**Afterward:** Set a contact as the opportunity’s primary contact when you quote.

---

## Opportunities

**When:** There is a real deal (not just a company in the rolodex).

**Steps:**

1. Create an opportunity on the company (name, optional amounts — commercial **lines** are the serious money).
2. Stage buttons stay visible: move Working → Proposal/Quote → Decision. Won/Lost are explicit actions.
3. Keep **next activity** honest; it shows in the header.
4. **Edit details** is hidden until you need it.

**Afterward:** Live in activities until you issue a proposal.

**Notes:** List columns include company, stage, one-time, MRR, next open activity.

---

## Activities

**When:** Every call, email, meeting, or task that should not live in your head.

**Types:** Call, Email, Meeting, Task, Other.

**Due date is required.**

**Outcomes required** for Call, Email, Meeting:

| Outcome | Typical use |
|---|---|
| Reached | They talked to you |
| No Answer | Ring-out |
| Left Message | Voicemail / email sent |
| Meeting Held | Demo happened |
| No Show | They missed the meeting |
| Other | Anything else |

**Steps to complete and continue:**

1. Open the activity (or Work today).
2. Complete with outcome where required.
3. **Schedule the next** activity on the same opportunity/company.

**Afterward:** Open activities shrink; history remains.

**Notes:** Cancelling leftover opens at Won/Lost is offered (default yes). Completed history is kept. **Reopen does not restore cancelled tasks** — create new ones.

---

## Offers and commercial lines

**When:** You are quoting Martial Arts CRM + setup, or editing SIC’s catalog.

Seeded starter offers (editable, **Sales-owned**, not a platform catalog):

- Martial Arts CRM — **monthly** (example default $250)
- Provisioning / Setup — **one-time** (example default $500)

**Lines** on an opportunity: quantity × unit price. **One-time** vs **monthly (MRR)** are separate. Totals roll to the opportunity.

**Notes:** There is no bundle engine and no first-class setupFee field beyond a one-time line. Do not invent MRR by stuffing a one-time line into monthly.

---

## Proposals

**When:** They asked for a quote, or you moved to Proposal/Quote.

**Lifecycle:** Draft → Issued → (Mark sent) → Accepted or Declined. New revision **supersedes** the previous issued snapshot.

**Steps:**

1. Create/issue from the opportunity (commercial snapshot is **immutable** once issued).
2. Preview HTML / download PDF (letterhead from Settings).
3. **Mark sent** when you actually delivered it (email is outside the CRM).
4. **Accept** or **Decline**. Accept does **not** auto-Won the opportunity.
5. Optional **signed PDF upload** after issue (not a browser e-sign, not a customer portal).

Statuses: Draft, Issued, Accepted, Declined, Superseded. UI may show **Issued · Sent**.

**Afterward:** Move the opportunity to Decision, then Won/Lost when the commercial outcome is real.

**Notes:** Past valid-through is flagged on the dashboard. You cannot record issued actions on a superseded revision.

---

## Won / Lost

**Won — when:** They bought.

**Steps:** Mark Won. Confirm whether to **cancel remaining open activities** (default yes). Complete the **serve checklist** on the opportunity (company, totals, lines, next steps). Those next steps are reminders:

1. Create or reuse this customer in Control Plane  
2. Add a Martial Arts product instance  
3. Provision the environment  
4. Continue onboarding outside Sales  

**Lost — when:** They will not buy. Pick a loss reason (Budget, Timing, Chose another provider, No longer needed, Could not reach, Not a fit, Other).

**Afterward:** Terminal stage. **Reopen** returns the deal to an active stage but does not resurrect cancelled activities.

**Notes:** Won does **not** call the Control Plane. If you skip the checklist, the academy is not provisioned.

---

## Leads (inbound)

**When:** Website inquiry, tracking link, or someone filled `/inquire`.

Lead stages: New → Contacted → Qualified → Converted.

**Convert Lead:** creates Company + Contact + Opportunity (Working) and keeps the Lead.

**Notes:** Public intake defaults **off**. Admin enables it under Settings → Public intake. Honeypot field is `website`. Required public fields: first name, last name, email.

---

## Sources, campaigns, attribution

Seeded sources include Referral, Website/Organic, Facebook, Instagram, Google, Email, Cold Outreach, Networking/Event, Existing Customer, Partner, Other.

Campaigns are Sales campaigns (draft/active/completed/archived), not Martial Arts marketing campaigns. Tracking links attribute clicks/leads.

Put source/campaign on the Lead or Opportunity when you know it. Dashboard hides empty source rows except Unattributed.

---

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Creating a Lead for a cold academy | Create a **Company** |
| Using a stage named Demo | Log a **Meeting** |
| Accepting a proposal and assuming Won | Mark **Won** separately |
| Expecting Won to spin up Martial Arts | Use Control Plane (operator) |
| Leaving opportunities with no next activity | Schedule one before you close the tab |
| Emailing from the CRM | You cannot; Mark sent after your real email |
