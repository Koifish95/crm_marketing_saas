---
type: note
status: draft
area: process
updated: 2026-08-28
tags:
  - wip
  - handoff
  - m4
---

# M4 completion handoff — 2026-08-28

Inspection report for architect review. Source of truth is the repository at inspection time, not intended design. This file is WIP inbox material; it was **not** committed as part of this task.

Inspection date: 2026-08-28. Milestone implementation date: 2026-08-27.

---

# 1. Git State

| Item | Value |
|---|---|
| Current branch | `M4` |
| Tracks | `origin/M4` |
| HEAD | `b35c429ab0ba746dd688dc9a87bc3499aee573a1` |
| HEAD message | `docs: record M4 commit hash` |
| M4 implementation commit | `17d053d1c81dc4a9bb01f107b422c7f48ce8a1c8` |
| M4 implementation message | `feat(intro): implement M4 public trial scheduling` |
| HEAD pushed? | **Yes.** `git status -sb` reports `## M4...origin/M4` with no ahead/behind. `git rev-parse origin/M4` equals HEAD. |
| Remote | `https://github.com/Koifish95/renzo-crm.git` — `M4 -> M4` at `b35c429` |
| Working tree at inspection | **Clean** (`nothing to commit, working tree clean`) |

Parent of the M4 feat commit is `3d465ba` (merge of M0–M3 `branch_2` into master, then this branch).

## Untracked / modified at inspection

None, until this handoff file is created. After this write, the expected remaining local file is:

- `vault/wip/M4_Completion_Handoff_2026-08-28.md` (this report; **not committed**, per instructions)

## Intentionally uncommitted / ignored local files

**Gitignored (not staged):**

- `.env` (local secrets; `NUXT_AUTH_PASSWORD` was set to `setup` during M4 QA)
- `data/renzo.sqlite` (working DB)
- `data/renzo-m1-fresh.sqlite`, `data/renzo-m3-fresh.sqlite`, `data/renzo-m4-fresh.sqlite` (fresh-migrate artifacts)
- Obsidian local UI under `vault/.obsidian/`: `workspace.json`, `appearance.json`, `types.json`, `plugins/` (dataview, tasks, table-editor)

**Tracked Obsidian files still in git** (pre-existing; M4 `.gitignore` added `graph.json` but did not untrack it):

- `vault/.obsidian/app.json`
- `vault/.obsidian/community-plugins.json`
- `vault/.obsidian/core-plugins.json`
- `vault/.obsidian/graph.json` (now gitignored for future changes; still present in the tree)

## M5 started?

**NO.** Evidence:

- `vault/Milestones.md`: M5 “Not started”; checkbox unchecked
- `vault/Implementation-State.md`: “Stop before M5”; no automatic FollowUpTask creation
- No `tests/m5/` directory
- `git ls-files` has no M5 implementation files; `shared/schemas/follow-up-task.ts` is M1 domain leftover, unused by M4 booking
- `bookPublicTrial` does not insert `follow_up_tasks`

---

# 2. M4 Scope Summary

M4 implements a public intro-booking funnel driven by **persisted availability configuration**, not hard-coded form options.

## Implemented end-to-end flow

```text
Public prospect (no login)
    → GET /trial  (default layout)
    → Adult or Kids path
    → GET /api/public/availability  (enabled rules + exceptions, 14 Denver days)
    → POST /api/public/trial  (Zod + honeypot + in-memory rate limit)
    → server re-resolves slotId (client IDs are not trusted as times)
    → Lead created (or attached by matching phone)
    → Trial row status SCHEDULED
    → Lead status TRIAL_SCHEDULED
    → LeadStatusHistory: NEW (on create) then TRIAL_SCHEDULED (via createTrial)
    → existing M3 CRM list/detail/dashboard read the same Lead + Trial rows
```

ADMIN configures which weekly classes accept first-time trials at `/settings/intro-availability`. Public `/trial` only shows resolved upcoming slots.

## Deferred (not implemented)

- Automatic next-day FollowUpTask (M5)
- SMS / email / WhatsApp send or confirmation messages
- Meta OAuth, Pixel, webhooks, Lead Ads, Messenger
- Class capacity, waitlists, instructor calendars
- Privacy-policy page
- Distributed / multi-instance rate limiting
- Membership billing

---

# 3. Files and Components

Relative to `3d465ba` → `17d053d` (implementation commit). `b35c429` only amends two vault notes with the commit hash.

## Database / schema

| File | Purpose |
|---|---|
| `server/database/schema/index.ts` | `users.username`; tables `intro_availability_rules`, `intro_exceptions`; relations |

## Migrations

| File | Purpose |
|---|---|
| `drizzle/migrations/0003_chubby_butterfly.sql` | Create intro tables; add `users.username` with backfill + unique index |
| `drizzle/migrations/meta/0003_snapshot.json` | drizzle-kit snapshot |
| `drizzle/migrations/meta/_journal.json` | Journal entry idx 3 |

## Seed / bootstrap

| File | Purpose |
|---|---|
| `drizzle/intro-seed.ts` | Renzo weekly schedule as `INTRO_RULE_SEED` |
| `drizzle/seed.ts` | Idempotent programs, intro rules by `seedKey`, admin username/password |

## Server / API

| File | Purpose |
|---|---|
| `server/api/public/availability.get.ts` | Unauthenticated slot list |
| `server/api/public/trial.post.ts` | Unauthenticated booking |
| `server/api/intro-availability/index.get.ts` | Auth: list rules |
| `server/api/intro-availability/index.post.ts` | ADMIN: create rule |
| `server/api/intro-availability/[id].patch.ts` | ADMIN: update rule (including enabled) |
| `server/api/intro-exceptions/index.get.ts` | Auth: list exceptions |
| `server/api/intro-exceptions/index.post.ts` | ADMIN: create exception |
| `server/api/intro-exceptions/[id].delete.ts` | ADMIN: delete exception |
| `server/api/auth/login.post.ts` | Login body field `identifier` |

## Services / domain logic

