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

# M4 correction handoff V2 — 2026-08-28

Inspection report for architect review after the M4 correction pass (`vault/wip/M4_Correction_Pass_2026-08-28.md`).

This file is WIP inbox material. Durable notes already live under `vault/` and were updated during the correction implementation; this report inspects the **actual working tree** and does not treat those notes as proof.

Inspection date: 2026-08-28 (local). No commit or push was made as part of producing this report.

A shorter earlier draft exists at `vault/wip/M4_Correction_Handoff_2026-08-28.md` (untracked, from the implementation pass). **This V2 file is the inspection report requested for architect review.**

---

# 1. Git State

| Item | Value |
|---|---|
| Current branch | `M4` |
| Tracks | `origin/M4` |
| HEAD | `b35c429ab0ba746dd688dc9a87bc3499aee573a1` |
| HEAD message | `docs: record M4 commit hash` |
| HEAD author date | 2026-08-27 20:50:56 -0600 |
| M4 feat commit (pre-correction) | `17d053d1c81dc4a9bb01f107b422c7f48ce8a1c8` (`feat(intro): implement M4 public trial scheduling`) |
| **M4 correction implementation commit(s)** | **None.** The correction exists only as uncommitted working-tree changes. |
| Correction pushed? | **No.** `origin/M4` equals HEAD `b35c429`. Remote does **not** contain the correction. |
| Ahead/behind origin/M4 | none (`Your branch is up to date with 'origin/M4'`) |
| M5 started? | **NO** |

`git rev-parse HEAD` and `git rev-parse origin/M4` are both `b35c429ab0ba746dd688dc9a87bc3499aee573a1`.

## Current `git status` (abbreviated)

Branch: `M4...origin/M4`, up to date.

**Modified (not staged):**

- `app/pages/settings/intro-availability.vue`
- `app/pages/trial.vue`
- `server/api/intro-availability/[id].patch.ts`
- `server/api/intro-availability/index.get.ts`
- `server/api/intro-availability/index.post.ts`
- `server/api/intro-exceptions/[id].delete.ts`
- `server/api/intro-exceptions/index.get.ts`
- `server/api/intro-exceptions/index.post.ts`
- `server/api/public/trial.post.ts`
- `server/database/index.ts`
- `server/services/public-trial.ts`
- `server/utils/api.ts`
- `server/utils/auth.ts`
- `shared/types/auth.d.ts`
- `shared/utils/time.ts`
- `tests/m4/intro.test.ts`
- `vault/Architecture.md`
- `vault/Authentication.md`
- `vault/CRM.md`
- `vault/Database.md`
- `vault/Decisions.md`
- `vault/Domain-Model.md`
- `vault/Implementation-State.md`
- `vault/Intro-Scheduling.md`
- `vault/Milestones.md`
- `vault/wip/_index.md`

**Untracked:**

- `shared/utils/phone.ts` — correction application code
- `tests/m4/intro-auth.test.ts` — correction application/test code
- `vault/wip/M4_Completion_Handoff_2026-08-28.md` — original M4 inspection (not this correction)
- `vault/wip/M4_Correction_Pass_2026-08-28.md` — correction specification
- `vault/wip/M4_Correction_Handoff_2026-08-28.md` — earlier correction draft (implementation-time, not this V2 inspection)
- **`vault/wip/M4_Correction_Handoff_2026-08-28_V2.md`** — **this file** (created by this reporting task)

## Distinguish handoff vs application changes

| Kind | Paths |
|---|---|
| Application / test correction (uncommitted) | Vue pages, Nitro handlers, `public-trial.ts`, `phone.ts`, `time.ts`, `auth.ts`, `database/index.ts`, `api.ts`, `intro.test.ts`, `intro-auth.test.ts` |
| Durable vault notes updated during correction (uncommitted) | `Architecture.md`, `Authentication.md`, `CRM.md`, `Database.md`, `Decisions.md`, `Domain-Model.md`, `Implementation-State.md`, `Intro-Scheduling.md`, `Milestones.md`, `wip/_index.md` |
| Reporting / spec only (untracked markdown) | Completion handoff, correction prompt, earlier correction handoff, **this V2 file** |

This reporting task did not commit or push. The only write intended by this task is this V2 markdown file.

## M5

No `tests/m5/`. `bookPublicTrial` does not insert `follow_up_tasks`. `FollowUpTask` remains M1 schema + CRM display of existing rows. `vault/Milestones.md` still lists M5 as not started.

---

# 2. Correction Scope Summary

What actually changed in the working tree versus HEAD `b35c429` / feat `17d053d`.

## Admin schedule management

