# M4 Correction Pass — Schedule UX and Booking Hardening

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M4 — Intro Scheduling  
**Status:** Correction pass before M4 acceptance  
**Date:** 2026-08-28

## Purpose

M4 is functionally implemented, but the architect review and initial product discussion identified several corrections that should be completed before M4 is formally closed and development proceeds to M5.

This correction pass is intentionally narrow. It is not a redesign of M4 and must not introduce M5 functionality.

The primary goals are:

1. Make intro-class schedule administration simple enough for normal gym staff.
2. Improve the prospect booking experience.
3. Correct several implementation/security issues identified during architect review.
4. Complete stronger authorization and transactional verification.

## 1. Replace the Current Schedule Administration Experience

The current intro-availability administration is too row-oriented and technical for normal gym staff. The administrator should not feel like they are editing database records.

Replace the current presentation with a clear **weekly timetable / schedule-management interface**. The primary view should make the weekly schedule easy to understand at a glance.

Conceptually:

```text
Monday
  6:00 AM   Adult BJJ
  6:00 PM   Adult BJJ

Tuesday
  5:00 PM   Ninjas BJJ
  6:00 PM   Samurai BJJ
  7:00 PM   Adult BJJ
```

The exact visual implementation can follow the application's existing design system, but the result should feel like editing a normal gym schedule rather than manipulating individual database rows.

An ADMIN must be able to add a class, edit an existing class, enable or disable a class for intro scheduling, and manage date-specific exceptions. Deleting recurring schedule records is not required; disabling is sufficient.

## 2. Full Schedule Editing

The ADMIN frontend must allow an administrator to edit the important properties of an existing recurring availability rule, including:

- Class name
- Program
- Day of week
- Start time
- End time, when applicable
- Minimum age
- Maximum age
- Enabled/disabled status

An administrator should not need to disable a record and create a replacement merely to change a time or class name.

## 3. Human-Friendly Time Controls

Do not expose "minutes from midnight" to users. An administrator should never need to know that `1080 = 6:00 PM`.

Use normal clock/time controls, such as standard time inputs or an equivalent user-friendly control consistent with the frontend. The database may continue storing time internally using the existing representation.

## 4. Public Booking Should Use Real Upcoming Dates

The public `/trial` experience should resolve recurring weekly availability into **actual upcoming calendar dates**. Do not present prospects with only generic choices such as Monday, Tuesday, or Wednesday.

Instead, show real dates within the configured booking horizon, for example:

```text
Monday, August 31
Tuesday, September 1
Wednesday, September 2
```

The existing 14-day booking horizon may remain. All date/time behavior must continue using America/Denver timezone rules.

## 5. Improve the Public Date/Class Selection UX

Change the public booking experience so selecting a trial time feels like a simple booking calendar.

Use a two-step selection concept:

```text
Choose a date
      ↓
Show classes available on that date
      ↓
Choose a class/time
```

Only dates containing eligible availability for the prospect should be selectable. For Kids prospects, age filtering must still determine eligible dates/classes.

Preserve existing rules for Adult/Kids eligibility, disabled recurring rules, date-specific closures, special/open slots, past times, and server-side revalidation. The server remains authoritative about whether a submitted slot is actually bookable.

## 6. Improve Booking Confirmation

After a successful trial booking, show a clean confirmation containing at minimum:

- Prospect/participant name as appropriate
- Class name
- Calendar date
- Start time

Use clear language confirming that the trial has been scheduled. Do not promise SMS or email confirmation unless those capabilities actually exist. Do not expose internal database identifiers.

## 7. Remove Internal Lead ID From the Public Response

The public trial-booking API currently returns the internal Lead ID in its confirmation payload. Remove it.

The public response should contain only information required to render the booking confirmation. Internal Lead IDs must remain internal.

## 8. Normalize Phone Numbers

Public lead matching and booking idempotency currently rely on a trimmed phone string. Equivalent numbers such as `8015550100`, `801-555-0100`, and `(801) 555-0100` should not become separate identities merely because they were formatted differently.

