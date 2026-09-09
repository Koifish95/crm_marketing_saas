---
type: note
status: current
area: domain
updated: 2026-09-02
tags:
  - intro
  - scheduling
---

# Intro scheduling

M4. Public `/trial` plus ADMIN configuration of which recurring classes accept first-time trials.

A class existing ≠ intro booking enabled. This is **not** a gym class-management system.

## Recurring rules

Table `intro_availability_rules`. Seed keys in `drizzle/intro-seed.ts` keep re-seed idempotent and **do not overwrite** an ADMIN disable.

| Field | Notes |
|---|---|
| `programId` | Adult BJJ or Kids BJJ |
| `weekday` | 0 = Sunday … 6 = Saturday (America/Denver) |
| `startMinute` / `endMinute` | minutes from midnight, Denver wall clock (storage only) |
| `name` | class label shown publicly |
| `ageMin` / `ageMax` | Kids bands; Adult null |
| `enabled` | public form ignores disabled rows |
| `seedKey` | unique; used only by seed |

The ADMIN UI at `/settings/intro-availability` is a **weekly timetable** (Sunday–Saturday). Staff edit class name, program, day, start/end (clock inputs), ages, and enabled. Minutes-from-midnight are not shown. Disabling hides a class from `/trial`; deleting recurring rows is not required.

Initial seed is the supplied Renzo Gracie Kaysville schedule as a **working assumption**: any age/program-appropriate class may accept a trial until the gym says otherwise. ADMIN can disable 6:00 AM, Friday Study Hall, etc. without a deploy.

## Date exceptions

Table `intro_exceptions`. `onDate` is `YYYY-MM-DD` in America/Denver.

| kind | Effect |
|---|---|
| `CLOSE_DATE` | no recurring slots that calendar day (extra `OPEN_SLOT` rows still apply) |
| `CLOSE_RULE` | hide one recurring class on that date |
| `OPEN_SLOT` | add a one-off class on that date |

`OPEN_SLOT` start time uses a clock input in the UI; storage remains minutes from midnight.

## Public slots

`server/services/availability.ts` expands enabled rules + exceptions into concrete upcoming times.

Horizon: **`BOOKING_HORIZON_DAYS = 14`** in `shared/utils/intro.ts`. Past times today are omitted.

Kids: parent/guardian is the Lead; child age selects Ninjas 4–7, Samurai 8–11, Future Champs 12–16. Fun Day is ages 4–11.

`/trial` starts with **who is booking**: one person or multiple family members. Program (Adult vs Kids) is chosen per prospective member, not for the whole household. One person may be the contact (`SELF`) or a child with a guardian contact only (`CHILD` — no fake parent line). Multiple members share one contact; the contact can also participate as `SELF`. Each person picks a real class time from date-first availability. Submit is one transaction: LeadHeader + lines + trials + follow-up + attribution on the header. Confirmation lists each booked person without internal IDs. M6 restyles this as a branded public booking page.

Staff **add trial** and **reschedule** live on that person’s details on Lead detail (not one ambiguous household trial list). They use the **same** `listPublicSlots` / `getBookableSlot` engine. `POST /api/leads/:id/trials` and `POST /api/trials/:id/reschedule` require a bookable `slotId`. The Trial label and `scheduledAt` come from that slot. Reschedule: old Trial → `CANCELLED`, new Trial → `SCHEDULED`.

`POST /api/trials/:id/outcome` records `ATTENDED`, `NO_SHOW`, or `CANCELLED`. Early `ATTENDED` / `NO_SHOW` (before `scheduledAt`) follow `allowEarlyTrialOutcomes` (default ON). See [[CRM]] and [[Decisions#2026-09-02 — Allow early Trial outcomes is an ADMIN setting]].

## Public booking

`POST /api/public/trial` (no auth):

1. Validate (phone **required**). Household bodies send `members[]` plus an opaque `idempotencyKey` (UUID). One-person Adult/Kids bodies still work and also require the key.
2. Re-resolve each slot server-side. Client slot IDs are not trusted as times. Programs are per member.
3. Normalize the phone to digits (`shared/utils/phone.ts`) for storage and for possible-duplicate **warnings**. Phone is not household identity.
4. If that `idempotencyKey` already has a completed submission, return the original confirmation. Do not create another household.
5. Otherwise, in one `db.transaction`: claim the key, create a **new** LeadHeader from the submitted contact, create each LeadLine and Trial under that header, persist internal possible-duplicate matches, write the stored confirmation onto the key, and create/consolidate household follow-up. Never select an existing LeadHeader by phone, email, name, or Trial time. A later failure rolls the whole booking back, including the key.

Public confirmation JSON is display-only: submitted household contact name, each booked person, class, Denver date, clock time. It does **not** include `leadId`, matching household names, duplicate warnings, or `reused` / `replayed`. The page does not promise SMS or email confirmation.

Internal CRM duplicate policy is unchanged (warn, don’t reject). No merge. Exact normalized phone (`phonesMatch`) and trimmed case-insensitive email matches persist on `lead_possible_duplicates` for staff Lead detail / Leads list. Public users never see that warning.

Attribution: `?source=instagram&campaign=fall-adult-bjj`. `source` maps to existing Lead source enums (unknown → `WEBSITE`). `campaign` matches an **active** Campaign slug or is ignored. No Campaign rows are invented from query text.

Honeypot field `company` must be empty. In-memory IP rate limit (8 / 10 minutes) is **not** production-grade for multiple app instances.

## Authorization

| Actor | Availability config | Public `/trial` |
|---|---|---|
| anonymous | 401 | yes |
| VIEWER | 403 | n/a |
| STAFF | 403 | n/a |
| ADMIN | read/write | n/a |

HTTP tests in `tests/m4/intro-auth.test.ts` hit the real handlers.

## Routes / APIs

- `/trial`, `/settings/intro-availability`
- `GET /api/public/availability`
- `POST /api/public/trial`
- `GET/POST /api/intro-availability`, `PATCH /api/intro-availability/:id`
- `GET/POST /api/intro-exceptions`, `DELETE /api/intro-exceptions/:id`
- `POST /api/leads/:id/trials` (staff; `slotId` only)
- `POST /api/trials/:id/reschedule` (staff; `slotId` only)

Migration `0003_chubby_butterfly.sql`. Scheduling a Trial also creates the M5 confirmation-call FollowUpTask.

Production-hardening deferred: in-memory rate limit (not multi-instance), no SMS/email confirmation, no privacy-policy page, no class capacity.

## QA

2026-08-28 correction pass: lint, typecheck, 36 Vitest tests, production build. Added phone-variant matching, transactional rollback, and PUBLIC/VIEWER/STAFF/ADMIN HTTP authorization tests.

Human browser click-through (logged-out `/trial` two-step booking and ADMIN timetable edit) remains the final gate before declaring M4 closed.

Related: [[CRM]], [[Domain-Model]], [[Funnel]], [[Authentication]], [[Decisions]].