**Before:** `/settings/intro-availability` was a technical list of availability rows. Start/end were minutes-from-midnight. PATCH existed in the API, but the UI did not offer a full field-edit of an existing class (disable-and-recreate was the practical path).

**After:** The page is a Sunday–Saturday timetable. Clock times (`6:00 PM`) are shown. ADMIN can add a class, click Edit to load the same form, change name/program/day/start/end/ages/enabled, and Enable/Disable in place. Exceptions remain a separate block with human labels on the add form; the exception **list** still prints raw `kind` values (`CLOSE_DATE`, etc.).

## Public trial date/class selection

**Before:** `/trial` already grouped slots under `formatDenverLongDate(group.date)` (real calendar dates, not weekday-only). All dates and their radios were visible in one scrollable list labeled “Choose a class.”

**After:** Explicit two-step UI: “1. Choose a date” (date buttons only) → then “2. Choose a class” (radios for that date). Changing Adult/Kids or child age clears the selected date and slot.

## Booking confirmation

**Before:** “You’re scheduled”; name, program name, class, long date, `formatMinuteOfDay` of a numeric `time`; no SMS/email promise.

**After:** “Your intro is scheduled”; child or adult first name; class name; long date + pre-formatted clock string from the API; explicit “This form does not send a text or email confirmation.” Still no internal ids on the page.

## Public API response

**Before (`HEAD`):** `confirmation` included `leadId`, numeric `time` (minutes from midnight), and `scheduledAt`.

**After:** `confirmation` is `firstName`, `participantFirstName`, `programName`, `className`, `date` (YYYY-MM-DD), `time` (already `formatMinuteOfDay`, e.g. `6:00 PM`). No `leadId`. No `scheduledAt`.

## Phone normalization

**Before:** local `normalizePhone` was `value.trim()`; SQL `eq(leads.phone, phone)`.

**After:** `shared/utils/phone.ts` strips non-digits; 11-digit values starting with `1` drop the country code; public matching uses `phonesMatch` over loaded leads; public create stores the digit string.

## Booking transaction handling

**Before:** `db.transaction` if present, else `run(db)` without a transaction.

**After:** If `transaction` is missing, throw `DomainError` 500. Otherwise always `db.transaction`. No non-transaction fallback.

## Authorization testing

**Before:** `isAdmin()` helper assertions in `tests/m4/intro.test.ts` plus service-level create. No HTTP handler tests.

**After:** `tests/m4/intro-auth.test.ts` stands up an h3 server around the real Nitro handlers and asserts HTTP 401/403/200. Actors are injected via `event.context.authUser` (test seam added in `requireAuthUser`). Cookie sessions are not exercised.

---

# 3. Files Changed

`git diff --stat` vs HEAD: 26 modified files, plus untracked `shared/utils/phone.ts` and `tests/m4/intro-auth.test.ts`. No schema/migration files changed.

## frontend/admin

| File | What / why |
|---|---|
| `app/pages/settings/intro-availability.vue` | Weekly timetable, Edit/Enable/Disable, clock `<input type="time">`, full field form, exception clock for OPEN_SLOT. Nav label “Intro schedule” was already ADMIN-only in layout. |

## frontend/public

| File | What / why |
|---|---|
| `app/pages/trial.vue` | Two-step date then class; confirmation copy and string `time`; still uses `formatDenverLongDate`. |

## API

| File | What / why |
|---|---|
| `server/api/public/trial.post.ts` | Drop `leadId` / `scheduledAt`; format `time` with `formatMinuteOfDay`. |
| `server/api/intro-availability/*.ts` | Explicit `h3` + `requireAuthUser` / `requireAdminUser` imports so Vitest can load handlers. Guards were already present in M4; imports are the correction delta. |
| `server/api/intro-exceptions/*.ts` | Same: explicit auth/h3 imports. |

## services/business logic

| File | What / why |
|---|---|
| `server/services/public-trial.ts` | Digit phone match; namespace import of `leads` for spyable `createTrial`; transaction required. |
| `server/utils/auth.ts` | If `'authUser' in event.context`, use injected actor or 401 (test-only path). Production still uses sealed session + `loadActiveUser`. |
| `server/utils/api.ts` | Explicit `createError` import from `h3` (Vitest). |
| `server/database/index.ts` | `setUseDbForTests` so handler tests share the temp SQLite. |

## validation/utilities

| File | What / why |
|---|---|
| `shared/utils/phone.ts` | **New.** `normalizePhone`, `isUsablePhone`, `phonesMatch`. |
| `shared/utils/time.ts` | `minuteOfDayToClock`, `clockToMinuteOfDay` (and `formatDenverLongDate` already existed on HEAD). |
| `shared/types/auth.d.ts` | `H3EventContext.authUser` typing for the test seam. |
| `shared/schemas/intro.ts` | **Unchanged.** Zod still uses `startMinute` integers; Vue converts before POST. |