| File | Purpose |
|---|---|
| `server/services/availability.ts` | CRUD + slot expansion + `getBookableSlot` |
| `server/services/public-trial.ts` | Booking, source aliases, phone+time idempotency |
| `server/services/auth.ts` | Username or email lookup |
| `server/services/authorization.ts` | `/trial` and `/api/public` as public paths |
| `server/utils/rate-limit.ts` | In-memory IP limiter |
| `server/utils/env.ts` | Optional `NUXT_AUTH_USERNAME` in schema (not applied in `getServerEnv` parse object) |

M3 `server/services/leads.ts` is **reused** (`createLead`, `createTrial`, `getLead`, `changeLeadStatus`) and was not rewritten for M4.

## Validation

| File | Purpose |
|---|---|
| `shared/schemas/intro.ts` | Rule, exception, public availability query, public trial Zod |
| `shared/schemas/auth.ts` | `identifier` or legacy `email` |
| `shared/utils/intro.ts` | Horizon, weekdays, kids bands, `slotMatchesAge` |
| `shared/utils/time.ts` | Denver wall-clock conversion helpers |

## Public frontend

| File | Purpose |
|---|---|
| `app/pages/trial.vue` | Public booking UI |
| `app/layouts/default.vue` | Links to `/trial` and `/login` |
| `app/pages/index.vue` | Home link to `/trial` |

## Authenticated / admin frontend

| File | Purpose |
|---|---|
| `app/pages/settings/intro-availability.vue` | ADMIN config UI |
| `app/layouts/internal.vue` | “Intro schedule” nav, ADMIN-only link |
| `app/pages/login.vue` | Label “Username”; posts `identifier` |

## Authentication / RBAC

Covered by login schema/service, `requireAuthUser` / `requireAdminUser`, public-path list. No new role enum.

## Tests

| File | Purpose |
|---|---|
| `tests/m4/intro.test.ts` | Availability, exceptions, kids bands, booking, retry, campaign |
| `tests/m2/auth.test.ts` | Username `admin` / `setup`; `/trial` public |
| `tests/helpers/db.ts` | `TEST_ADMIN_USERNAME=admin`, `TEST_ADMIN_PASSWORD=setup` |

## Documentation

Permanent vault notes listed in §21, plus `README.md`, `AGENTS.md`, `vault/wip/Renzo_Gracie_Kaysville_M4_Cursor_Prompt.md`, `vault/wip/_index.md`.

## Configuration

| File | Purpose |
|---|---|
| `.env.example` | `NUXT_AUTH_USERNAME=admin`, `NUXT_AUTH_PASSWORD=setup` |
| `.gitignore` | `vault/.obsidian/graph.json` |

Omitted as non-informative: no other generated junk in the commit besides the drizzle snapshot/journal required for migrations.

---

# 4. Database and Schema Changes

Migration: **`0003_chubby_butterfly.sql`** (journal idx 3). Prior chain `0000`–`0002` unchanged.

## New tables

### `intro_availability_rules`

| Column | Type / notes |
|---|---|
| `id` | integer PK autoincrement |
| `seed_key` | text NOT NULL, unique |
| `program_id` | integer NOT NULL FK → `programs.id` |
| `weekday` | integer NOT NULL (0=Sunday … 6=Saturday, America/Denver) |
| `start_minute` | integer NOT NULL (minutes from Denver midnight) |
| `end_minute` | integer nullable |
| `name` | text NOT NULL |
| `age_min` / `age_max` | integer nullable (Kids bands; Adult seed leaves null) |
| `enabled` | integer boolean, default true, NOT NULL |
| `created_at` / `updated_at` | integer UTC ms |

Indexes: unique `seed_key`; `program_id`; `weekday`.

No SQL CHECK on weekday range or `kind`; constraints live in Zod / service code.

### `intro_exceptions`

| Column | Type / notes |
|---|---|
| `id` | integer PK autoincrement |
| `on_date` | text NOT NULL (`YYYY-MM-DD` Denver civil date) |
| `kind` | text NOT NULL: `CLOSE_DATE` \| `CLOSE_RULE` \| `OPEN_SLOT` (application enum, not DB ENUM) |
| `rule_id` | integer nullable FK → `intro_availability_rules.id` |
| `program_id` | integer nullable FK → `programs.id` |
| `name`, `start_minute`, `end_minute`, `age_min`, `age_max` | used by `OPEN_SLOT` |
| `note` | text nullable |
| `created_at` / `updated_at` | integer UTC ms |

Indexes: `on_date`; `rule_id`.

FKs: `ON UPDATE no action ON DELETE no action`.

## New columns on existing tables

`users.username` text.

- Drizzle schema: `.notNull()` + unique index `users_username_unique`
- SQL migration: `ALTER TABLE users ADD username text` (**nullable add**), backfill, then unique index
- Backfill: `admin@local` → `admin`; else email local-part; else lower(email)

`leads`, `trials`, `lead_status_history` were **not** altered. Public bookings use existing Lead/Trial/history rows.

## Representation mapping

| Concern | Implementation |
|---|---|
| Recurring availability | One `intro_availability_rules` row per weekly class |
| Date exceptions | `intro_exceptions.kind` + `on_date` |
| Adult vs Kids | `program_id` → `ADULT_BJJ` / `KIDS_BJJ` |
| Kids age ranges | `age_min` / `age_max` on the rule (and on `OPEN_SLOT`) |
| Enabled/disabled | `intro_availability_rules.enabled`; public expansion queries `enabled = true` |

## Seed

`drizzle/intro-seed.ts` lists 18 Adult + 14 Kids rules matching the prompt’s published Kaysville schedule (including 6:00 AM, Study Hall, Fun Day, Striking 101 stored under **Adult BJJ program**, not the inactive `STRIKING` program).

`seedDatabase`:

- Inserts a rule only if `seedKey` is absent
- **Does not** update existing rows — ADMIN disable survives re-seed
- Programs still idempotent by `code`
- Admin upsert by email then username; hashes password with scrypt

Repeated seeding is **idempotent** for intro rules and programs.

## Migration results (recorded 2026-08-27, not re-run during this inspection)

