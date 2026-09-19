---
type: note
status: current
area: product
updated: 2026-09-19
aliases:
  - UX audit
  - Product workflow audit
tags:
  - saas
  - ux
  - phase-1
---

# Product Workflow & UX Audit

Phase 1 of the Pre-VPS Product Quality & Release Readiness Program. **Investigation only.** Findings are not implemented in this note.

Program: [[wip/CRM_SaaS_Pre_VPS_Product_Quality_and_Release_Readiness_Program]]. Work order (archived): [[wip/archive/WO-2026-09-19-pre-vps-product-quality]]. Live map: [[Current-State]]. Architecture: [[ADR-Product-Owned-Domains-Shared-Foundation]]. Sales V1 context: [[Sales-SIC-Dogfooding-Readiness-Assessment]].

---

## Executive Summary

Both products **can complete their claimed workflows**. A normal staff user would **not** want to live in either console as they appear today, for different reasons.

**Martial Arts** already has the right operational vocabulary: household, trial, next action, follow-up queue, reports that explain their own numbers, marketing that says it is not the acquisition dashboard. Domain copy is often excellent. The staff chrome is **broken on realistic screens**. At 1440×900 and at 390×844 the navy/red rail stays `position: fixed` over the work surface. Headings, metrics, names, and primary buttons are clipped. Clicks on the left third of the page hit navigation instead of the record. Public `/trial` is the one surface that currently looks like commercial software.

**Sales** Minimum V1 **did land the operational spine** Scott asked for: Company-first copy, Work today, Working → Proposal/Quote → Decision → Won/Lost, complete + outcome + next, opportunity list dollars and next action, overdue deep-link, Won serve checklist. It still **does not look or feel like an intentional daily CRM**. Record pages are stacked edit forms. Lists put a create form above the work. The opportunity workspace cannot be understood in five seconds. Primary nav is overcrowded. Leftover lab rows (duplicate offers, duplicate names, Won deals with leftover next actions, a “No deal” still in Decision) make the product feel unfinished.

**Answer to the Phase 1 question**

> If a normal employee were given this software tomorrow, would the workflows be understandable, convenient, efficient, and pleasant enough that they would actually want to use it?

| Product | Answer |
|---|---|
| Martial Arts staff | **No**, until the shell overlay is fixed. After that, the domain is usable with several HIGH workflow problems (convert buried after attendance; empty offerings block convert; no post-trial follow-up). |
| Martial Arts public `/trial` | **Mostly yes.** Long, but clear. |
| Sales | **Not as a primary daily CRM.** V1 made the work possible. The visual/interaction quality would still push a disciplined operator toward a spreadsheet for “who do I call / where is this academy.” |

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 11 |
| MEDIUM | 16 |
| LOW | 6 |

Phase 2 should **fix the shared staff shell first**, then treat **Sales opportunity + company workspaces and list pages** as the visual flagship, then repair Martial Arts next-action hierarchy and conversion/follow-up after attendance. Do not expand into email, SMS, Stripe, Beauty, or Core-owned domain.

---

## Methodology

Operated both products as a hostile staff user in a browser, not as a code review.

- Used the live apps. Source was consulted only to name routes after a 404 or to confirm layout classes after a measured overlay.
- Did not implement findings.
- Did not reset databases. Leftover Martial Arts and Sales sqlite was treated as the real operator environment.
- Did not touch `renzo_crm`.

Personas exercised: Martial Arts front desk (intake, trial, attendance, convert attempt) and manager surfaces (reports, marketing, catalog, users, settings). Sales operator (dashboard work today, company, opportunity, activities complete+next, offers, won serve). Public prospective member (`/trial` form, not submitted).

**Not fully exercised in this pass** (do not treat as proven): invalid credentials, logout, forced first-login password change, non-admin roles, public trial submit, asset upload, marketing-task create/complete, event sessions/roster/process, intro reschedule/cancel, mark lost/reopen, Sales new-company create from a clean slate, proposal create from draft on a fresh deal, a complete keyboard-only pass.

---

## Products / Versions Tested

