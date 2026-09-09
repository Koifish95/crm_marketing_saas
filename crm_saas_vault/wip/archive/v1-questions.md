# V1 Questions — Before Implementation

Read from `renzo_gracie_kaysville_customer_acquisition_system.md`. These are the decisions that would change schema, routes, or milestone order if answered later.

Please answer in-line, even briefly (`yes` / `no` / a short choice is enough). Suggested defaults are included where the spec already leans one way.

---

## How to use this file

- **Blocking** items should be settled before M0/M1.
- **Can wait** items can stay open until that milestone starts.
- If you want a default, say so. Do not invent gym process that has not been confirmed.

---

## 1. Existing repo vs greenfield

The working tree currently has almost nothing except the spec. Git still has a previous Nuxt 4 CRM on `branch_2`: contacts, pipeline, notes, local `nuxt-auth-utils` login, trial slots, sequences (simulated send), tickets, and a separate `website/` app. That earlier slice was never run.

**1.1 Blocking.** Should V1 start as a **new app from the spec** (new schema, new pages, new names: Lead not Contact), or **reuse / reshape** the existing scaffold?

Suggested default: greenfield in this repo, keep git history, do not migrate the old draft schema. The spec’s domain (`Lead`, `ContentItem`, `Campaign`, roles) does not match the old `contacts` / tickets / sequence-engine model.

**1.2 Blocking.** The old `website/` Nuxt site is also deleted in the working tree. Is that site **in V1**, **out of V1**, or **a separate project** that should not be rebuilt now?

Suggested default: out of V1. Public surface in V1 is only the acquisition lead form(s), not a marketing CMS.

**1.3 Can wait.** If greenfield: keep the old code on git history only, or restore it onto a branch for reference while building?

---

## 2. What “V1” actually includes

The spec lists four V1 modules (Leads, Content, Analytics, Integrations) and milestones M0–M10. M9 (Meta API) and M10 (messaging automation) are clearly later. M7 (public lead form) and M8 (integration stubs) sit on the line.

**2.1 Blocking.** Which milestones are **in V1**?

Options:

- A: M0–M5 (scaffold → DB → auth → leads → content → dashboard)
- B: M0–M7 (above + analytics + public `/trial` form)
- C: M0–M8 (above + empty Meta / Email / SMS “Not Connected” page)

Suggested default: **B**. Leads without a public form still require Scott to type every prospect. Integration stubs without providers add little.

**2.2 Blocking.** Is staff (Pedro / front desk) expected to **log in during V1**, or is V1 Scott-only with roles in the schema for later?

Suggested default: Scott-only operation, but `ADMIN` / `STAFF` / `VIEWER` exist from M2 so staff is not a rewrite later. Hide or don’t seed staff logins until needed.

**2.3 Can wait.** The spec shows a staff action bar (`Attended` / `No Show` / `Reschedule` / `Joined`) while also saying `NO_SHOW` is a later status. For V1, should **No Show** and **Reschedule** be real actions, or only Attended / Joined / Lost?

Suggested default: include No Show and Reschedule as actions that write history, even if `NO_SHOW` is not a separate pipeline column yet (e.g. stay `TRIAL_SCHEDULED` or move to `LOST` with a reason).

---

## 3. Auth and first user

**3.1 Blocking.** First admin account: **seeded local user** (like the old `admin@local` / env password), **invite-only create**, or **one-time setup screen** on empty database?

Suggested default: env-seeded admin for local/dev; no public signup.

**3.2 Can wait.** Password reset in V1?

Suggested default: no. Scott can reset via seed/env until email exists.

**3.3 Can wait.** Stick with **`nuxt-auth-utils`** (already used in the old scaffold) or pick something else?

Suggested default: `nuxt-auth-utils`. Spec asked for session auth, not an identity platform.

---

## 4. Lead model — people, programs, duplicates

**4.1 Blocking.** Kids leads: store **the child**, **the parent/guardian**, or **both** (child as lead, parent as contact fields)?