| Gate | Result |
|---|---|
| Fresh DB `DATABASE_URL=file:./data/renzo-m4-fresh.sqlite` then `pnpm db:setup` | **Passed** (exit 0) |
| Fresh seed (part of `db:setup`) | **Passed** |
| Existing local DB `pnpm db:migrate` then `pnpm db:seed` | **Passed** (exit 0) |

This inspection did not re-execute migrate/seed. Artifacts `data/renzo-m4-fresh.sqlite` and `data/renzo.sqlite` remain gitignored.

---

# 5. Public `/trial` Implementation

**Authentication:** not required. `trial.vue` uses `layout: 'default'` (no `auth` middleware). `isPublicPath('/trial')` is true. Logged-in staff can still open it.

## Adult flow

1. Toggle Adult.
2. First name, last name, phone (required), email optional, experience select (default “Not sure” / `UNKNOWN`).
3. Slots from `GET /api/public/availability?program=ADULT_BJJ` (no age).
4. SMS/email consent checkboxes (optional, default false).
5. Hidden honeypot `company`.
6. Submit `POST /api/public/trial` with `path: 'ADULT'`.

## Kids flow

1. Toggle Kids. Labels become parent first name; child fields appear.
2. Child first name required; child last name optional; child age required (HTML `min=4` `max=16`); relationship default `parent`.
3. Until age is entered, UI says “Enter your child’s age…” and availability query has no age → API returns `[]`.
4. Slots from `GET /api/public/availability?program=KIDS_BJJ&age=<n>`.
5. Experience is **not** shown; submit sends `UNKNOWN`.

## Fields

| | Adult | Kids |
|---|---|---|
| Required (UI + Zod) | first, last, phone, slotId | parent first/last, phone, child first, child age, slotId |
| Optional | email, experience, consents | child last, relationship, email, consents |
| Phone | Zod `trim().min(7).max(32)`; HTML `required` | same |
| Program | inferred from path → `ADULT_BJJ` | `KIDS_BJJ` |
| Experience | select, default `UNKNOWN` | always `UNKNOWN` |
| Guardian | n/a | Lead = parent names; `participant*` + `guardianRelationship` |
| Age / DOB | n/a | **integer age only**. No date of birth. Existing `leads.participant_age` reused. |

Consent: `smsConsent` / `emailConsent` booleans. `createLead` sets `smsConsentAt` / `emailConsentAt` when true. Not required to submit.

## Availability display

- Horizon: `BOOKING_HORIZON_DAYS = 14` in `shared/utils/intro.ts` (today + 13 more Denver calendar dates via `listCalendarDates(today, 14)`).
- Timezone: America/Denver. Persist UTC ms. Display via `formatDenverLongDate` / `formatMinuteOfDay` (not ad-hoc Vue TZ math).
- Grouped by date; radio per slot: time, optional end, class `name`.
- Copy states times are America/Denver, next 14 days.

## Empty availability

Kids with no age: helper text, no radios.  
Otherwise: “No upcoming intro times for that selection.” Submit stays disabled (`:disabled="pending || !form.slotId"`).

## Confirmation

On success, the form is replaced by “You’re scheduled” (client state only): participant or first name, program name, class name, Denver long date, start time. Neutral copy: gym has it on the calendar; no SMS/email promise.

Refresh after success **re-shows the form** (confirmation is not URL/persisted). Not separately QA’d in a browser.

API JSON also returns `ok`, `reused`, `confirmation.leadId` (see §12).

---

# 6. Availability Engine

Algorithm in `listPublicSlots` (`server/services/availability.ts`):

1. Kids without `age` → `[]`.
2. Load active program; inactive/missing → `[]`.
3. Load **enabled** rules for that program.
4. Load exceptions with `on_date` in `[today, lastHorizonDate]`.
5. Build `CLOSE_DATE` set and `CLOSE_RULE` set keyed `YYYY-MM-DD:ruleId`.
6. For each Denver calendar date in the horizon:
   - If date is **not** `CLOSE_DATE`: emit a slot for each enabled rule whose `weekday` matches, not `CLOSE_RULE`’d, age-matching, and start **strictly after now**.
   - Always (even on `CLOSE_DATE`): emit `OPEN_SLOT` rows for that date/program if age-matching and not in the past.
7. Sort by `scheduledAt` then name.

Slot IDs: `rule:{id}:{YYYY-MM-DD}` or `exception:{id}`.

## Behavior details

| Topic | Actual behavior |
|---|---|
| Recurring → dates | Weekday number vs Denver weekday of each horizon date; `denverWallToUtc(date, startMinute)` |
| Disabled rules | Omitted from the enabled query; `getBookableSlot` also rejects `!rule.enabled` |
| `CLOSE_DATE` | Hides **recurring** slots that day; **does not** hide `OPEN_SLOT` |
| `CLOSE_RULE` | Hides one rule on one date |
| `OPEN_SLOT` | Supported; extra one-off |
| Precedence | CLOSE_DATE blocks recurring only; OPEN_SLOT still applies; CLOSE_RULE is per rule |
| Horizon | 14 Denver days including today |
| Past | `scheduled.getTime() <= nowMs` skipped; extra same-day check `startMinute <= nowParts.minuteOfDay` |
| Duplicate generated slots | **No merge.** Two rules at the same weekday/time (e.g. Tue 7:00 Gi and Striking 101) both appear |
| Capacity | None (prompt: do not invent) |
| Submitted slot still bookable | `getBookableSlot` parses ID, then **re-runs `listPublicSlots`** and requires an exact ID match |

Prompt difference: horizon was left to implementer; 14 days is a chosen constant, not gym-specified. Prompt did not require slot-ID encoding; this is an implementation detail.

---

# 7. Admin Availability UI

- **Route:** `/settings/intro-availability`
- **Page middleware:** `auth` (any logged-in user)
- **Nav link:** only if `user.role === 'ADMIN'`
- **Writes:** `requireAdminUser` on POST/PATCH/DELETE
- **Reads:** `requireAuthUser` on GET lists

## Recurring display

Two groups: Adult (`ADULT_BJJ`) and Kids (`KIDS_BJJ`). Each row: weekday, start–end, name, optional ages, “disabled” badge. ADMIN sees Enable/Disable.

## Add