| Item | Value |
|---|---|
| Repository | `crm_marketing_saas` (`Koifish95/crm_marketing_saas`) |
| Branch | `working` |
| HEAD at Phase 1 start | `4bd015b20a9f5f188580a50cc171680af6328239` |
| Remote | `origin/working`, **ahead 2** |
| Working tree at start | Dirty: program file untracked; WO + `wip/_index` + `project-state.yaml` authorization |
| Martial Arts | `martial_arts_template/` · http://localhost:5030 · sqlite `file:./data/app.sqlite` · schema `0020_tidy_frog_thor` |
| Sales | `sales_template/` (`sales-crm`) · http://localhost:5040 · sqlite `file:./data/app.sqlite` · image `crm-sales:c2` |
| Shared shell | `@crm/core` `packages/crm-core/app/layouts/internal.vue` |
| Credentials | DEV `admin` / `setup` (known demo password) |
| Viewport | Desktop 1440×900; phone 390×844 (`Emulation.setDeviceMetricsOverride`) |
| Date of runtime | 2026-09-19 |

DEV remaps navy to dark red. That is intentional ([[Design-System]]). It is not a defect.

---

## Martial Arts Workflow Map

```text
Login (already authenticated this session)
  → Dashboard (attention + metrics)
  → Leads list / pipeline
  → New household (Jordan Rivera, Walk-in, Adult BJJ)
  → Household workspace
       → Schedule trial (date chip → Adult Fundamentals 6:00 PM Sep 21)
       → Auto confirmation call on Follow-up (/tasks)
       → Mark attended (early outcome allowed)
       → Convert (blocked: no offerings in catalog)
  → Follow-up queue empty after attendance
  → Marketing hub / campaigns / events (created Saturday Open Mat draft) / assets
  → Reports (household 2, attended 1, conversions 0)
  → Catalog (programs/sources/lost reasons; **zero membership offerings**)
  → Users / Settings
  → Public /trial (One person form + date chips; not submitted)
```

The domain path is coherent: household → person → intro → follow-up → decision. Staff chrome and post-attendance next action are the breaks.

---

## Martial Arts Findings

### UX-MA-001 — After attendance, primary action is “Schedule trial”

- **Severity:** HIGH
- **Category:** USABILITY
- **Affected workflow:** Conversion / close
- **Current behavior:** Jordan Rivera status became “Trial attended.” Next copy: “Needs an intro or a decision.” Primary button: **Schedule trial**. Convert and Mark lost are inside **More**.
- **User impact:** Front desk who just marked a walk-in attended is pointed at booking another class, not joining or closing. Convert is an overflow action.
- **Evidence:** `/leads/2` after Mark attended, 2026-09-19.
- **Recommended outcome:** When latest intro is Attended and the person is not converted/lost, primary actions are Convert and Mark lost. Schedule another trial is secondary.
- **Phase 2:** Yes.

### UX-MA-002 — Convert is blocked when the offering catalog is empty

