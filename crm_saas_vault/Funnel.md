---
type: note
status: current
area: domain
updated: 2026-09-02
tags:
  - funnel
---

# Funnel

Immediate business objective ([[wip/archive/PROJCET_UPDATE_2026-08-26]]) remains the intro path. M9 adds upstream marketing operations; it does not replace Trial / FollowUpTask / Conversion.

```text
Marketing Campaign / Task / Content / Asset / Event
→ Tracking or public registration
→ Lead / Household
→ Intro Scheduling
→ Next-Day Follow-Up
→ Intro Visit
→ Attend / No Show / Reschedule
→ Join
```

Meta is an **external acquisition source**, not the core domain. The same Lead → Trial → FollowUpTask model must work for a landing page, a Meta Instant Form, Messenger, or a walk-in.

## Automation vs human

| System | Human |
|---|---|
| Capture lead and phone | Call the prospect |
| Schedule intro | Confirm the visit |
| Create follow-up task | Welcome / intro / sales nuance |
| Notify staff | Record attendance with app actions |
| Record state and history | |

## Intro scheduling

Implemented in M4: [[Intro-Scheduling]]. A prospect enters contact info, picks an allowed intro time from configured availability, submits, and the CRM stores Lead + Trial (`TRIAL_SCHEDULED`). M5 then creates the confirmation-call FollowUpTask. Staff work it from `/tasks` or the lead page.

Working assumption: any age/program-appropriate class on the published weekly schedule may accept a first-time trial until ADMIN disables it. Date exceptions cover closures and one-off classes.

A Lead may have multiple [[Domain-Model#Trial|Trial]] rows; do not overwrite history on reschedule. No capacity cap.

## Meta

Meta is one acquisition provider. Possible future shapes (do not pick until the gym’s setup is known): landing page `/trial`, Instant Form then schedule, or Messenger/IG then capture.

Internal CRM must work if Meta is missing. See [[Open-Questions]], [[Architecture]], and [[Database]].

## Staff notification

Needed eventually. Channel unset (dashboard, email, SMS, WhatsApp, other). Service boundary later; no provider now.