ADMIN form: program, weekday, start as **minutes from midnight** (placeholder `1080`), optional end minutes, name, optional age min/max. Posts `enabled: true`.

## Edit

- **UI:** enable/disable only. No in-page editor for name, weekday, times, ages.
- **API:** `PATCH /api/intro-availability/:id` accepts partial `updateIntroAvailabilityRuleSchema` (program, weekday, times, name, ages, enabled). Field edit is possible via API, not via the UI.

## Delete recurring

**Not implemented.** No DELETE route, no service `deleteIntroRule`, no UI control. Disable is the supported hide.

## Date exceptions

List `onDate · kind · name · note`. ADMIN can Remove (`DELETE`). Add form: date, kind (`CLOSE_DATE` / `CLOSE_RULE` / `OPEN_SLOT`), conditional class or program/name/start, optional note.

Validation: Zod on APIs; service requires `ruleId` for `CLOSE_RULE` and program+name+start for `OPEN_SLOT`.

## Usability decisions

- Minutes-from-midnight instead of a clock picker for add-rule (and OPEN_SLOT start).
- `minutesFromInput` exists for `HH:MM` on exceptions; add-rule uses `Number(form.startMinute)` only — `"18:00"` would be `NaN` if typed there.
- Program select on add-rule includes **all** `/api/programs` rows (including inactive Striking/Wrestling).

## STAFF / VIEWER

| | UI | API |
|---|---|---|
| STAFF | No nav link; can open URL; sees lists; no Enable/Add/Remove buttons (`canEdit` is ADMIN) | GET 200; POST/PATCH/DELETE **403** |
| VIEWER | Same as STAFF for this page | Same |
| ADMIN | Nav + full write UI | GET/POST/PATCH/DELETE |

STAFF/VIEWER HTTP 403 on writes was **not** exercised in M4 manual HTTP QA (unit `isAdmin` only). See §17.

---

# 8. Kids Age-Band Behavior

Bands in `KIDS_AGE_BANDS` (documentation helper): Ninjas 4–7, Samurai 8–11, Future Champs 12–16.

**Age calculation:** none. Prospect types an integer. Not derived from DOB.

**Stored:** `leads.participant_age` integer; also `participant_first_name`, optional last name, `guardian_relationship` (default `'parent/guardian'` in service if Kids and empty).

**Mapping:** `slotMatchesAge(age, ageMin, ageMax)` — inclusive. A slot with null min and null max matches any age (Adult rules). Kids seed sets both bounds.

**Fun Day:** one rule `kids-fun-fri-1615`, name `Fun Day — Ninjas & Samurai`, `ageMin: 4`, `ageMax: 11`. Shown to ages 4–11 (Ninjas **and** Samurai). Future Champs (12–16) do not see it. That is the special handling: overlapping age range on that row, not a separate join table.

### Boundaries (from code; automated tests used 5, 6, 9, 13, 14, not every edge)

| Age | Matching seeded names |
|---|---|
| 4, 7 | Ninjas classes + Fun Day |
| 8, 11 | Samurai classes + Fun Day |
| 12, 16 | Future Champs only |
| 3, 17 | No seeded slots (`slotMatchesAge` fails all Kids rules). HTML input `min=4` `max=16` blocks UI; **API allows 0–120** and would return empty slots then fail booking if a slotId were forced |

Kids without age: no slots (API and UI).

---

# 9. Booking Transaction

`POST /api/public/trial` → `bookPublicTrial`:

1. Trim phone; empty → domain error.
2. Resolve program from path; inactive → error.
3. `getBookableSlot(slotId, { age })`; program mismatch → error.
4. Optional campaign slug: load active Campaign by slug; ignore if missing/inactive (**does not create**).
5. If any Lead with that **exact phone string** already has a `SCHEDULED` Trial with the same `scheduledAt` ms → return `{ reused: true, lead, slot }` (no new rows).
6. Else `existingLead` = most recent Lead with that phone (or none).
7. `run(tx)`:
   - If existing Lead: `createTrial` only (may `changeLeadStatus` to `TRIAL_SCHEDULED` if current status is NEW/CONTACTED/RESPONDED/NO_SHOW).
   - Else: `createLead` (status **NEW**, history “Lead created.”) then `createTrial` (history “Trial scheduled.” → `TRIAL_SCHEDULED`).
8. Trial status always `SCHEDULED` on insert. Label `{className} · {date}`. Notes `Booked from public /trial.`
9. Return `{ reused: false, lead, slot }`.

**Services reused from M3:** `createLead`, `createTrial`, `getLead`, `changeLeadStatus` in `server/services/leads.ts`.  
**New:** `public-trial.ts`, `availability.ts`.

**Transaction boundary:**

```ts
typeof db.transaction === 'function'
  ? await db.transaction(async tx => run(tx as unknown as Database))
  : await run(db)
```

Drizzle libsql `db` typically has `transaction`. If that call is missing, createLead and createTrial run sequentially **without** a wrapping transaction.

**Partial Lead without Trial:**

- Inside a working SQLite transaction: should roll back.
- There is **no automated test** that fails after `createLead` and asserts no leftover Lead.
- Public invalid-slot test asserts phone `8015550199` is not inserted (failure **before** createLead).
- Idempotent retry after a successful book does not create a second Trial (tested).

If `createTrial` runs on an existing Lead whose status is already `TRIAL_SCHEDULED` / `JOINED` / `LOST`, `createTrial` still inserts a Trial but **does not** change status (M3 `autoScheduleFrom` list). Public attach-to-existing-phone uses that same function.

Public booking `changedByUserId` is null (no staff actor).

---

# 10. Duplicate / Retry / Idempotency Behavior

Internal CRM policy is **unchanged**: phone/email not unique; UI warns; no merge.