## database

No migration, no schema change. Phone is still a text column. Canonical digits are an application convention.

## tests

| File | What / why |
|---|---|
| `tests/m4/intro.test.ts` | Phone unit + booking variants; `createTrial` spy rollback. |
| `tests/m4/intro-auth.test.ts` | **New.** HTTP 401/403/200 against real handlers. |

## documentation

Vault notes listed in §1. Untracked spec/handoff markdown as listed.

---

# 4. Admin Weekly Schedule UX

Source: `app/pages/settings/intro-availability.vue`.

**Display:** One card per weekday, Sunday through Saturday (`WEEKDAYS` in `shared/utils/intro.ts`). Empty days say “No trial classes this day.”

**Grouping:** Rules with `rule.weekday === day.value`, sorted by `startMinute` then name.

**Row content:** `formatMinuteOfDay(start)` optional end, class `name`, program name, optional ages, “not offered for intros” if disabled.

**Add:** ADMIN-only form “Add class” → POST `/api/intro-availability`. Fields: program (Adult BJJ / Kids BJJ only), day, start time, optional end, class name, youngest/oldest age, enabled checkbox.

**Edit:** “Edit” copies the rule into the same form (“Edit class”) → PATCH `/api/intro-availability/:id`. “Cancel edit” resets.

**Enable/disable:** Per-row button PATCH `{ enabled }`. Also the form checkbox.

**Exceptions:** List of `onDate · kind · name · note` with Remove (DELETE). Add form: date, kind (human option labels), CLOSE_RULE class select, OPEN_SLOT program/name/time, note.

**Recurring-rule deletion:** **Does not exist.** No DELETE route for `intro-availability`. Copy on the page: disable without deleting. **Intentionally omitted**, matching the correction spec.

## Field edit confirmation

| Field | Editable from ADMIN UI? |
|---|---|
| Class name | Yes |
| Program | Yes (Adult BJJ or Kids BJJ) |
| Weekday | Yes |
| Start time | Yes (`type="time"`) |
| End time | Yes, optional |
| Minimum age | Yes |
| Maximum age | Yes |
| Enabled/disabled | Yes (checkbox and row toggle) |

**Not editable from the frontend:** `id`, `seedKey`, `createdAt`/`updatedAt`. Exception rows cannot be field-edited; remove and re-add. STAFF/VIEWER see no write controls (`canEdit`). Nav link to this page is ADMIN-only; the page itself is only `middleware: 'auth'`, so a STAFF/VIEWER who opens the URL can **read** the timetable without edit buttons.

---

# 5. Human-Friendly Time Editing

Administrators do **not** type minutes-from-midnight in the Vue form.

- Start/end (and OPEN_SLOT start) use `<input type="time">` bound to `startClock` / `endClock` (`HH:mm`).
- Display in the timetable uses `formatMinuteOfDay` (`6:00 PM`).
- Submit path: `clockToMinuteOfDay` → JSON `startMinute` / `endMinute` → DB integers.

**Example:** 6:00 PM

| Layer | Value |
|---|---|
| Time input | `18:00` |
| Timetable text | `6:00 PM` |
| Stored | `startMinute = 1080` |

**Validation:** HTML `required` on start. `classPayload()` throws `Choose a start time.` if clock parse fails. API Zod: `startMinute` 0–1439. Empty end → `endMinute: null`. Invalid `HH:mm` for end with a non-empty string can become `null` via `?? null`.

Public `/trial` never showed minutes-from-midnight as the primary label; it already used `formatMinuteOfDay`. Confirmation `time` is now a formatted string from the API.

---

# 6. Public Trial Date Selection

Source: `app/pages/trial.vue` + `GET /api/public/availability`.

1. **Adult/Kids:** two buttons; `path` drives `ADULT_BJJ` vs `KIDS_BJJ`.
2. **Kids age:** required number 4–16 in the form; query `age` sent to availability. Kids with no age: API returns `[]`; UI says enter child’s age.
3. **Dates:** unique `slot.date` values from the API (`YYYY-MM-DD` Denver civil dates inside `BOOKING_HORIZON_DAYS = 14`).
4. **Date selection:** buttons labeled `formatDenverLongDate(date)` — e.g. **Monday, August 31** (weekday + month + day, **no year**). Not weekday-only.
5. **Class/time:** radios for slots on `selectedDate`; `formatMinuteOfDay` + class name.
6. **Submit:** POST `/api/public/trial` with `slotId` (opaque `rule:{id}:{date}` or `exception:{id}`).
7. **Confirmation:** overlay replacing the form (§8).

