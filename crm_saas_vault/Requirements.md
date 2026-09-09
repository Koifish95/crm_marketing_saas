---
type: note
status: current
area: domain
updated: 2026-09-02
tags:
  - requirements
---

# Requirements

Where [[wip/archive/PROJCET_UPDATE_2026-08-26]] conflicts with the original spec, the update wins.

## Objective

Shorten the path: interest → phone number → scheduled intro → staff notified → next-day personal call → attend or no-show → join or keep following up.

Lock a date and time while the prospect is still interested.

## Timing

Treat now through about **mid-November 2026** as an important acquisition window. Prefer rapid, operationally useful increments.

## Contact rules

- Public acquisition requires a **phone number** unless the gym later says otherwise.
- Internal create: first name plus phone **or** email.
- Public `/trial`: first name, last name, **phone required**, program path (Adult/Kids), communication consent, selected intro slot. Email optional.
- Store `smsConsent` / `smsConsentAt` and `emailConsent` / `emailConsentAt` separately.
- **Adult BJJ:** Lead is the participant.
- **Kids BJJ:** Lead is the parent/guardian; child is participant fields (`participantFirstName`, `participantLastName`, `participantAge`, `guardianRelationship`). Never treat a minor as the communication target.

## Programs

`Program` is a table, not a fixed enum. Seeded codes: `ADULT_BJJ` (primary), `KIDS_BJJ`, `STRIKING` (seasonal), `WRESTLING` (seasonal). No Muay Thai. `OTHER` is a **lead source**, not a program.

Seasonal rows (`STRIKING`, `WRESTLING`) are seeded **inactive**. `active` means currently available for acquisition/scheduling. Staff can activate a seasonal program later without deleting it.

Experience: `NONE` / `BEGINNER` / `INTERMEDIATE` / `ADVANCED` / `UNKNOWN`.

## Pipeline

`NEW` → `CONTACTED` → `RESPONDED` → `TRIAL_SCHEDULED` → `TRIAL_ATTENDED` → `JOINED`, plus `NO_SHOW` and `LOST`.

- Forward skips allowed (walk-in can go `NEW` → `TRIAL_SCHEDULED`).
- Backward/corrective changes allowed with a required note and always-written history.
- `LOST` reason is optional free text in V1.
- `NO_SHOW` can later return to `TRIAL_SCHEDULED` via a new Trial.

Sources: `INSTAGRAM` `FACEBOOK` `WALK_IN` `REFERRAL` `WEBSITE` `PHONE` `OTHER`.

Duplicates: allow create; flag matching phone/email; no merge UI in V1.

## Money

- Adult BJJ is currently **$175/month**. Do not hard-code price in business logic. On join, store `joinedAt` and editable `monthlyRateCents` (integer USD cents; UI may default adult to 17500). Joined is a **manual** confirmation. No billing.
- Compensation earned is an operational Marketing ledger (seed 50% of monthly, configurable). It is **not** shown on the acquisition Dashboard.

Kids / striking / wrestling / family / intro offer prices: [[Open-Questions|unknown]].

## Human vs automation

Automate capture, scheduling, task creation, notification plumbing, and state. **Do not** automate the sales conversation. The gym wants a person on the phone the next day.

## Public form

Route `/trial` with `source` / `campaign` query params. Neutral “the gym will contact you” confirmation — do not promise SMS. Honeypot + in-memory IP rate limit. Privacy policy can wait until public deploy. Details: [[Intro-Scheduling]].

Public `/events/:slug` captures event registrations only. Households are created in a later staff batch, not on submit.

## Marketing (M9)

Marketing is a distinct staff area (`/marketing`) that feeds acquisition. STAFF receives no marketing Access Rights until ADMIN assigns User Roles. Event attendance is not Trial attendance. Marketing Tasks are not Lead Follow-up.

## Non-goals still in force

No membership billing, no complete class schedule, no Meta required to operate, no WhatsApp customer integration just because the team chats there.

Related: [[Funnel]], [[Domain-Model]], [[Database]], [[Decisions]].