| Scenario | Actual public behavior |
|---|---|
| Duplicate phone, **same** `scheduledAt`, Trial still `SCHEDULED` | Reuse that Lead + Trial; `reused: true`; no new rows |
| Duplicate phone, **different** slot/time | Attach a **new** Trial to the **most recent** Lead with that phone; `reused: false`; no new Lead |
| Duplicate email only | **Not consulted.** Matching is phone-only. New Lead if phone is new |
| Existing Lead, new trial time | New Trial on that Lead (most recent phone match) |
| Browser double-click | UI disables submit while `pending`; server retry key is phone + scheduled ms |
| Network retry of identical POST | Same as idempotent path if first succeeded |
| Page refresh after success | Confirmation is Vue state only; form returns. Repeat submit would hit idempotency **if same phone+slot still selected** |
| Identical booking request | One Lead, one Trial (tested) |
| Different phone, same class slot | **Second booking allowed** (no capacity) |

Phone match is `eq(leads.phone, phone)` after **trim only** — no digit normalization. `8015550100` and `801-555-0100` are different keys.

Email is not part of the public dedupe key.

Honeypot `company` non-empty → Zod 400, no booking.

Rate limit: 8 POSTs / 10 minutes / IP, in-memory. Counts failures too. Not an idempotency store.

---

# 11. Attribution

Query: `/trial?source=instagram&campaign=fall-adult-bjj`. Vue copies `route.query.source` / `campaign` into the POST body.

## Source

`resolvePublicSource`:

| Input (case-insensitive) | Stored `leads.source` |
|---|---|
| `instagram` | `INSTAGRAM` |
| `facebook` | `FACEBOOK` |
| `website` | `WEBSITE` |
| `phone` | `PHONE` |
| `walk_in` / `walk-in` | `WALK_IN` |
| `referral` | `REFERRAL` |
| `other` | `OTHER` |
| missing / unknown (`garbage`) | **`WEBSITE`** (not rejected) |

Zod allows optional string max 40. Schema also has unused optional `sourceCode` (`leadSourceSchema`); the handler **does not** pass `sourceCode` into `bookPublicTrial`.

## Campaign

Slug lowercased; must match an **existing active** `campaigns.slug`. Otherwise `campaignId` stays unset. **No public Campaign insert.**

Invalid/unknown campaign: booking still succeeds; campaign ignored (tested with `not-a-real-campaign` on retry).

No attribution: source `WEBSITE`, no campaign.

## Deferred for Meta (M6)

No Meta IDs, Pixel, Graph, Lead Ads, or ad-to-campaign mapping. Query `source`/`campaign` are gym/website UTM-style only.

---

# 12. Security and RBAC

## Unauthenticated / public

**Can:** `/`, `/login`, `/trial`, `GET /api/health`, `POST /api/auth/login`, `GET/POST /api/public/*`, nuxt-auth-utils session routes.

**Cannot (handlers use `requireAuthUser` unless public):** CRM pages (`auth` middleware redirect to login), `GET/PATCH /api/leads*`, notes, status, trials, dashboard, programs/campaigns list used by CRM, intro-availability writes, `GET /api/auth/me` without cookie.

HTTP QA: unauthenticated `PATCH /api/intro-availability/1` → **401**. Unauthenticated `/settings/intro-availability` → **302** to login.

Knowing `/api/leads` URL is not enough: 401 without session.

Public **cannot** send Lead `status` (Zod strips unknown; test posted `status: 'JOINED'` and Lead became `TRIAL_SCHEDULED`). Public **cannot** assign users/roles. Trial outcomes remain staff APIs.

## VIEWER / STAFF / ADMIN

M3 CRM rules unchanged: VIEWER read; STAFF/ADMIN lead writes; `requireCrmWriteUser`.

M4 addition: availability **writes ADMIN only**. Availability **reads any authenticated user**.

Frontend: Intro schedule nav ADMIN-only; write buttons ADMIN-only. UI hiding is not the enforcement boundary.

## Public-form protections implemented

- Shared Zod `publicTrialSchema`
- Server re-resolution of `slotId`
- Honeypot `company`
- In-memory IP rate limit 8 / 10 min on `POST /api/public/trial` only (not on GET availability)
- Generic auth failure string unchanged

## Hardening gaps (not characterized as “fine”)

- Public confirmation JSON includes **`leadId`**
- GET `/api/public/availability` is unauthenticated (schedule enumeration; intended for the form)
- Rate limit is per process, uses `x-forwarded-for` if present (spoofable behind a naive proxy)
- Dev error responses can include stacks (observed on localhost 401/400); production Nitro behavior not separately verified
- Session cookie is `Secure` (PowerShell HTTP clients drop it; browsers on `http://localhost` typically still send it)
- No CAPTCHA / Turnstile
- Phone not normalized (dedupe bypass by formatting)

---

# 13. Test User Credential Change

| Piece | Actual |
|---|---|
| Schema | Unique `users.username` |
| Seed | `NUXT_AUTH_USERNAME` default `admin`; email default `{username}@local` if unset (`admin@local` in `.env.example`); password `NUXT_AUTH_PASSWORD` or **`setup` when `NODE_ENV !== 'production'`**; no password default in production |
| Reset | `NUXT_AUTH_RESET_PASSWORD=true` re-hashes onto existing admin |
| Hash | `@adonisjs/hash` scrypt via `hashStaffPassword`; PHC `$scrypt$…` |
| Login UI | Label “Username”; posts `identifier`; still accepts email if the value contains `@` |
| Tests | `TEST_ADMIN_USERNAME='admin'`, `TEST_ADMIN_PASSWORD='setup'`; asserts hash is scrypt and **not** equal to plaintext `setup`; authenticates with username |
| `.env.example` | `NUXT_AUTH_USERNAME=admin`, `NUXT_AUTH_PASSWORD=setup` |

**`setup` is not persisted as plaintext.** Tests assert `passwordHash !== TEST_ADMIN_PASSWORD` and `isScryptPasswordHash`.

Production implication: unset `NUXT_AUTH_PASSWORD` in production does **not** fall back to `setup`. Session still requires 32+ `NUXT_SESSION_PASSWORD` in production (`getServerEnv`).

---

# 14. Existing CRM Integration

Public bookings are ordinary Leads/Trials. No parallel “public booking” table.