Horizon: `listPublicSlots` uses `listCalendarDates(today, 14)` in America/Denver. Past instants are omitted. The page copy still says “next 14 days.”

**Note vs original M4:** HEAD already used `formatDenverLongDate` on grouped dates. The correction did **not** introduce calendar dates from scratch; it changed **selection UX** from one long list of date groups to date-first then class.

---

# 7. Date → Class UX

```text
Choose a date  →  classesOnSelectedDate  →  radio slotId  →  POST
```

- Dates with zero slots are not in `availableDates` (derived only from returned slots).
- **Adult:** `age` omitted; `slotMatchesAge` only allows rules with null age min/max (adult rules).
- **Kids:** age required for slots; Ninjas 4–7, Samurai 8–11, Future Champs 12–16, Fun Day 4–11 — unchanged service tests still pass.
- **Disabled rules:** `listPublicSlots` loads `enabled = true` only.
- **CLOSE_DATE:** that calendar day skipped for recurring slots; OPEN_SLOT extras still apply (existing service logic).
- **CLOSE_RULE:** that rule+date skipped.
- **OPEN_SLOT:** extra slots with `exception:{id}`.
- **Past:** `scheduled.getTime() <= nowMs` skipped; same-day start already passed skipped.
- **Server revalidation:** `getBookableSlot` re-runs `listPublicSlots` and requires the `slotId` to still be in the set. Disabled/closed/past/wrong-age IDs fail with domain error.

Frontend cannot make an unbookable slot succeed: the client only sends `slotId`; the server ignores client-invented times.

---

# 8. Booking Confirmation

Prospect sees (after success):

- Heading: **Your intro is scheduled**
- Name: `participantFirstName || firstName`
- Class: `className`
- Date/time: `formatDenverLongDate(date)` + `time` (API already formatted)
- Follow-up: coach will follow up **by phone**
- **Explicit non-promise:** “This form does not send a text or email confirmation.”

No Lead id, Trial id, `rule:` slot id, or `scheduledAt` in the confirmation Vue state.

Consent checkboxes remain on the form (“ok to text/email”) as **permission**, not a send promise.

---

# 9. Public `leadId` Removal

`POST /api/public/trial` success shape **now**:

```ts
{
  ok: true,
  reused: boolean,
  confirmation: {
    firstName: string
    participantFirstName: string | null | undefined
    programName: string | undefined
    className: string
    date: string        // YYYY-MM-DD
    time: string        // e.g. "6:00 PM"
  }
}
```

`leadId` is **not** in this payload. `scheduledAt` was also removed (not requested by name, but it was an internal timestamp).

There is **no** automated assertion that the HTTP JSON lacks `leadId`. Removal is visible in `server/api/public/trial.post.ts` vs `git show HEAD:...`.

## Other M4 public endpoints

`GET /api/public/availability` (unchanged by this pass) returns bookable slot objects including:

- `id` — `rule:{ruleId}:{date}` or `exception:{exceptionId}` (needed to book)
- `programId`, `ruleId`, `exceptionId`
- `scheduledAt` ISO string
- `startMinute` / `endMinute` integers

Those are internal-ish identifiers on the **public** availability API. They are not Lead ids. The confirmation page does not print them; the radio `value` in HTML is still `slot.id`.

No other `/api/public/*` routes were added in the correction.

Staff dashboard still shows `Lead #{{ trial.leadId }}` (internal CRM, not public).

---

# 10. Phone Normalization

Implemented in `shared/utils/phone.ts`. Used by `bookPublicTrial` **before** matching and persist.

**Algorithm:** strip `\D`; empty → null; if length 11 and starts with `1`, drop that `1`; otherwise keep all digits. Usable if canonical length ≥ 10.

| Input | Canonical (from code) |
|---|---|
| `8015550100` | `8015550100` |
| `801-555-0100` | `8015550100` |
| `(801) 555-0100` | `8015550100` |
| `801 555 0100` | `8015550100` (spaces stripped; **not** in the unit test list) |

**Persisted on public create:** the canonical digit string (`createLead` stores `phone` as passed after normalize).

**Matching:** load all leads, `phonesMatch(row.phone, canonical)`. Existing CRM rows stored as `(801) 555-0100` would still match a public `8015550100`.

**CRM internals:** `findDuplicateLeads` still uses `eq(leads.phone, phone)` on the **trimmed** staff input. Staff duplicate warnings are **not** digit-canonical. Internal create does not call `normalizePhone`.