- **Severity:** HIGH
- **Category:** WORKFLOW GAP
- **Affected workflow:** Conversion
- **Current behavior:** Convert panel requires Offering *. The select has only “Select an offering.” Settings → Catalog → Membership offerings has **no rows**, only an add form. Convert gives no “catalog is empty / add an offering” path.
- **User impact:** A new academy can take leads and run trials, then cannot record a join without leaving the household for a dense admin catalog. Easy to conclude “conversion is broken.”
- **Evidence:** `/leads/2` convert panel; `/settings/catalog` offerings section empty.
- **Recommended outcome:** Empty-catalog state on Convert with a link to add an offering. Seed or onboarding should create at least one active offering per seeded program **or** convert should allow a one-time amount without a catalog row. Product decision: [[#Product Decisions Requiring Scott]].
- **Phase 2:** Yes (empty state + in-flow guidance). Seeding policy is a product decision.

### UX-MA-003 — Confirmation call is the wrong follow-up, then vanishes after attendance

- **Severity:** HIGH
- **Category:** WORKFLOW GAP
- **Affected workflow:** Follow-up
- **Current behavior:** Scheduling Sep 21 6:00 PM Adult Fundamentals created a confirmation call due **Sep 22, 5:00 PM** (after the class). Mark attended cleared Open follow-up. Empty copy: “schedule an intro to create the first confirmation call.” No conversion call.
- **User impact:** Staff are not prompted to confirm before class, and after class they are not given “call to join.” Dashboard follow-up stays at 0 even though Jordan still needs a decision.
- **Evidence:** `/tasks` after schedule; `/tasks` Open empty after attended; `/dashboard` “No open follow-up calls.”
- **Recommended outcome:** Confirmation due **before** class. Attendance should create or keep a conversion follow-up, not only cancel confirmation. Empty states should not imply the only way to get work is another intro.
- **Phase 2:** Yes.

### UX-MA-004 — Household header and member row are unreadable under the rail

- **Severity:** HIGH
- **Category:** VISUAL DESIGN (caused by UX-SHARED-001)
- **Affected workflow:** Household workspace
- **Current behavior:** “Jordan Rivera,” phone, Walk-in, “Prospective members,” and “Schedule trial” clip under the 256px rail. Record previous/next and tabs are hard to use with a mouse.
- **User impact:** The flagship MA screen is not operable on a laptop.
- **Evidence:** Screenshots `/leads/2` at 1440×900.
- **Recommended outcome:** Fix the shared shell; then re-check household header density.
- **Phase 2:** Yes (follows shell fix).

### UX-MA-005 — Person panel mixes trial booking with pricing and compensation

- **Severity:** MEDIUM
- **Category:** INFORMATION ARCHITECTURE
- **Affected workflow:** Trial scheduling / household
- **Current behavior:** After Schedule trial, the same column shows date/class picker, offering/monthly override, person notes, and compensation credit (credited user, eligibility, correction reason).
- **User impact:** Front desk booking a trial must scroll past sales-ops and compensation controls. High cognitive load during interruption.
- **Evidence:** `/leads/2` intro panel text after opening Schedule trial.
- **Recommended outcome:** Progressive disclosure. Booking first. Pricing/compensation behind Attribution or an advanced section.
- **Phase 2:** Yes.

### UX-MA-006 — Catalog is a long multi-Save admin form

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Users / administration / settings
- **Current behavior:** One page for programs, sources, lost reasons, offerings, household pricing. Each row has its own Save. Program listitems expose “Name Active Seasonal Save” without the program name in the accessible name.
- **User impact:** Easy to edit the wrong row. Offerings emptiness is easy to miss below the fold.
- **Evidence:** `/settings/catalog` a11y tree.
- **Recommended outcome:** Sections with visible current values; offerings empty state above the add form; accessible names include the row label.
- **Phase 2:** Yes (quality pass, not a catalog redesign).

### UX-MA-007 — Event create does not include a first session

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Events
- **Current behavior:** Title + Create and open yields a Draft event with Overview/Sessions/Roster/Process. No session yet. Public URL exists while still Draft.
- **User impact:** Extra context switch before the event is real. Staff may think creating the event published it.
- **Evidence:** `/marketing/events/1` Saturday Open Mat.
- **Recommended outcome:** After create, land on Sessions with a first-session prompt. Keep Draft vs Publish explicit.
- **Phase 2:** Yes (workflow quality, not new event features).

### UX-MA-008 — Follow-up queue cards repeat purpose labels

- **Severity:** LOW
- **Category:** VISUAL DESIGN
- **Affected workflow:** Follow-up
- **Current behavior:** Card text duplicated “Phone call · Open Work Phone call · Confirm intros Confirm intros.”
- **User impact:** Noise; still usable.
- **Evidence:** `/tasks` listitem name for Jordan Rivera.
- **Recommended outcome:** One purpose, one due, one person, one primary action.
- **Phase 2:** Yes (as part of queue visual pass).

### UX-MA-009 — Public trial class picker sits below the fold

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Public intake
- **Current behavior:** After One person, Book trial stays disabled until a class time. Date chips and program/experience sit below the first screen at 900px height. Helper: “Choose a class time to continue.”
- **User impact:** Prospect may think the form is incomplete or broken.
- **Evidence:** `/trial` innerHeight 900, scrollHeight 1429.
- **Recommended outcome:** Keep identity compact; keep date/class visible without scrolling on a laptop. Phone check after shell work.
- **Phase 2:** Yes.

### UX-MA-010 — Users deactivate copy starts lowercase

- **Severity:** LOW
- **Category:** VISUAL DESIGN
- **Affected workflow:** Users / administration
- **Current behavior:** Dialog body “this user will not be able to sign in…”
- **User impact:** Unfinished polish.
- **Evidence:** `/users` heading “Deactivate user?”
- **Recommended outcome:** Sentence-case the confirmation.
- **Phase 2:** Yes (copy pass).

### UX-MA-011 — Dashboard follow-up empty state is too narrow

- **Severity:** MEDIUM
- **Category:** INFORMATION ARCHITECTURE
- **Affected workflow:** Dashboard
- **Current behavior:** After attendance, dashboard shows 1 attended, 0 conversions, 0 follow-up, “New confirmation calls appear here when an intro is scheduled,” and “No upcoming intros.” Jordan still needs a decision and is invisible as work.
- **User impact:** Manager/front desk cannot see who needs a join conversation.
- **Evidence:** `/dashboard` after Mark attended.
- **Recommended outcome:** Named work for “attended, not converted” people, not only confirmation calls.
- **Phase 2:** Yes.

### UX-MA-012 — Marketing hub is clearer than staff chrome implies

- **Severity:** LOW
- **Category:** (positive; not a defect)
- **Affected workflow:** Campaigns / tracking
- **Current behavior:** Hub copy distinguishes marketing from acquisition dashboard, Meta mapping, compensation vs accounting, events vs trials. Campaigns explain organic $0 is valid.
- **User impact:** Once the shell is fixed, marketing is more understandable than Sales lists.
- **Evidence:** `/marketing`, `/marketing/campaigns`.
- **Recommended outcome:** Preserve this copy. Do not clone it onto Sales.
- **Phase 2:** Preserve; do not “simplify” away the distinctions.

---

## Sales Workflow Map

```text
Dashboard Work today (overdue discovery call; active opps mixed with Won/Lost leftovers)
  → Companies list (create form above leftover QA companies)
  → Company Example Academy V1 (edit form + contacts + won opp)
  → Opportunity Martial Arts CRM /9 (Won, lines, proposal accepted, serve checklist, history)
  → Activities ?queue=overdue (deep-link works; complete + outcome + next)
  → Offers (Martial Arts CRM $250/mo + duplicate Provisioning / Setup)
```

Company → Contacts → Opportunity → Activities → Proposal → Won is **possible**. It is not pleasant.

---

## Sales Findings

### UX-SALES-001 — Opportunity workspace is a wall of forms, not a deal view

- **Severity:** HIGH
- **Category:** VISUAL DESIGN
- **Affected workflow:** Opportunity workspace
- **Current behavior:** `/opportunities/9` (Won) has the facts: company, $500 one-time / $250 MRR, Pat Owner, serve checklist, accepted proposal, lines, activity history. They sit under a full edit form (name, source, campaign, owner, notes), disabled stage buttons, add-line form, add-activity form, add-note form. Five-second scan fails.
- **User impact:** SIC cannot glance at a deal. This is the flagship gap from the program.
- **Evidence:** `/opportunities/9` compact snapshot 2026-09-19.
- **Recommended outcome:** Summary header (who, company, stage, $, next, proposal state) first. Edit and add forms behind explicit actions. Preserve domain behavior.
- **Phase 2:** Yes. Highest Sales visual priority.

### UX-SALES-002 — Company workspace is an edit form

- **Severity:** HIGH
- **Category:** VISUAL DESIGN
- **Affected workflow:** Company-first outbound
- **Current behavior:** `/companies/7` opens with Name/Website/Phone/City/State/Notes/Lifecycle/Active + Save. Contacts are names only. Opportunity is “Martial Arts CRM · won” with no dollars. History empty.
- **User impact:** Cannot understand the account at a glance. Feels like a database admin page.
- **Evidence:** `/companies/7`.
- **Recommended outcome:** Account header (lifecycle, location, primary contact, open pipeline, next action) then related lists. Edit in a clear Save path, not the first thing on the page.
- **Phase 2:** Yes.

### UX-SALES-003 — Primary nav is overcrowded and still says Acquisition

- **Severity:** HIGH
- **Category:** INFORMATION ARCHITECTURE
- **Affected workflow:** Login / landing / navigation
- **Current behavior:** Rail: Dashboard, Companies, Leads, Contacts, Opportunities, Activities, Campaigns, Offers, Proposals, Users, Security activity, Settings. Subtitle **Acquisition** (Martial Arts leftover). Phone **Menu** visible at 1440px in Sales.
- **User impact:** Unclear where to start. Looks like a developer sitemap, not a sales desk.
- **Evidence:** Sales dashboard/companies snapshots.
- **Recommended outcome:** Keep Company-first as the default path. Group or demote Campaigns/Offers/Proposals/Users/Security. Replace Acquisition with a Sales subtitle. Fix Menu visibility with the shell.
- **Phase 2:** Yes.

### UX-SALES-004 — Create forms sit on top of every list

- **Severity:** HIGH
- **Category:** USABILITY
- **Affected workflow:** Lists
- **Current behavior:** Companies, Opportunities, Activities, Offers all lead with New X forms. The working list is below the fold. Opportunity default filter is **All stages**, so Won/Lost mix with working pipeline.
- **User impact:** Daily scanning starts with data entry. Pipeline review is noisy.
- **Recommended outcome:** List first. “New” as a button/sheet. Default opportunity filter to active stages (Working / Proposal / Decision).
- **Phase 2:** Yes.

### UX-SALES-005 — Leftover lab data makes dropdowns and metrics untrustworthy

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Lists / reporting / activities
- **Current behavior:** Duplicate “Provisioning / Setup” vs “Provisioning / setup.” Duplicate “Scott Coy” and “Martial Arts CRM” in activity/opportunity selects. Work today includes “No deal · Lost Academy V1 · Decision.” Won Example Academy still shows a next Call. Open pipeline MRR $0.00 while Won MRR shows $500. Unattributed 9 opps. Win rate 100% on leftover QA.
- **User impact:** Operator cannot trust Work today or selects. Spreadsheet temptation.
- **Evidence:** `/dashboard`, `/offers`, `/activities`, `/opportunities`.
- **Recommended outcome:** Do not wipe sqlite for convenience. Phase 2 should make lists/selects show discriminating context (company next to duplicate names). Cleaning lab rows is optional operator work, not a product feature.
- **Phase 2:** Yes for labeled selects and active-pipeline defaults. No mandatory DB reset.

### UX-SALES-006 — Many active deals have “No next action”

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Repeated outreach / Work today
- **Current behavior:** Work today and the opportunity list show “No next action” on Inbound Demo Lead, SIC, Scott Coy, several others. Complete+next exists on the activity page but is not the default path from the list.
- **User impact:** V1 scheduled-next only helps if the operator always uses Complete. Deals still die silently.
- **Evidence:** Dashboard Work today; opportunities list.
- **Recommended outcome:** Empty next-action is a first-class warning on the deal header and Work today. Completing from the queue should stay the happy path.
- **Phase 2:** Yes.

### UX-SALES-007 — Source performance is a wall of zero rows

- **Severity:** MEDIUM
- **Category:** VISUAL DESIGN
- **Affected workflow:** Reporting / pipeline
- **Current behavior:** Dashboard lists every source including zeros. Useful rows (Cold Outreach, Unattributed, Website) are buried.
- **User impact:** Looks like a report dump, not attention.
- **Evidence:** `/dashboard` source performance list.
- **Recommended outcome:** Hide empty sources by default; keep Unattributed visible when it has volume.
- **Phase 2:** Yes.

### UX-SALES-008 — Complete + next is present but visually secondary

- **Severity:** MEDIUM
- **Category:** USABILITY
- **Affected workflow:** Activities / repeated outreach
- **Current behavior:** Overdue deep-link `/activities?queue=overdue` works. Complete opens Outcome, Notes, Schedule another activity, Next type/due/description. The page still leads with a New activity form. Queue chips are lowercase (“overdue”). Next due is marked required in the complete panel.
- **User impact:** V1 behavior is there; the page still feels like “create records,” not “work the queue.”
- **Evidence:** `/activities?queue=overdue` after Complete.
- **Recommended outcome:** Queue first. Complete panel as the primary interaction. New activity secondary. If “schedule another” is unchecked, next due must not block complete.
- **Phase 2:** Yes.

### UX-SALES-009 — Desktop shows the phone header in Sales

- **Severity:** MEDIUM
- **Category:** RESPONSIVENESS
- **Affected workflow:** Navigation
- **Current behavior:** At 1440px Sales `header` computed `display: block` (Menu visible). Aside was `position: static` and main started at x≈253. Martial Arts at the same width had header `display: none` and aside `position: fixed`.
- **User impact:** Same layout file, two products, two broken complementary modes. Sales looks like mobile chrome on a desktop plus a rail.
- **Evidence:** CDP on `/activities` vs `/dashboard` MA.
- **Recommended outcome:** One shell CSS path that both products compile. See UX-SHARED-001.
- **Phase 2:** Yes (shared shell).

### UX-SALES-010 — Serve checklist and proposal history are good and buried

- **Severity:** LOW
- **Category:** (positive with placement issue)
- **Affected workflow:** Won / Lost / proposal
- **Current behavior:** Won copy “The sale is complete. Now serve the customer.” Checklist is honest (Create or reuse in Control Plane — no auto-provision). Proposal history states no email was sent. Won cancelled leftover open activity with a history note.
- **User impact:** Domain honesty is an asset. Placement under the edit form hides it.
- **Evidence:** `/opportunities/9`.
- **Recommended outcome:** Keep the copy. Put checklist in the Won header, not below forms.
- **Phase 2:** Yes (as part of UX-SALES-001).

---

## Cross-Product Findings

### UX-SHARED-001 — Staff rail overlay / drawer transform does not apply

- **Severity:** CRITICAL
- **Category:** DEFECT
- **Affected workflow:** All staff pages in both products
- **Current behavior:** `internal.vue` aside uses `fixed … lg:static` and closed state `-translate-x-full lg:translate-x-0`. Runtime:

  | Surface | innerWidth | aside position | transform | main x | phone header |
  |---|---|---|---|---|---|
  | MA dashboard | 1440 | `fixed` | none | 136.5 | `none` |
  | Sales activities | 1440 | `static` | none | 253 | `block` |
  | MA dashboard | 390 | `fixed` | none | 0 | `block` |

  At phone width the closed rail is still on screen (256px overlay). `-translate-x-full` did not apply. Left-column clicks hit nav. Public `/trial` is unaffected (different layout).
- **User impact:** Staff apps are not commercially usable on laptop or phone until this is fixed. This is the single largest product-quality failure.
- **Evidence:** CDP `getComputedStyle` on `#staff-nav` and `#main`; screenshots MA dashboard/household/new-lead; Sales phone-width crush.
- **Recommended outcome:** Do not rely on conflicting Tailwind `fixed` vs `lg:static` plus dynamic translate classes compiled separately per product. Explicit layout CSS in the shared foundation: desktop in-flow rail; below `lg` off-canvas drawer with overlay. Verify both products’ CSS bundles, not only the Vue class string.
- **Phase 2:** Yes. First work.

### UX-SHARED-002 — Shared visual language is tokens, not composition

- **Severity:** HIGH
- **Category:** VISUAL DESIGN
- **Affected workflow:** Cross-product
- **Current behavior:** Both use navy/red rail, `.panel`, `.page-width`, `AppButton`-ish patterns. MA record workspaces (household) are closer to the design-system intent. Sales record pages are stacked `.control` forms. Lists, empty states, and page headers are inconsistent. Sales still branded Acquisition.
- **User impact:** Products do not feel like a family. Sales feels like an earlier internal tool.
- **Evidence:** Household vs `/companies/7` vs `/opportunities/9`.
- **Recommended outcome:** Shared primitives for page header, record header, list+primary action, filters, empty state, dialog. Do not clone household into company.
- **Phase 2:** Yes.

### UX-SHARED-003 — Hidden confirm dialogs live in the accessibility tree

- **Severity:** MEDIUM
- **Category:** ACCESSIBILITY
- **Affected workflow:** Destructive actions
- **Current behavior:** Household, follow-up, users, settings expose headings like “Cancel this intro?” and “Deactivate user?” while the dialog is not open.
- **User impact:** Screen-reader users hear destructive confirmations on every household visit. Keyboard users may tab into hidden actions.
- **Evidence:** Compact snapshots on `/leads/2`, `/tasks`, `/users`, `/settings`.
- **Recommended outcome:** Native `<dialog>` closed state must not expose contents (or render confirm UI only when open).
- **Phase 2:** Yes.

### UX-SHARED-004 — Custom checkboxes report as readonly

- **Severity:** MEDIUM
- **Category:** ACCESSIBILITY
- **Affected workflow:** Forms
- **Current behavior:** “OK to text or call,” public trial consent, Users/catalog Active, Sales “Mine” and “Active record” expose `states: [readonly]` (sometimes also checked).
- **User impact:** Assistive tech and automation think consent/filters cannot be changed.
- **Evidence:** `/leads/new`, `/trial`, `/activities`, `/settings/catalog`.
- **Recommended outcome:** Real checkbox semantics or `aria-checked` on a button; not a readonly input.
- **Phase 2:** Yes.

---

## Mobile / Responsive Findings

### UX-SHARED-005 — Phone staff layout is unusable

- **Severity:** HIGH
- **Category:** RESPONSIVENESS
- **Affected workflow:** All staff (MA especially, as the program asked)
- **Current behavior:** At 390×844 the rail remains visible (transform none). Content is a sliver or sits under the rail. Menu exists but the drawer is already open/stuck. Design system says below `lg` the rail is a drawer; runtime disagrees.
- **User impact:** Front desk on a phone cannot run intake or follow-up.
- **Evidence:** MA dashboard screenshot at 390; Sales opportunity crush at phone width.
- **Recommended outcome:** Same as UX-SHARED-001. Then re-QA household, follow-up, new lead, Sales work today, opportunity.
- **Phase 2:** Yes.

### UX-MA-013 — Public `/trial` is the only composed small-screen-adjacent surface

- **Severity:** LOW
- **Category:** (positive)
- **Current behavior:** Public header, one-person vs family, Me/My child, 16px controls. No staff rail.
- **Recommended outcome:** Use it as the visual bar for public only. Do not restyle staff to look like marketing.
- **Phase 2:** Preserve.

Tablet (768) was not a separate capture; 1440 already failed MA overlay, so 768 would as well until UX-SHARED-001 is fixed.

---

## Accessibility Findings

Covered above: UX-SHARED-003, UX-SHARED-004, plus:

### UX-SHARED-006 — Skip-to-content exists; focus order fights the overlay

- **Severity:** MEDIUM
- **Category:** ACCESSIBILITY
- **Current behavior:** Skip link is present. Because the rail is in the tree and often on top, keyboard users hit nav before page actions. Cancel/Keep it buttons from hidden dialogs appear in button lists.
- **User impact:** Keyboard operation of household/follow-up is hostile.
- **Evidence:** Button inventories on `/leads/2` included Keep it / Cancel intro while booking a trial.
- **Recommended outcome:** Fix dialog rendering and shell; then a focused keyboard pass in Phase 2 QA.
- **Phase 2:** Yes.

### UX-SHARED-007 — Contrast and touch targets

- **Severity:** LOW
- **Category:** ACCESSIBILITY
- **Current behavior:** `min-h-11` is used on many controls. DEV red rail / red “NEXT” copy is dense. Not a certification audit.
- **Recommended outcome:** After shell fix, check focus-visible on rail and primary buttons. Do not start a WCAG project.
- **Phase 2:** Only as part of shell/button pass.

---

## Workflow Friction Inventory

| ID | Friction | Extra steps / workaround |
|---|---|---|
| UX-SHARED-001 | Cannot click left column | Use DOM/keyboard or guess around the rail |
| UX-MA-001 | Convert after trial | Open More |
| UX-MA-002 | Join member | Leave household → Catalog → invent offering → return |
| UX-MA-003 | Call after trial | Manually create follow-up; system will not |
| UX-MA-005 | Book intro | Scroll past compensation |
| UX-MA-007 | Run an event | Create, then Sessions, then publish |
| UX-SALES-001 | Understand a deal | Scroll a form stack |
| UX-SALES-004 | See pipeline | Scroll past New opportunity; filter out Won |
| UX-SALES-005 | Pick a record in a select | Guess among duplicate names |
| UX-SALES-006 | Know who to call | Dashboard Work today is incomplete without next actions |
| UX-SALES-008 | Complete a call | Open Complete under a create form |

A technically possible workflow that still needs a spreadsheet of “who do I call / did they join” is a product problem. That is the current Sales state and the post-attendance Martial Arts state.

---

## Visual Design Problems

1. Staff rail overlay (CRITICAL).
2. Sales record pages = stacked admin forms.
3. Create-on-list layout.
4. Giant blocky dashboard cards with clipped labels (MA).
5. Sales phone header + rail together on desktop.
6. Sales subtitle “Acquisition.”
7. Duplicate visual weight of primary vs overflow actions (Schedule trial vs Convert).
8. Catalog and Settings as endless Save rows.
9. Leftover QA names and duplicate offers.

Public `/trial` and MA marketing copy are the visual high-water marks. Phase 2 should raise staff to that intentionality without turning CRM into a marketing site.

---

## Information Architecture Problems

1. Sales primary nav is a full sitemap.
2. Follow-up route is `/tasks` labeled Follow-up (fine once learned; not a defect).
3. MA dashboard work = confirmation calls only; attended-not-converted people disappear.
4. Compensation on the person trial panel.
5. Users / Security activity as top-level for every admin session in both products.
6. Sales Leads still in the main rail next to Companies (correct domain split, easy to start in the wrong place if the rail is a flat list).

Do not force MA household layout onto Sales company. Shared language, different records.

---

## Defects Found

| ID | Defect |
|---|---|
| UX-SHARED-001 | Staff nav `lg:static` / `-translate-x-full` not applied at runtime; overlay + stuck drawer |
| UX-SALES-009 | Sales `lg:hidden` header not applied at 1440px |
| UX-MA-002 | Convert cannot proceed with empty offering catalog (no empty-state recovery) |
| UX-SHARED-003 | Confirm dialogs exposed when closed |
| UX-SHARED-004 | Checkboxes exposed as readonly |

These are product defects in the running UI, not missing Salesforce features.

---

## Product Decisions Requiring Scott

Do not invent these in Phase 2. Use judgment only where noted.

1. **Empty membership offerings.** Should a new Martial Arts environment seed one offering per program, or must ADMIN create them, with Convert teaching that path? Phase 2 will still add empty-state UX either way.
2. **Post-attendance follow-up.** Should marking Attended create a conversion call automatically, or only if no open follow-up exists? Current code appears to cancel confirmation and stop.
3. **Sales nav grouping.** Collapse Campaigns/Offers/Proposals under a “Library” / “Admin” group vs keep them top-level for dogfooding discoverability?
4. **Lab sqlite cleanup.** Leftover Sales QA rows and duplicate offers. Protocol: do not reset for convenience. Scott may later ask for a disposable reset; not Phase 2 by default.
5. **Convert without catalog offering.** Allow an ad-hoc monthly amount vs require catalog. Domain currently requires Offering *.

Not opened: email/SMS, Stripe, auto Control Plane provision, Beauty, Core-domain promotion.

---

## Recommended Phase 2 Scope

Authorized by the program once this audit is durable. Optimize for product quality, not minimal diff.

**P2-0 Shared shell (must ship first)**  
Fix UX-SHARED-001 / 005 / 009. Desktop in-flow rail. Phone drawer. One CSS path in `@crm/core`. Runtime-verify MA and Sales at 1440 and 390.

**P2-1 Shared primitives**  
Page header, record header, list toolbar (search/filter + primary New), empty state, toast/inline success, dialog that is closed to AT, checkbox semantics. Only what MA and Sales need.

**P2-2 Sales visual/workflow (highest product attention)**  
Opportunity flagship (UX-SALES-001). Company workspace (002). Lists without leading create forms; active-stage default (004). Work today + missing next action (006, 007). Activity queue-first complete+next (008). Nav density and Acquisition subtitle (003). Discriminating labels in selects (005).

**P2-3 Martial Arts workflow quality**  
Household next-action after attendance (MA-001). Convert empty catalog (MA-002). Follow-up timing and post-attend work (MA-003, MA-011). Person panel disclosure (MA-005). Catalog/event/public-trial tightness (MA-006, 007, 009). Preserve marketing copy (MA-012).

**P2-4 Responsive + a11y QA**  
Phone and laptop on household, follow-up, new lead, Sales dashboard, company, opportunity, activities. Keyboard pass on shell, dialogs, complete+next.

**Out of Phase 2:** new CRM features, Beauty, Core promotion, VPS, wiping sqlite, cloning products.

---

## Explicitly Deferred Ideas

- Email / SMS send from either CRM
- Calendar sync
- Browser e-sign / customer portal
- Stripe / billing
- Salesforce-scale objects, Kanban, expected close, Demo entity
- Auto Control Plane customer/instance on Won
- Beauty product
- Promoting CRM domain into `@crm/core`
- Official S7/S8 live VPS/DNS/TLS
- WCAG certification program
- Resetting leftover lab databases

---

## Evidence / Runtime QA

| When | What |
|---|---|
| 2026-09-19 | MA `:5030` health 200, schema `0020_tidy_frog_thor` |
| 2026-09-19 | Sales `:5040` health 200 |
| 2026-09-19 | Created household Jordan Rivera `/leads/2`; scheduled Adult Fundamentals Sep 21 6:00 PM; marked attended |
| 2026-09-19 | Convert blocked on empty offerings; catalog confirmed empty |
| 2026-09-19 | Follow-up confirmation call created then gone after attendance |
| 2026-09-19 | Created Acquisition Event Saturday Open Mat `/marketing/events/1` |
| 2026-09-19 | Public `/trial` One person form |
| 2026-09-19 | Sales Work today, companies, `/companies/7`, `/opportunities/9`, `/activities?queue=overdue` complete panel, `/offers` |
| 2026-09-19 | CDP layout table in UX-SHARED-001 |
| 2026-09-19 | Screenshots: MA overlay on dashboard/household; public trial OK; Sales dashboard; Sales phone crush |

Phase 1 **SUCCESS** as investigation. Implementation starts in Phase 2 using this note as evidence.