| Surface | Expected | Evidence |
|---|---|---|
| Lead list | Same `GET /api/leads` | HTTP QA: authenticated list 200; includes booked names when queried |
| Lead detail | Same `[id].vue` | HTTP `GET /api/leads/:id` returned `TRIAL_SCHEDULED`, trials[], history[] |
| Trial history UI | Unchanged M3 list | Data present on GET; **browser UI NOT MANUALLY VERIFIED** |
| Status history | NEW + TRIAL_SCHEDULED on new Lead | Test + HTTP hist count |
| Dashboard | Unchanged queries over Trial/Lead | HTTP `GET /api/dashboard` 200; **metric correctness NOT MANUALLY VERIFIED** |
| Manual Trial create | M3 `POST /api/leads/:id/trials` untouched | **NOT MANUALLY VERIFIED** in M4 QA; code path unchanged |
| Reschedule / outcome / JOINED | M3 services unchanged | **NOT MANUALLY VERIFIED** in M4 QA |

**M3 behavior changes:** none intended in `leads.ts`. Observable CRM change is **more rows** from `/trial`, plus nav to intro settings. Duplicate-warn policy unchanged.

If a public booking attaches a second Trial to an existing phone, staff see multiple trials on that Lead (same as M3 many-trials model).

---

# 15. Automated Tests

**Command:** `pnpm test` (`vitest run`)

**Recorded 2026-08-27 after implementation (including retry trial-count assertion):**

```text
Test Files  5 passed (5)
Tests       32 passed (32)
Failed      0
Skipped     0
```

This handoff inspection **did not re-run** Vitest. Current `it(` counts: m1 domain 6, m1 validation 4, m2 auth 8, m3 crm 7, m4 intro 7 = **32**.

## M4 coverage by category

| Category | Coverage |
|---|---|
| Availability expansion | Yes — Denver dates, Adult-only names, past 6am Monday omitted at fixture time |
| Disable rule | Yes |
| Exceptions CLOSE_DATE / CLOSE_RULE / OPEN_SLOT | Yes |
| Kids age bands | Yes — ages 5, 9, 13 (not 4/7/8/11/12/16 explicitly) |
| Denver wall time | Yes — `denverWallToUtc('2026-08-31', 18*60)` |
| Adult booking + history | Yes |
| Status injection ignored | Yes (`status: 'JOINED'` in parse) |
| Kids booking two ages | Yes — 6 and 14 |
| Phone required (Zod) | Yes |
| Invalid slot, no Lead | Yes |
| Retry one Trial | Yes — lead count 1, trial count 1 |
| Campaign slug / unknown slug | Yes |
| `isAdmin` helper | Yes |
| HTTP/Nitro RBAC | **No** (no Playwright/supertest of 403 STAFF) |
| Rate limit / honeypot | **No** automated |
| Admin UI | **No** |
| Transaction rollback | **No** |
| Email-only duplicate | **No** (public path requires phone) |
| Auth username/setup | Yes in m2 |
| M1–M3 regression | Existing files still in the 32; not expanded |

### Acceptance criteria lacking automated coverage

- Browser `/trial` rendering and confirmation page
- ADMIN UI add/edit/disable (disable covered at service layer only)
- STAFF/VIEWER 403 on availability writes
- Rate limit 429
- Honeypot
- Age edges 4, 7, 8, 11, 12, 16
- Dashboard metric integrity
- M3 reschedule/outcome/JOINED after a public booking
- Fresh/existing migrate (manual/script, not Vitest)
- Production cookie `Secure` behavior

---

# 16. Static QA / Build

Recorded 2026-08-27 on the implementation tree (later retry-fix included before commit). **Not re-run during this inspection.**

| Command | Result | Notes |
|---|---|---|
| `pnpm lint` | **PASS** (exit 0) | ESLint CJS/ESM `ExperimentalWarning` from `@stylistic`; documented as non-failure |
| `pnpm typecheck` | **PASS** (exit 0) | `nuxt typecheck` |
| `pnpm build` | **PASS** (exit 0) | Client + Nitro `node-server`; includes `/trial` and intro-availability chunks |

**Warnings (not failures):** Node experimental require-of-ESM during lint; Nitro `DEP0155` trailing-slash exports deprecation during build.

An **earlier** mid-implementation lint/typecheck run failed (login indent, quote-props, `hours` possibly undefined, Zod `.pipe` types). Those were fixed before the milestone commit. Do not treat that stale terminal as current.

---

# 17. Manual Browser QA

**No Playwright. No Cursor browser MCP. No click-through of Vue controls in a real browser was performed.**

What **was** exercised: HTTP against `http://localhost:5000` (PowerShell / Node `fetch`) after `pnpm dev`, plus unit tests.

| Item | Status |
|---|---|
| Logged-out `/trial` | HTTP GET 200 HTML contains “Book a free intro class”. **NOT MANUALLY VERIFIED** as a visual/mobile click-through |
| Adult booking | HTTP POST 200 created Lead+Trial. **NOT MANUALLY VERIFIED** in the form UI |
| Kids booking | HTTP POST ages 5 and 13. **NOT MANUALLY VERIFIED** in the form UI |
| Multiple Kids age bands | HTTP GET availability names differed (Ninjas/Fun Day vs Future Champs). **NOT MANUALLY VERIFIED** in UI |
| Confirmation screen | JSON confirmation used; Vue confirmation block **NOT MANUALLY VERIFIED** |
| Admin login `admin` / `setup` | HTTP POST `/api/auth/login` 200 role ADMIN |
| Lead in CRM | HTTP GET `/api/leads/:id`. List/detail Vue **NOT MANUALLY VERIFIED** |
| Trial in CRM | Present on GET payload. UI **NOT MANUALLY VERIFIED** |
| Lead status/history | GET showed `TRIAL_SCHEDULED` and history entries. UI **NOT MANUALLY VERIFIED** |
| Disable recurring | HTTP PATCH enabled false; public slots dropped that `ruleId`; re-enabled |
| Re-enable | Same |
| Adding/editing availability | Add-rule form and field-edit UI **NOT MANUALLY VERIFIED**. PATCH enable/disable was HTTP-tested |
| Date-specific closure | HTTP POST `CLOSE_DATE` then DELETE; public slots for that date gone then restored |
| Public page reflecting config | Via GET `/api/public/availability`, not by watching the Vue page |
| Invalid booking | HTTP POST bad `slotId` → 400 |
| Disabled-slot bypass | Covered by disable + `getBookableSlot` tests; HTTP bypass of a disabled ID **NOT separately logged** after the PATCH test |
| Duplicate/double submission | HTTP retry `reused: true`, one Trial |
| ADMIN authorization | Login + cookie GET/PATCH/POST exceptions |
| STAFF authorization | **NOT MANUALLY VERIFIED** (no STAFF user HTTP) |
| VIEWER authorization | **NOT MANUALLY VERIFIED** (unit helper only) |
| Existing M3 CRM operations | **NOT MANUALLY VERIFIED** (manual trial, reschedule, outcome, JOINED, duplicate warning UI) |