**Idempotency:** same canonical phone + same `scheduledAt` ms + Trial `SCHEDULED` → `{ reused: true }` without entering the write transaction.

**Country codes:** only the US-style `1` + 10 digits case is stripped. Other country codes are **not** handled. This is **not** libphonenumber / full international support.

**Extensions:** extra digits remain (`8015550100x12` → `801555010012`). That is a **different** key than `8015550100`.

**Malformed / short:** no digits → error; canonical length &lt; 10 → `DomainError` “A phone number is required…”. Zod still requires phone string min 7 max 32 **before** digit checks (punctuation counts toward Zod length).

---

# 11. Duplicate / Retry Behavior After Normalization

Unchanged policy, now on **canonical** phone:

| Situation | Behavior |
|---|---|
| Same phone + same slot (SCHEDULED) | Reuse Lead + Trial; `reused: true`; no new rows |
| Same phone, different punctuation + same slot | Same as above (automated) |
| Same canonical phone + **different** slot | New Trial on most recent matching Lead; `reused: false`; no new Lead |
| Same email, different phone | Email is **not** used for public match; new Lead |
| Double-click / identical POST | UI `pending` disables submit; server idempotency is phone+scheduled ms |
| Network retry of identical booking | `reused: true` if first write committed |

`reused: true` only on the duplicate-scheduled-trial path. New Lead when no phone match. New Trial when match exists but time differs.

**Automated coverage:** unit tests for three punctuation forms; booking test `(801) 555-0100` then `801-555-0100` then `8015550100` → one lead, `reused` on 2nd/3rd. **`801 555 0100` (spaces) is not in the test file**; code would treat it the same.

---

# 12. Atomic Booking Transaction

**Boundary:** After slot validation, campaign lookup, and duplicate detection.

Inside `db.transaction`:

- existing Lead → `createTrial` (insert Trial `SCHEDULED`; if status in NEW/CONTACTED/RESPONDED/NO_SHOW → `TRIAL_SCHEDULED` + history)
- else `createLead` (Lead + history NEW) then `createTrial` (Trial + history TRIAL_SCHEDULED)

Duplicate reuse returns **before** the transaction.

**Mechanism:** Drizzle/libsql `db.transaction`.

**Fallback:** **Removed.** Missing `transaction` → 500 domain error. HEAD had `: await run(db)`.

**Trial failure after Lead insert:** throw aborts the transaction; rollback test expects zero leads for that phone.

## Can a failed public booking leave behind a newly created Lead without its Trial?

**NO** — for the supported path (SQLite client with `transaction`, failure inside `createTrial` after `createLead`).

**Evidence:** `tests/m4/intro.test.ts` `rolls back the Lead if Trial creation fails` spies `leadService.createTrial` to reject, then asserts no lead with `8015550170`. That test **passed** in the inspection run (36/36).

**Caveats (not claimed as pass of the required test):** duplicate check is outside the transaction (concurrency). Reuse path does not open a transaction. If `transaction` is missing, booking fails before writes.

---

# 13. Transaction Failure Test

| Item | Detail |
|---|---|
| File | `tests/m4/intro.test.ts` — `it('rolls back the Lead if Trial creation fails')` |
| Failure | `vi.spyOn(leadService, 'createTrial').mockRejectedValueOnce(new Error('forced trial failure'))` |
| When | After `createLead` would have run (new phone `8015550170`, no existing lead) |
| Expected | `bookPublicTrial` rejects with that message; no leftover Lead |
| Assertions | `rejects.toThrow('forced trial failure')`; `leads` where phone `8015550170` length 0 |
| Result at inspection | **Passed** (part of 36/36) |

This is **not** the invalid-slot path (that still asserts `8015550199` is absent because `getBookableSlot` fails first). The spy fires at Trial creation. **Not a correction failure.**

---

# 14. Authorization Enforcement

Handlers:

| Action | Handler | Guard |
|---|---|---|
| Read rules | `GET /api/intro-availability` | `requireAuthUser` |
| Create rule | `POST /api/intro-availability` | `requireAdminUser` |
| Edit / enable / disable | `PATCH /api/intro-availability/:id` | `requireAdminUser` |
| Read exceptions | `GET /api/intro-exceptions` | `requireAuthUser` |
| Create exception | `POST /api/intro-exceptions` | `requireAdminUser` |
| Delete exception | `DELETE /api/intro-exceptions/:id` | `requireAdminUser` |

| Actor | Read availability | Write availability / exceptions |
|---|---|---|
| PUBLIC | 401 | 401 |
| VIEWER | 200 | 403 |
| STAFF | 200 | 403 |
| ADMIN | 200 | 200 |