This matters for phone/email, SMS consent later, and who actually shows up.

Suggested default: one Lead record with `firstName`/`lastName` of the student, plus optional `guardianName` / `guardianPhone` / `guardianEmail` when program is kids.

**4.2 Blocking.** Confirm V1 programs:

- `ADULT_BJJ`
- `KIDS_BJJ`
- `MUAY_THAI`
- `OTHER`

Add/remove any (women’s, no-gi, wrestling, etc.)?

**4.3 Blocking.** Experience levels for V1 — closed list or free text?

If closed, proposed: `NONE` / `BEGINNER` / `SOME` / `ADVANCED` / `UNKNOWN`.

**4.4 Blocking.** Duplicate policy when the same phone or email is submitted again: **reject**, **update existing lead**, **create a new lead**, or **flag as possible duplicate and let Scott merge later**?

Suggested default: create is allowed; warn on detail/list when phone or email matches an open lead. No merge UI in V1.

**4.5 Blocking.** Required fields to create a lead (internal and public form may differ).

Proposed internal: first name + (phone **or** email).  
Proposed public `/trial`: first name, last name, phone, program, consent checkbox.

Is last name required? Is email required on the public form?

**4.6 Can wait.** Sources for manually created leads — closed list?

Proposed: `INSTAGRAM` / `FACEBOOK` / `WALK_IN` / `REFERRAL` / `WEBSITE` / `PHONE` / `OTHER`.

---

## 5. Status machine

The spec’s happy path is linear:

`NEW → CONTACTED → RESPONDED → TRIAL_SCHEDULED → TRIAL_ATTENDED → JOINED`  
plus `LOST`.

**5.1 Blocking.** Can Scott **skip** states (e.g. walk-in books a trial immediately: `NEW → TRIAL_SCHEDULED`)? Or must every lead pass through CONTACTED and RESPONDED?

Suggested default: allow forward skips; do not allow skipping backward without an explicit reopen action.

**5.2 Blocking.** Can a lead go **backward** (Joined by mistake, trial date wrong)?

Suggested default: yes, with a required note, and a history row for every change.

**5.3 Blocking.** `LOST` reasons in V1: none, free text, or a small list (`NO_RESPONSE` / `NOT_INTERESTED` / `WRONG_PROGRAM` / `PRICE` / `SCHEDULE` / `OTHER`)?

Suggested default: optional free-text reason. No extra statuses (`UNRESPONSIVE`, `NOT_READY`, `DISQUALIFIED`) in V1.

**5.4 Blocking.** After a no-show, what should the lead become?

- stay `TRIAL_SCHEDULED`
- `LOST`
- a later `NO_SHOW` column
- back to `RESPONDED` / follow-up

Suggested default: stay visible as trial-related (not JOINED/LOST) with `trialNoShowAt` recorded, so Scott can reschedule without losing the funnel count of “scheduled.”

---

## 6. Trials — without becoming a gym scheduler

Complete class scheduling is a V1 non-goal. The old scaffold still had `trialSlots` + capacity. The spec only has `trialDate` on the lead.

**6.1 Blocking.** V1 trial model:

- A: a **datetime (or date + time) on the Lead** only
- B: **reusable class slots** with capacity (old scaffold)
- C: date only, time optional

Suggested default: **A**. Staff/Scott types “Thu 6:00 PM Adult fundamentals” as datetime + optional label. No slot inventory in V1.

**6.2 Blocking.** Can one lead have **multiple trials** over time, or only the latest `trialDate`?

Suggested default: one current trial on the lead; reschedule overwrites `trialDate` and writes history. No trial-booking table in V1.

**6.3 Can wait.** Does the gym already have a published class schedule we should encode as dropdowns (program + typical times), or is free datetime enough?

**6.4 Can wait.** Who currently books trials today (front desk, Pedro, the prospect via a link, Scott)? V1 can stay “Scott enters the date” if that is the real process for now.