---

# 18. Deviations From M4 Prompt

1. **Edit slot in ADMIN UI** — Prompt required the UI to make it easy to edit a slot. **API PATCH can edit fields; the Vue page only toggles enabled and adds new rows.** This is a real gap versus “edit a slot,” not a documentation nit.
2. **No delete of recurring rules** — Prompt did not mandate delete; disable-only is a product choice. Cannot remove a mistaken custom rule except by DB/API patch of fields or leaving it disabled.
3. **Kids “without requiring internal class names”** — UI still lists gym class names (`Ninjas BJJ`, etc.). Age filters which list appears; names are not rewritten to generic “Kids 4–7”.
4. **Last name required on public form** — Zod `lastName.min(1)`. Internal CRM last name is optional.
5. **Horizon 14 days** — Prompt allowed a chosen bound; 14 is an assumption (also an ADR).
6. **Working schedule assumption** — Prompt supplied the Kaysville weekly grid and said not to invent a schedule. Implementation seeds **all** listed classes as trial-eligible until ADMIN disables. Gym has not confirmed exclusions (Open-Questions still open). This matches the prompt’s working-assumption section, not a silent invention of extra times.
7. **Striking 101 / MMA Cross Training** stored as `ADULT_BJJ` program rows, not `STRIKING`. Matches “intro into the Adult BJJ acquisition program,” but mixes striking-named classes into Adult BJJ availability.
8. **Public JSON `leadId`** — Prompt: no exposure of internal-only fields. `leadId` is returned on the public confirmation payload.
9. **Phone normalization** — Prompt: normalization consistent with existing Lead handling. Public matching is trim-only; no canonical phone format.
10. **STAFF/VIEWER writes** — Prompt: do not grant config writes for convenience. **Honored at API.** Nav hides the page from non-ADMIN but the route is still `auth`-only, so STAFF/VIEWER can read if they know the URL.
11. **Browser QA** — Prompt asked for real click-through if tooling permits; it did not, and the report (this file / vault QA notes) states that. Acceptance “manual QA” is only HTTP-level.
12. **Two commits** — Prompt asked for M4 as its own milestone commit. Implementation is `17d053d`; `b35c429` is a follow-up docs hash record. Both pushed.
13. **`sourceCode` on public schema** — Extra unused field; not wired. Harmless if ignored; slightly expands the public contract.
14. **Username column NOT NULL in Drizzle vs nullable ADD in SQL** — Existing DBs rely on backfill + unique index, not a later `NOT NULL` ALTER. Next `db:generate` may try to tighten this.
15. **No automated HTTP tests** — Prompt wanted authorization verified; `isAdmin` unit test is weaker than handler tests.

Intentionally omitted (prompt non-goals): M5 tasks, Meta, SMS/email, capacity, etc. Those are not deviations.

---

# 19. Assumptions Made During Implementation

| Assumption | Chosen behavior |
|---|---|
| Booking horizon | 14 Denver calendar days including today |
| Slot duration | Optional `endMinute`; many seeded Adult/Kids rows have null end (instant start only) |
| Date-exception semantics | CLOSE_DATE hides recurring only; OPEN_SLOT still shows; CLOSE_RULE is one rule/date |
| Age | Integer years entered by parent; inclusive min/max; no DOB |
| Duplicate public | Same phone + same scheduled ms + SCHEDULED → reuse; else attach or create |
| Class naming | Seed strings copied from the prompt schedule |
| Timezone | America/Denver wall clock ↔ UTC ms via iterative `denverWallToUtc` (DST handled by Intl loop, not a TZ database file) |
| Which classes accept trials | All seeded weekly classes until ADMIN disables |
| Tuesday 7:00 collision | Gi and Striking 101 both bookable independently |
| Fun Day | Single rule ages 4–11 |
| Rate limit | 8 POSTs / 10 minutes / IP / process |
| Public default source | `WEBSITE` |
| Custom rule `seedKey` | `custom-{timestamp}` if omitted |
| Login identifier | `@` → email lookup, else username |
| Production password | Must be set in env; no `setup` default |

---

# 20. Known Issues / Technical Debt / Deferred Hardening

## A. M4 functional issue

- ADMIN UI cannot edit rule fields (name/time/age/weekday) despite PATCH API.
- No recurring-rule delete.
- Phone-format variants create separate Leads and break retry idempotency.
- Public attach-to-existing-phone does not update name/consent/campaign on the old Lead.
- If `db.transaction` is skipped, Lead-then-Trial is not atomic (untested failure path).
- Kids API accepts ages outside 4–16 (empty slots / booking failure), while HTML constrains 4–16.

## B. UX issue

- Add-rule times as minutes-from-midnight.
- Confirmation lost on refresh.
- Class names are gym-internal.
- `/trial` heading says “free intro” while Open-Questions still has unpaid-vs-paid intro unchecked.
- STAFF must type the settings URL to read availability (no nav).

## C. Security / production-hardening issue

- In-memory rate limit; not multi-instance; `x-forwarded-for` trust
- Public `leadId` in JSON
- Unauthenticated full 14-day slot dump
- Session `Secure` cookie on HTTP deploy shapes other than localhost
- No privacy policy / ToS link (Open-Questions)
- Dev stack traces on API errors
- Honeypot only

## D. Infrastructure / deployment issue

- Docker image still does not migrate/seed (pre-M4)
- SQLite file local; `data/*.sqlite` gitignored
- libsql native bindings OS-specific (pre-M4)