Implement a consistent phone-normalization strategy before public Lead matching and duplicate/retry checks. Preserve whatever display representation is appropriate for the CRM, but use a canonical representation for comparisons.

Add automated coverage demonstrating that common formatting variants resolve consistently.

## 9. Guarantee Atomic Public Booking

A successful public trial booking represents one business operation: create/resolve Lead, create Trial, and update Lead status/history.

These operations must be atomic. The application must not intentionally support a fallback path where a Lead is created but Trial creation fails and leaves an incomplete state.

Use the supported database transaction mechanism as a requirement for this operation. Add an automated failure-path test demonstrating that if Trial creation fails after Lead creation begins, the entire operation rolls back appropriately. Do not silently fall back to a non-transactional implementation.

## 10. Expand Authorization Tests

Test M4 authorization at the API/handler boundary rather than relying only on frontend visibility or helper-unit tests.

Verify:

```text
PUBLIC  → cannot manage intro availability
VIEWER  → cannot create/edit/disable intro availability
STAFF   → cannot create/edit/disable intro availability
ADMIN   → can create/edit/enable/disable intro availability and manage exceptions
```

Test actual protected endpoints and expected HTTP authorization behavior. Frontend hiding of controls is useful UX but is not the security boundary.

## 11. Preserve Existing M4 Behavior

Do not regress:

- Public `/trial`
- Adult scheduling
- Kids scheduling
- Ninjas ages 4–7
- Samurai ages 8–11
- Future Champs ages 12–16
- Friday Fun Day ages 4–11
- Recurring availability
- Enabled/disabled rules
- `CLOSE_DATE`
- `CLOSE_RULE`
- `OPEN_SLOT`
- America/Denver timezone handling
- 14-day booking horizon unless explicitly required otherwise
- Server-side slot revalidation
- Lead creation and existing-Lead reuse
- Trial creation
- `TRIAL_SCHEDULED`
- LeadStatusHistory
- Attribution
- Existing CRM visibility
- `admin` / `setup` development login
- Existing M1–M3 behavior

Do not begin M5 or add FollowUpTask automation, SMS, email sending, Meta integration, capacity management, waitlists, or billing.

## 12. Manual Acceptance Testing After Implementation

After Cursor completes the correction pass and automated/static gates are green, the project owner will perform real browser acceptance testing before M4 is closed.

Prospect flow:

```text
Open logged-out /trial
        ↓
Choose Adult or Kids
        ↓
Choose real upcoming date
        ↓
Choose class/time
        ↓
Submit
        ↓
Review confirmation
```

Admin flow:

```text
Login as admin / setup
        ↓
Open intro schedule
        ↓
Review weekly timetable
        ↓
Edit class and time
        ↓
Disable/add class
        ↓
Create date exception
        ↓
Return to public /trial
        ↓
Confirm changes are reflected correctly
```

Automated tests and HTTP tests do not replace this final browser/UX acceptance step.

## 13. Definition of Done

The correction pass is complete when:

- ADMIN schedule management uses a clear weekly timetable-style interface.
- Existing recurring classes can be fully edited from the UI.
- Times use normal human-readable controls.
- Public booking presents actual upcoming dates.
- Prospect chooses a date and then an available class/time.
- Kids age filtering continues to work correctly.
- Confirmation is clear and contains no internal IDs.
- Public API no longer returns `leadId`.
- Phone matching uses consistent normalization.
- Public booking is transactionally atomic.
- Transaction rollback has automated coverage.
- PUBLIC/VIEWER/STAFF/ADMIN authorization is tested at protected endpoints.
- Existing M1–M4 automated tests continue to pass.
- Lint, typecheck, and production build pass.
- No M5 functionality is introduced.
- A correction handoff is produced for architect review.
- Human browser acceptance testing remains the final gate before declaring M4 closed.

## Expected Development Flow

```text
M4 implementation
      ↓
Architect review
      ↓
THIS CORRECTION PASS
      ↓
Cursor implementation
      ↓
Automated/static QA
      ↓
Correction handoff
      ↓
Architect review
      ↓
Human browser acceptance test
      ↓
M4 CLOSED
      ↓
M5
```
