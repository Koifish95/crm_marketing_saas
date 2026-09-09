---
type: note
status: current
area: process
updated: 2026-09-04
tags:
  - m9
  - qa
---

# M9 acceptance fixes — 2026-09-04

Source: Scott’s notes in [[wip/archive/M9_Human_QA_Inbox_2026-09-04_to_2026-09-05]] (cleared from [[wip/note]] after this pass). Leftover human work: [[wip/M9_Remaining_Human_QA]]. No schema migration.

## Campaign save had no confirmation

**Issue:** Save at the bottom of the Campaign workspace did nothing visible.

**Fix:** Success and failure alerts render next to the Save button (`aria-live` via `AppAlert` `role="alert"`). Page-top alerts stay for load / other-action failures.

## Content attach confirmation was off-screen

**Issue:** Attach/save confirmation appeared at the top of a long Content page, so attaching an asset felt like a no-op.

**Fix:** Plan, Creative, Attach, and Publish each show feedback next to that action. Attached files list in the Creative panel. Attach also refreshes the assets list (previously only the content item refreshed).

## Restrict / Do not use did not change status

**Issue:** Approve worked; Restrict and Do not use appeared broken.

**Notes:** Both require a restriction reason (≥3 characters). The error was at the page header, off-screen. The server previously required a note only for `RESTRICTED`.

**Fix:** Compact `/marketing/assets` list plus `/marketing/assets/:id` selector detail. Restrict / Do not use stay disabled until a reason is present. Server now requires a note for `DO_NOT_USE` as well.

## Compensation “Too small: expected string…”

**Issue:** Raw Zod min-length dump on Save compensation.

**Fix:** Schema message and client check: “Explain this assignment in a few words.” The ≥3 character audit rule is unchanged.

## Household did not link the recruiting Campaign

**Issue:** A tracking-link signup showed “Website - Campaign link” with nothing to click. Event batch processing felt linked; campaign-link signups did not.

**Notes:** New campaigns default to DRAFT. Tracking previously stamped `campaignId` only when `active` (`status === 'ACTIVE'`). The public URL still carried `utm_source=campaign` + `utm_medium=link`.

**Fix:** Stamp first-touch `campaignId` from an active tracking code unless the Campaign is `CANCELLED`. Copying a URL while not ACTIVE confirms first (“Copy anyway”); cancelled campaigns warn that they will not attribute. Household header and Attribution tab show labeled Campaign and derived Event/session links (`VIEW_MARKETING`). Event is resolved from processed registrations, then follow-up `sourceEventId`, then compensation `eventId`. No household event column.

## Event Sessions tab was unexplained

**Issue:** After creating an Event, Sessions had no meaning on the page.

**Fix:** Copy on Add session and the Sessions panel: a session is a date/time/capacity people register for; at least one is required before Publish. Empty state: “No sessions yet. Add the class time parents will pick on the public page.” API still uses Session.

Related durable notes: [[Decisions]], [[CRM]], [[Domain-Model]], [[Design-System]], [[Implementation-State]].