**Frontend:** nav “Intro schedule” is `v-if="user?.role === 'ADMIN'"`. Write buttons `v-if="canEdit"`. Hiding is UX, not the security boundary.

Public `/trial` and `/api/public/*` remain unauthenticated.

---

# 15. Authorization Tests

File: `tests/m4/intro-auth.test.ts`. Real handler functions, h3 `createRouter` + `fetch`. Actor via `event.context.authUser` (including `null`). DB via `setUseDbForTests`. **Not** nuxt-auth-utils cookies.

This is **handler-level HTTP**, not an `isAdmin()` unit test. The old helper test `keeps availability writes as an ADMIN concern` still exists and is **not** used here as the proof.

| Actor | Endpoint | Expected | Asserted in test? |
|---|---|---|---|
| PUBLIC | GET `/api/intro-availability` | 401 | Yes |
| PUBLIC | POST `/api/intro-availability` | 401 | Yes |
| VIEWER | GET `/api/intro-availability` | 200 + array | Yes |
| VIEWER | POST `/api/intro-availability` | 403 | Yes |
| VIEWER | PATCH | 403 | **No** (STAFF PATCH is tested instead) |
| STAFF | GET | 200 | Yes |
| STAFF | POST | 403 | Yes |
| STAFF | PATCH `/api/intro-availability/1` `{enabled:false}` | 403 | Yes |
| STAFF | POST `/api/intro-exceptions` | 403 | Yes |
| STAFF | DELETE `/api/intro-exceptions/1` | 403 | Yes |
| ADMIN | POST create rule | 200 | Yes |
| ADMIN | PATCH name + `enabled: false` | 200 | Yes |
| ADMIN | POST CLOSE_DATE | 200 | Yes |
| ADMIN | DELETE that exception | 200 | Yes |
| any | GET `/api/intro-exceptions` | 401/200 | **Not mounted** in the test app |

Inspection run: this test **passed**.

**Not equivalent to production cookie auth.** The injected-user seam is documented in `vault/Authentication.md`. Handler `requireAdminUser` is still the function production uses after session load.

Requirement “tested at protected endpoints” is **implemented**, with the gaps above (VIEWER PATCH not explicit; exception GET not in harness).

---

# 16. Regression Verification

Preserved in **automated** M4 tests (same files as original, still passing):

Adult booking, Kids booking, Ninjas/Samurai/Future Champs, Fun Day via age-band test, recurring → Denver dates, disable hides slot, CLOSE_DATE / CLOSE_RULE / OPEN_SLOT, Denver wall conversion, 14-day bound, invalid slot rejected, Lead + TRIAL_SCHEDULED + history, campaign slug, `admin` username on seed, M1–M3 files unchanged in this diff.

**Changed (intentional):** phone matching; transaction required; public JSON; admin/public UX.

**CRM visibility:** public bookings still create ordinary Leads/Trials. Duplicate CRM **warning** still exact-match phone (behavior change only on public matching).

**M1–M3:** those tests passed in the same 36-test run. No M3/M2 source files in the correction diff except shared auth types / `api.ts` / `auth.ts` test seam.

---

# 17. Automated Tests

**Inspection command:** `pnpm test` (`vitest run`)

| | |
|---|---|
| Test files | 6 passed |
| Tests | **36 passed**, 0 failed, 0 skipped |
| Duration | ~21s |

**Pre-correction (HEAD / original M4 QA):** 32 tests.

**New in this pass (4):**

1. `normalizes common US phone formats…` (also clock 18:00 ↔ 1080)
2. `treats formatted phone variants as the same public identity`
3. `rolls back the Lead if Trial creation fails`
4. `rejects public, VIEWER, and STAFF writes and allows ADMIN`

### Coverage vs correction requirements

| Topic | Automated? |
|---|---|
| Schedule editing (full UI fields) | **No Vue test.** HTTP PATCH covers `enabled` + `name` for ADMIN, not weekday/time/program/ages |
| Time conversion | Yes — `minuteOfDayToClock(18*60)` / `clockToMinuteOfDay('18:00')` |
| Date-first booking UX | **No.** Slots still have real `date`s (pre-existing). Two-step Vue is untested |
| Phone normalization | Yes |
| Normalized duplicate/retry | Yes (three formats, same slot) |
| Atomic rollback | Yes |
| PUBLIC / VIEWER / STAFF / ADMIN HTTP | Yes, with gaps in §15 |
| Existing M4 regression | Yes — remaining `intro.test.ts` cases |

---

# 18. Static QA

Run **after** the correction working tree (this inspection), not the original M4 commit.