---

## 7. Membership, money, commission

Adult membership is `$175/month`. Compensation is described as 50% of membership cost when a member joins through Scott’s social activity. Attribution is deferred.

**7.1 Blocking.** For V1 MRR on the dashboard, which programs have a **known monthly rate**?

- Adult BJJ: $175 — confirmed?
- Kids?
- Muay Thai?
- Family / intro specials / paid trials?

If unknown, V1 can store `monthlyRate` on join (default 175 for adult) rather than hard-coding one price.

**7.2 Blocking.** What does **Joined** mean in V1, since billing is out of scope?

- Scott/staff marks Joined after the gym confirms signup
- Joined only when an external member ID is pasted in
- something else

Suggested default: manual mark + optional `monthlyRate` + `joinedAt`. No payment processor.

**7.3 Blocking.** Should V1 show **estimated commission** (50% of first month, adult-only, etc.), or only gym MRR added?

Suggested default: gym-facing MRR only. Commission is a Scott-side concern and attribution is deferred — putting $87.50 on the gym dashboard is misleading until rules exist.

**7.4 Can wait.** Intro offers (e.g. paid week vs free class): does “trial” always mean **free class**, or do paid intros exist?

---

## 8. Campaigns and content ↔ leads

The spec wants `source`, `campaignId`, `contentId` on leads, and a Campaign entity, but does not define Campaign fields.

**8.1 Blocking.** Is **Campaign** a first-class V1 entity (name, dates, channel, offer, UTM), or just a **string tag** on leads/content until ads exist?

Suggested default: lightweight Campaign table (`name`, `slug`, `channel`, `active`, timestamps). No ad-spend fields in V1.

**8.2 Blocking.** How will a lead get a `contentId` while posting is still **manual in Meta Business Suite**? Honor system dropdown, UTM on `/trial`, both, or leave `contentId` optional and unused until later?

Suggested default: optional. Public form captures `?source=&campaign=`. Content link is manual on the lead if Scott knows it.

**8.3 Can wait.** Content calendar view in M4, or list + planned date is enough for V1?

Suggested default: list/filter by status and planned date. Calendar only if the list is painful.

---

## 9. Content and media

**9.1 Blocking.** Media in V1: **URL only** (Drive, Meta, local path pasted), **file upload to disk**, or **no media field used yet**?

Suggested default: optional URL / filename string. No upload service in V1.

**9.2 Can wait.** Confirm content types for V1: `TECHNIQUE`, `BEGINNER_FAQ`, `TESTIMONIAL`, `INSTRUCTOR`, `COMPETITION`, `KIDS`, `CULTURE`, `PROMOTION`, `EDUCATIONAL`. Any to drop or add?

**9.3 Can wait.** Manual performance metrics on a content item in V1 (impressions, likes, etc.), or wait for M6?

Suggested default: optional integer fields Scott can type after checking Insights. No charts of Meta metrics until some rows exist.

---

## 10. Public lead form

**10.1 Blocking.** V1 public routes: **only `/trial`**, or also `/adults`, `/kids`, `/offer/:campaign`?

Suggested default: `/trial` plus query params (`source`, `campaign`). Extra landing pages later.

**10.2 Blocking.** After submit: thank-you only, or also “we’ll text you” copy? (SMS is not in V1.)

**10.3 Blocking.** Spam: honeypot, rate limit, Turnstile/hCaptcha, or all of the above?

Suggested default: honeypot + IP rate limit. Captcha if the form is on a real domain.

**10.4 Blocking.** Store **SMS/email consent** on the public form in V1 even though send is later?

Suggested default: yes. A checkbox now is cheaper than backfilling consent.

**10.5 Can wait.** Privacy policy URL for the form — gym existing page, a stub in this app, or none until hosted?

---

## 11. Analytics

**11.1 Blocking.** Timezone for “this month” and trial times: **America/Denver**?

**11.2 Can wait.** Chart library when M5/M6 starts: **none in V1** (tables + percents), Chart.js, or ECharts?

