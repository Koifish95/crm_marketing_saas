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

# M4 correction handoff — 2026-08-28

Architect-review report for the correction pass in `vault/wip/M4_Correction_Pass_2026-08-28.md`. Durable facts were copied into `vault/` notes. This file is WIP inbox material.

Inspection date: 2026-08-28. No commit or push was made for this pass.

---

# 1. Git state

| Item | Value |
|---|---|
| Branch | `M4` tracking `origin/M4` |
| HEAD | `b35c429ab0ba746dd688dc9a87bc3499aee573a1` (`docs: record M4 commit hash`) |
| M4 feat commit | `17d053d1c81dc4a9bb01f107b422c7f48ce8a1c8` |
| Correction committed? | **No.** Working tree is dirty. |

M5 was not started. No `tests/m5/`. Booking still does not insert `follow_up_tasks`.

---

# 2. What the correction pass changed

Narrow UX and hardening. Availability schema, 14-day Denver horizon, age bands, exceptions, CRM write path, and `admin` / `setup` are unchanged.

## Admin schedule UI

`/settings/intro-availability` is a weekly timetable (Sunday–Saturday). Each row shows clock time, class name, program, ages, and enabled state. ADMIN can add, **edit all important fields** (name, program, weekday, start, end, ages, enabled), enable/disable, and manage exceptions. Recurring-row delete is still not offered.

Times use `<input type="time">`. Storage remains minutes from midnight.

## Public `/trial`

Two-step: real upcoming calendar dates (`Monday, August 31` style via `formatDenverLongDate`) → classes on that date → submit. Kids age still filters eligible dates/classes. Confirmation shows name, class, date, clock time; language does not promise SMS/email. Internal ids are not shown.

## Public API

`POST /api/public/trial` confirmation fields: `firstName`, `participantFirstName`, `programName`, `className`, `date`, `time` (already formatted, e.g. `6:00 PM`). **No `leadId`. No `scheduledAt`.**

## Phone matching

`shared/utils/phone.ts` digit-canonical form. US 11-digit numbers starting with `1` drop the country code. Public booking stores that form and matches existing leads with `phonesMatch` (both sides normalized). Coverage includes `8015550100`, `801-555-0100`, and `(801) 555-0100`.

## Atomic booking

`bookPublicTrial` always uses `db.transaction`. Missing `transaction` → 500. Spying `createTrial` to throw leaves no leftover Lead.

## Authorization tests

`tests/m4/intro-auth.test.ts` stands up an h3 listener around the real handlers:

| Actor | GET availability | POST/PATCH availability | POST/DELETE exceptions |
|---|---|---|---|
| PUBLIC | 401 | 401 | (not hit; writes 401/403) |
| VIEWER | 200 | 403 | 403 |
| STAFF | 200 | 403 | 403 |
| ADMIN | (implied by writes) | 200 create + edit | 200 create + delete |

Test seam: if `event.context.authUser` is present, `requireAuthUser` uses it instead of the cookie session. Production does not set that field.

---

# 3. Definition of done (correction prompt)

| Requirement | Status |
|---|---|
| Weekly timetable admin UI | Done |
| Full edit of recurring classes | Done |
| Human clock/time controls | Done |
| Public booking uses real upcoming dates | Done |
| Two-step date then class | Done |
| Kids age filtering preserved | Existing tests still pass |
| Confirmation clear, no internal ids | Done |
| Public API no `leadId` | Done |
| Canonical phone matching + tests | Done |
| Transaction-only booking + rollback test | Done |
| PUBLIC/VIEWER/STAFF/ADMIN HTTP tests | Done |
| M1–M4 tests still pass | 36 passed |
| Lint / typecheck / production build | Passed 2026-08-28 |
| No M5 | Confirmed |
| Correction handoff | This file |
| Human browser acceptance | **Not done — owner gate** |

---

# 4. Automated / static QA

```text
pnpm lint       pass (ESLint CJS/ESM experimental warning still prints)
pnpm typecheck  pass
pnpm test       36 passed (was 32)
pnpm build      pass
```

New tests:

- phone normalize + booking variants
- transactional rollback
- HTTP intro-availability authorization

---

# 5. What was deliberately not done

- No Playwright / no agent browser click-through. The correction prompt assigns that to the project owner.
- Recurring-rule delete still omitted (disable is enough).
- CRM duplicate-warning UI still uses its existing string compare; public booking matching is separate and canonical.
- In-memory public rate limit unchanged.
- No SMS/email send, FollowUpTask automation, Meta, capacity, waitlists, billing.

---

# 6. Owner browser acceptance (still required)

Prospect:

```text
Open logged-out /trial → Adult or Kids → real date → class/time → submit → confirmation
```

Admin:

```text
Login admin / setup → intro schedule → weekly timetable → edit class/time → disable/add → date exception → /trial reflects it
```

App URL remains http://localhost:5000.

---

# 7. Suggested next step

Architect review of this correction, then owner browser QA, then M4 closed. Do not start M5 until that close.