| Command | Result | Notes |
|---|---|---|
| `pnpm lint` | **pass** (exit 0) | Node `ExperimentalWarning` CJS loading `@stylistic/eslint-plugin` ESM — known, not an ESLint failure |
| `pnpm typecheck` | **pass** (`nuxt typecheck`, exit 0) | no printed errors |
| `pnpm build` | **pass** (exit 0) | Nuxt 4.5.2 / Nitro 2.13.4; Node `DEP0155` deprecation during Nitro compile (Vue `exports` trailing slash) — build still completed with `✨ Build complete!` |

---

# 19. Manual QA Performed by Cursor

**Browser tooling was not used for this inspection.** Automated HTTP handler tests are **not** browser UX tests. The correction spec assigns owner browser acceptance **after** architect review.

| Item | Status |
|---|---|
| weekly admin timetable | NOT VERIFIED (code-inspected only) |
| add class | NOT VERIFIED in browser |
| edit class | NOT VERIFIED in browser |
| normal time picker | NOT VERIFIED in browser |
| disable/re-enable | NOT VERIFIED in browser |
| date exception | NOT VERIFIED in browser |
| Adult `/trial` | NOT VERIFIED in browser |
| Kids `/trial` | NOT VERIFIED in browser |
| actual upcoming dates | NOT VERIFIED in browser |
| date → class selection | NOT VERIFIED in browser |
| confirmation | NOT VERIFIED in browser |
| phone formatting variants | NOT VERIFIED in browser (Vitest only) |
| duplicate retry | NOT VERIFIED in browser (Vitest only) |
| public API response | NOT VERIFIED via live HTTP to :5000 (code + types) |
| PUBLIC authorization | NOT VERIFIED in browser; Vitest HTTP 401 |
| VIEWER authorization | NOT VERIFIED in browser; Vitest HTTP 403 on POST |
| STAFF authorization | NOT VERIFIED in browser; Vitest HTTP 403 on writes |
| ADMIN authorization | NOT VERIFIED in browser; Vitest HTTP 200 on writes |

A Nuxt process may be listening on port 5000 in the developer environment; this report did not click through it.

---

# 20. Deviations From the Correction Specification

Compared to `vault/wip/M4_Correction_Pass_2026-08-28.md`.

| Spec item | Classification | Notes |
|---|---|---|
| 1 Weekly timetable | FULLY IMPLEMENTED | Weekday cards + clock labels. Exception **list** still shows enum `kind`. |
| 1 Add / edit / enable / exceptions | FULLY IMPLEMENTED | |
| 1 Recurring delete omitted | FULLY IMPLEMENTED | Intentional |
| 2 Full field edit | FULLY IMPLEMENTED | All listed fields in the form |
| 3 Clock inputs | FULLY IMPLEMENTED | DB still minutes |
| 4 Real upcoming dates | FULLY IMPLEMENTED | Also true on HEAD; long-date labels |
| 5 Two-step date → class | FULLY IMPLEMENTED | Vue only; no automated UI test |
| 5 Kids age / server authority | FULLY IMPLEMENTED | |
| 6 Confirmation content / no SMS promise / no ids | FULLY IMPLEMENTED | |
| 7 Remove public `leadId` | FULLY IMPLEMENTED | `scheduledAt` also removed. Availability GET still returns rule/program ids |
| 8 Phone normalize + tests | FULLY IMPLEMENTED | Space-separated example not in tests; code handles it |
| 9 Atomic txn + no fallback + rollback test | FULLY IMPLEMENTED | |
| 10 HTTP auth tests | IMPLEMENTED DIFFERENTLY | Real handlers + HTTP statuses; injected `authUser` not cookies; VIEWER PATCH and GET exceptions not asserted |
| 11 Preserve M4 / no M5 | FULLY IMPLEMENTED | Automated regression green |
| 12 Owner browser QA | NOT IMPLEMENTED | By design of the spec sequence |
| 13 DoD: timetable, edit, clocks, dates, two-step, kids, confirmation, no leadId, phone, txn, rollback test, role HTTP tests, lint/typecheck/build, no M5, handoff | FULLY IMPLEMENTED in working tree | **Uncommitted** |
| 13 Human browser as final close gate | NOT IMPLEMENTED | Expected remaining gate |

No spec item is wholly missing from the code except owner browser QA (explicitly later).

---

# 21. Known Issues

## A. M4 functional defects

None confirmed in code+tests. Uncommitted state is process, not a runtime bug.

Residual technical risks (not proven bugs):

- Public duplicate detection is outside the transaction (two concurrent first-time posts could theoretically create two leads).
- CRM duplicate warning still exact-string; public matching is canonical.

## B. M4 UX issues