Suggested default: no chart package until M6. Dashboard can be numbers and a simple funnel table.

**11.3 Can wait.** Date range on V1 dashboard: current month only, or current month + last 30 days toggle?

---

## 12. Integrations page

**12.1 Blocking.** Is an Integrations page with Meta / Email / SMS **“Not Connected”** in V1 (M8), or skip until a provider is chosen?

Suggested default: skip as a product page in V1; keep empty `server/services/meta|email|sms` folders so later work has a home.

---

## 13. Hosting, domain, and “online”

The spec says the app must be online (not Scott’s PC as production). Hosting provider and domain are still pending.

**13.1 Blocking.** For the first usable V1, is **local `pnpm dev` enough**, or do you need **Docker on a VPS** in the same build?

Suggested default: local + Dockerfile/compose in M0 so deploy is not a surprise, but do not buy a VPS as part of coding V1.

**13.2 Can wait.** Any domain/subdomain preference once it is public (`trial.` vs `app.` vs gym domain path)?

**13.3 Can wait.** Who should own the production accounts (domain, VPS, Meta): **gym (Brian)** with Scott as admin, per the earlier decision log?

---

## 14. Gym process still unknown

These are in the spec’s pending list. They do not have to be perfect, but a wrong assumption here becomes the wrong pipeline.

**14.1 Blocking enough to guess.** When a stranger DMs Instagram today, **who replies**, and how does that person give Scott a lead? (Screenshot, shared inbox, they don’t, Scott handles it.)

**14.2 Blocking enough to guess.** When someone shows up for a trial, **who marks attendance** today, and with what tool (paper, memory, another app)?

**14.3 Can wait.** Membership system of record (Zen Planner, Mindbody, WellnessLiving, Pike13, Kicksite, spreadsheet, none)? V1 will not sync; knowing the name avoids designing a fake “member ID” that collides.

**14.4 Can wait.** Previous vendor: was it GHL / something else, and is **any lead list export** available to import later? V1 should not import real PII until auth + backups exist.

**14.5 Can wait.** Who may see leads besides Scott (Brian, Pedro, front desk)? Affects whether VIEWER is used immediately.

---

## 15. Brand, copy, and legal tone

**15.1 Can wait.** Internal UI name: “Renzo Gracie Kaysville Acquisition”, “Renzo CRM”, or something else?

**15.2 Can wait.** Any brand colors/logo to use, or a clean functional UI first?

**15.3 Blocking if `/trial` is in V1.** Kids data: any gym rule that **minors must not** be stored without guardian contact? (Leaning yes — see 4.1.)

---

## 16. Implementation order and working agreement

The spec says Cursor should get bounded milestones, reviewed before the next one.

**16.1 Blocking.** After you answer this file, should the next step be **M0 scaffolding only**, then stop for review?

Suggested default: yes.

**16.2 Blocking.** Restore the deleted working tree first, or leave files deleted and generate the new tree?

Suggested default: leave deleted; new files replace the draft. History remains in git.

**16.3 Can wait.** Tests: the spec wants tests per milestone. For M0–M3, is **API + schema test** enough, or do you want UI tests too?

Suggested default: Zod/API tests for leads; no Playwright until the public form.

---

## Answer template

Copy this block to the top or reply in chat:

```text
1.1
1.2
1.3
2.1
2.2
2.3
3.1
3.2
3.3
4.1
4.2
4.3
4.4
4.5
4.6
5.1
5.2
5.3
5.4
6.1
6.2
6.3
6.4
7.1
7.2
7.3
7.4
8.1
8.2
8.3
9.1
9.2
9.3
10.1
10.2
10.3
10.4
10.5
11.1
11.2
11.3
12.1
13.1
13.2
13.3
14.1
14.2
14.3
14.4
14.5
15.1
15.2
15.3
16.1
16.2
16.3
```

Anything marked “use the suggested default” can be skipped.