## E. Intentionally deferred future feature

- M5 FollowUpTask automation
- M6 Meta
- SMS/email confirmation
- Capacity / waitlists
- Confirming which classes should not take trials

Do not treat E as M4 defects.

---

# 21. Documentation

Permanent notes updated for M4 (implementation commit):

| Note | What was documented |
|---|---|
| `vault/Intro-Scheduling.md` | **New.** Rules, exceptions, public booking, auth, routes, QA, hash |
| `vault/Implementation-State.md` | M0–M4 complete; deferred list; QA; hash |
| `vault/Milestones.md` | M4 Done |
| `vault/Home.md` | `/trial`, admin/setup, Intro-Scheduling link |
| `vault/Architecture.md` | Deferred list; M4 tests; see-also |
| `vault/Database.md` | 0003, username, intro tables/indexes, seed |
| `vault/Domain-Model.md` | IntroAvailabilityRule / IntroException; username |
| `vault/Authentication.md` | Public `/trial`, username login, bootstrap |
| `vault/Decisions.md` | Three 2026-08-27 ADRs |
| `vault/Requirements.md` | Public form present tense |
| `vault/Funnel.md` | Intro scheduling implemented |
| `vault/How-to-Run.md` | Credentials, `/trial`, env vars |
| `vault/CRM.md` | Public bookings appear in CRM |
| `vault/Open-Questions.md` | Working-assumption checkbox; remaining gym confirms |
| `vault/Overview.md` | `/trial` exists |
| `vault/Glossary.md` | Intro availability term |
| `README.md` | M4 done, `/trial`, admin/setup |
| `AGENTS.md` | Added/updated (new tracked file) |

WIP: prompt + `_index.md` link.

**Docs no longer describe M4 as blocked/unimplemented** in permanent notes. `vault/Milestones.md` and `README.md` mark M4 Done. Open-Questions still asks the gym which classes should **not** accept trials — that is unresolved business, not “M4 not built.”

---

# 22. Acceptance-Criteria Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Public `/trial` | **PASS** | Page + public path + HTTP GET 200 |
| Adult scheduling | **PASS** | Service test + HTTP POST |
| Kids scheduling | **PASS** | Service test + HTTP POST two ages |
| Age filtering | **PASS** | Service + HTTP GET names; edge ages not all unit-tested |
| Persisted configurable availability | **PASS** | Tables + seed + ADMIN UI/API |
| Admin availability management | **PARTIAL** | Enable/disable/add/exceptions yes; **edit fields in UI no**; **delete rule no** |
| Date-specific exceptions | **PASS** | CLOSE_DATE/CLOSE_RULE/OPEN_SLOT tested; HTTP CLOSE_DATE |
| Lead creation | **PASS** | Tests + HTTP |
| Trial creation | **PASS** | Tests + HTTP |
| `TRIAL_SCHEDULED` | **PASS** | Tests + HTTP |
| LeadStatusHistory | **PASS** | NEW + TRIAL_SCHEDULED in test |
| CRM visibility | **PASS** (API) / **NOT VERIFIED** (browser UI) | GET lead/list |
| Phone requirement | **PASS** | Zod + HTTP 400 without phone |
| Server-side slot validation | **PASS** | `getBookableSlot` + invalid-slot test + HTTP 400 |
| Public security boundary | **PASS** | Public path list; unauth PATCH 401; status injection ignored |
| RBAC | **PARTIAL** | ADMIN writes enforced in handlers; STAFF/VIEWER 403 **not HTTP-tested** |
| Attribution | **PASS** | Aliases + campaign slug test |
| Duplicate/retry handling | **PASS** | One trial on retry after ms compare fix |
| admin/setup login | **PASS** | Seed, tests, HTTP login |
| Fresh migration | **PASS** | Recorded `db:setup` on fresh file |
| Existing DB migration | **PASS** | Recorded `db:migrate` + seed |
| Seed | **PASS** | Idempotent `seedKey`; tests openTestDatabase |
| Lint | **PASS** | Recorded |
| Typecheck | **PASS** | Recorded |
| Tests | **PASS** | 32/32 recorded |
| Build | **PASS** | Recorded |
| Manual QA | **PARTIAL** | HTTP yes; **browser click-through no** |
| Documentation | **PASS** | Permanent notes updated; M4 not marked blocked |
| Commit | **PASS** | `17d053d` feat; `b35c429` docs hash |
| Push | **PASS** | `origin/M4` = HEAD `b35c429` |
| M5 not started | **PASS** | See §1 |

---

# 23. Final Handoff Summary

```text
Current branch:     M4
HEAD:               b35c429ab0ba746dd688dc9a87bc3499aee573a1
                    (docs: record M4 commit hash)
M4 feat commit:     17d053d1c81dc4a9bb01f107b422c7f48ce8a1c8
Remote status:      origin/M4 == HEAD (pushed)
Working tree:       clean at inspection; this handoff file is new untracked WIP
Automated tests:    32 passed / 32 (recorded 2026-08-27; not re-run 2026-08-28)
Lint:               PASS (recorded)
Typecheck:          PASS (recorded)
Build:              PASS (recorded)
Manual QA:          HTTP against localhost:5000; no browser click-through
Known M4 defects:   Admin UI cannot edit rule fields; no rule delete;
                    phone not normalized; public confirmation returns leadId
Production blockers: in-memory rate limit; no privacy policy; Docker still
                    does not migrate; gym has not confirmed which classes
                    should disable trials; no SMS/email confirm (deferred)
M5 started:         NO
```

## Assessment

**`M4 READY FOR ARCHITECT REVIEW`**

Reasons: the public funnel exists on persisted rules, bookings write coherent M3 CRM rows, username `admin` / hashed `setup` works, migration `0003` exists, tests and static gates were recorded green, M5 was not started, and docs describe M4 as done.

Review should still treat as **not production-ready** and should explicitly decide: (1) ADMIN field-edit UI gap, (2) lack of browser QA, (3) STAFF/VIEWER handler tests, (4) public `leadId` / rate-limit / phone normalization hardening.