- Exception list still shows `CLOSE_DATE` / `CLOSE_RULE` / `OPEN_SLOT`.
- Date labels omit year (`Monday, August 31`).
- STAFF/VIEWER can open `/settings/intro-availability` if they know the URL (read-only).
- Public availability JSON still exposes `ruleId` / `programId` / slot ids.

## C. Security/production hardening

- In-memory public rate limit (pre-existing).
- Auth test seam `event.context.authUser` is server-side only; must not be confused with a client-settable header.
- Handler tests do not prove cookie sealing.

## D. Deployment/infrastructure

- Correction **not committed or pushed**. `origin/M4` is still original M4.
- Docker still does not migrate/seed (pre-existing).
- libsql native bindings OS-specific (pre-existing).

## E. Deferred future features

M5 FollowUpTask automation, SMS/email send, Meta, capacity, waitlists, billing — **not M4 defects**.

---

# 22. Acceptance Matrix

| Item | Result |
|---|---|
| weekly timetable | PASS (code); browser NOT VERIFIED |
| add class | PASS (code); browser NOT VERIFIED |
| full edit class | PASS (code); browser NOT VERIFIED |
| enable/disable | PASS (code + ADMIN/STAFF HTTP); browser NOT VERIFIED |
| normal time inputs | PASS (code); browser NOT VERIFIED |
| date exceptions | PASS (code + ADMIN HTTP create/delete); browser NOT VERIFIED |
| actual upcoming dates | PASS (code; dates existed on HEAD too) |
| date-first selection | PASS (Vue); no automated UI test → PARTIAL for verification |
| Adult scheduling | PASS (tests) |
| Kids scheduling | PASS (tests) |
| age filtering | PASS (tests) |
| confirmation | PASS (code); browser NOT VERIFIED |
| no public leadId | PASS (handler source) |
| phone normalization | PASS (tests) |
| normalized duplicate handling | PASS (tests) |
| atomic transaction | PASS (source + test) |
| rollback test | PASS |
| PUBLIC authorization | PASS (HTTP GET/POST 401) |
| VIEWER authorization | PARTIAL (POST 403; PATCH not asserted) |
| STAFF authorization | PASS (POST/PATCH/DELETE 403) |
| ADMIN authorization | PASS (create/edit/exception HTTP) |
| existing M4 regression tests | PASS |
| M1–M3 regression | PASS (same vitest run) |
| tests | PASS 36/36 |
| lint | PASS |
| typecheck | PASS |
| build | PASS |
| documentation | PASS (vault updated; this V2 report) |
| commit | FAIL (correction uncommitted) |
| push | FAIL (remote is pre-correction HEAD) |
| M5 not started | PASS |
| browser acceptance testing | NOT VERIFIED |

---

# 23. Final Architect-Handoff Summary

Current branch: `M4`

HEAD: `b35c429ab0ba746dd688dc9a87bc3499aee573a1` (`docs: record M4 commit hash`)

Correction commit(s): **none** (working tree only)

Remote status: `origin/M4` = HEAD; **correction not pushed**

Working tree: dirty — application correction + vault updates + untracked spec/handoff markdown including this V2 file

Tests: `pnpm test` — **36 passed**, 0 failed, 0 skipped

Lint: `pnpm lint` — **pass** (stylistic experimental warning only)

Typecheck: `pnpm typecheck` — **pass**

Build: `pnpm build` — **pass** (Nitro `DEP0155` deprecation warning)

Browser QA: **NOT VERIFIED** (no Playwright/browser click-through in this inspection)

Known correction defects: none proven. Process gap: **unccommitted/unpushed implementation**. Coverage gaps: Vue two-step/timetable untested; VIEWER PATCH and GET exceptions not in HTTP harness; public availability still returns internal slot/rule ids.

Remaining M4 blockers: **(1)** owner browser acceptance per spec §12; **(2)** commit/push of the correction if the team wants `origin/M4` to match the reviewed code. Neither was required as a completed step *before* this architect review, but remote does not yet contain the correction.

M5 started: **NO**

---

`M4 CORRECTION READY FOR ARCHITECT REVIEW`

Reasons:

- The correction specification’s implementation items are present in the working tree (timetable + full edit + clock inputs, two-step `/trial`, confirmation without ids, `leadId` removed, digit phones, required transaction + rollback test, handler HTTP 401/403/200).
- Lint, typecheck, tests (36), and production build passed on that tree.
- M5 was not started.
- Owner browser QA is **explicitly after** architect review in the spec and remains NOT VERIFIED — that does not by itself block review.
- Architects must review **uncommitted files**, not `origin/M4`. If review is expected against git history only, the correction is not on the remote yet.
