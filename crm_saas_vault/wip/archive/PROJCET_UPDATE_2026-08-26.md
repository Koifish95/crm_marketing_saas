# Renzo Acquisition System
## Project Update: August 26, 2026

This document supplements the original Renzo Gracie Kaysville Customer Acquisition System specification.

Where this document changes priorities or requirements from the original specification, this document takes precedence.

---

# 1. New Business Requirements

The gym has now provided a substantially clearer description of the desired customer acquisition process.

The immediate business objective is not simply increased social media presence.

The desired system is:

Ad
→ immediate prospect interaction
→ collect contact information
→ schedule an intro class immediately
→ notify gym staff
→ next-day personal phone call
→ confirm scheduled visit
→ prospect attends or no-shows
→ continue follow-up or reschedule
→ membership conversion

The gym specifically wants automation to reduce the time between:

1. prospect interest
2. contact capture
3. scheduled intro class

The objective is to "lock in" a specific date and time while the prospect is actively interested.

---

# 2. Business Timing

The gym considers the current period through approximately mid-November to be an important customer acquisition window.

They report that acquisition tends to slow around mid-November and remains slower until January.

Development should therefore favor:

- rapid delivery
- operational usefulness
- simple workflows
- incremental releases

over:

- broad feature coverage
- elaborate architecture
- premature abstraction
- cosmetic perfection

The acquisition funnel should become usable as quickly as reasonably possible.

---

# 3. Current Meta Information

The gym reports that:

- it has already been using Facebook advertising
- Facebook is connected to Instagram
- ads are currently distributed to both platforms through an existing Meta interface
- the exact Meta configuration is not yet known

The gym referred to the interface as "media center."

Do not assume what they mean by this term.

It could refer informally to:

- Meta Business Suite
- Ads Manager
- another Meta interface

The current Meta architecture is being inventoried.

---

# 4. Suspected Existing Social Assets

The following appear to be the current gym social accounts and are awaiting confirmation:

Facebook:
https://www.facebook.com/Renzogracieut

Instagram:
https://www.instagram.com/renzogracieut

Do not hard-code these URLs as verified configuration until confirmation is received.

---

# 5. Meta Questions Currently Pending

The gym has been asked to confirm:

1. Whether Facebook and Instagram are managed through Meta Business Suite or individually.
2. Who manages the existing Meta ad account and can provide appropriate access.
3. Where prospects currently go after clicking an advertisement.
4. What system, if any, currently handles intro-class scheduling.
5. What days/times prospects should be allowed to schedule.
6. Screenshots/details of recent advertising campaigns.

These questions are pending.

Do not invent answers.

---

# 6. Meta Architecture Principle

The application must not depend on Meta being available during initial development.

Meta should eventually be treated as an external acquisition provider.

Conceptually:

Meta
→ acquisition event
→ Renzo application
→ Lead
→ Intro scheduling
→ Follow-up
→ Conversion

The internal acquisition system should remain functional if Meta is:

- not connected
- temporarily unavailable
- awaiting permissions
- changed in the future

---

# 7. Revised Core Funnel

The primary application workflow is now:

TRAFFIC / AD
    ↓
PROSPECT INTEREST
    ↓
CONTACT CAPTURE
    ↓
INTRO CLASS SCHEDULING
    ↓
LEAD CREATED / UPDATED
    ↓
GYM NOTIFIED
    ↓
NEXT-DAY PHONE FOLLOW-UP
    ↓
CONFIRMATION
    ↓
INTRO CLASS
    ↓
ATTENDED / NO SHOW
    ↓
JOINED / RESCHEDULE / FOLLOW-UP

This funnel should drive implementation priorities.

---

# 8. Human Interaction Is Intentional

The gym specifically wants a human phone call after scheduling.

Do not attempt to automate the complete sales process.

Automation should support humans.

Desired model:

AUTOMATION
- capture lead
- capture phone number
- schedule intro
- create follow-up task
- notify staff
- surface due tasks
- record state
- trigger future reminders

HUMAN
- call prospect
- establish personal contact
- confirm appointment
- welcome prospect
- conduct intro
- handle nuanced sales conversation

The system should make human actions reliable and measurable rather than eliminate them.

---

# 9. Follow-Up Task Requirement

The next-day phone call is now a first-class business requirement.

The data model should support tasks/follow-ups.

Conceptual entity:

FollowUpTask
- id
- leadId
- type
- dueAt
- status
- assignedUserId optional
- completedAt optional
- outcome optional
- notes optional
- createdAt
- updatedAt

Initial task type:

PHONE_CALL

Initial statuses:

PENDING
COMPLETED
CANCELLED

Additional types/statuses should not be added without a demonstrated requirement.

When an intro class is scheduled, the application should eventually be capable of automatically creating the appropriate follow-up task.

The exact timing rule for "the following day" should remain configurable rather than being buried in application logic.

---

# 10. Intro Scheduling Is Now High Priority

The original specification treated the public lead form as a later V1 milestone.

That priority has changed.

Intro scheduling is central to the business requirement.

The public acquisition experience should eventually allow a prospect to:

1. provide contact information
2. select an available intro date/time
3. submit the booking
4. receive confirmation
5. create/update a Lead
6. create a Trial
7. create required follow-up work
8. notify appropriate gym staff

The exact available schedule is currently unknown.

Do not invent a gym schedule.

---

# 11. Trial Model

A Trial remains a separate entity from Lead.

Conceptual model:

Trial
- id
- leadId
- scheduledAt
- label optional
- status
- notes optional
- createdAt
- updatedAt

A Lead may have multiple Trial records.

Example:

Lead
├── Trial 1: NO_SHOW
├── Trial 2: RESCHEDULED/CANCELLED
└── Trial 3: ATTENDED

The gym currently appears willing to allow approximately three intro classes.

Do not enforce a hard database limit of three.

The number of permitted intro classes should remain flexible.

---

# 12. Scheduling Model

Do not build a complete class scheduling system.

The acquisition system only needs enough scheduling functionality to place a prospect into an allowed intro-class time.

Eventually the system may require configurable intro availability such as:

IntroSlot / IntroAvailability

Potential concepts:

- day of week
- start time
- active/inactive
- program
- effective dates
- capacity if later required

However, exact requirements are pending the gym's response.

Do not implement speculative scheduling complexity until availability rules are known.

---

# 13. Lead Contact Requirements

Phone number is now particularly important.

The gym explicitly wants a phone number so staff can make personal follow-up calls.

Public acquisition flows should therefore require a phone number unless later business requirements change.

For Adult BJJ:

Lead/contact = participant.

For Kids BJJ:

Lead/contact = parent or guardian.
Participant = child.

---

# 14. Programs

Confirmed offerings:

- Adult BJJ
- Kids BJJ
- Striking, seasonal
- Wrestling, seasonal

The gym does NOT currently offer Muay Thai as a standalone program.

BJJ is the primary business offering.

Program availability should eventually support active/inactive or seasonal behavior without database redesign.

---

# 15. Lead Statuses

Current proposed lead pipeline:

NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
NO_SHOW
JOINED
LOST

Backward/corrective changes are permitted with history.

NO_SHOW is a real state because rescheduling and no-show recovery are important to the acquisition process.

---

# 16. Scheduling Outcomes

A scheduled prospect may:

- attend
- no-show
- cancel
- reschedule

The system should preserve history.

Do not overwrite the original Trial record when a prospect reschedules if doing so would destroy useful history.

---

# 17. Acquisition Sources

Initial sources remain:

INSTAGRAM
FACEBOOK
WALK_IN
REFERRAL
WEBSITE
PHONE
OTHER

Future Meta integration should preserve more detailed source information when available.

Potential future fields include:

- Meta campaign ID
- Meta ad set ID
- Meta ad ID
- Meta lead ID
- external click/tracking identifiers

Do not add these speculatively unless needed, but leave clear extension points.

---

# 18. Campaigns

Campaign remains a first-class application concept.

A Campaign should represent the business acquisition effort, not necessarily a one-to-one copy of a Meta Campaign.

Example:

Fall Adult BJJ Acquisition

could eventually correspond to multiple:

- Meta campaigns
- Facebook ads
- Instagram ads
- landing pages
- content items

This separation is intentional.

Internal business campaigns should not be tightly coupled to Meta's data model.

---

# 19. Content Priority Change

Content management remains useful but is no longer ahead of the acquisition funnel in priority.

The current priority is:

1. Lead capture
2. Intro scheduling
3. Follow-up workflow
4. Conversion tracking
5. Meta integration
6. Content management and deeper analytics

Content functionality should not delay the lead-to-intro workflow.

---

# 20. Revised Development Priorities

The original milestone sequence should be reconsidered.

Recommended current sequence:

M0
Application foundation

M1
Core database/domain model

M2
Authentication/users

M3
Lead CRM

M4
Intro scheduling funnel

M5
Follow-up/task workflow

M6
Meta integration

M7
Content and expanded analytics

Exact milestone numbering may be adjusted based on current implementation progress.

The important requirement is priority, not the number.

---

# 21. Meta Integration Possibilities

The exact Meta acquisition mechanism is not yet known.

Possible future flows include:

OPTION A

Meta Ad
→ external landing page
→ Renzo /trial
→ schedule intro

OPTION B

Meta Ad
→ Meta Instant Form
→ Lead received
→ scheduling interaction/link

OPTION C

Meta Ad
→ Messenger / Instagram messaging
→ automated interaction
→ contact capture
→ scheduling

Do not choose an implementation until the current Meta setup and business preference are known.

The internal CRM should support any of these approaches.

---

# 22. Notifications

The gym wants contact information available immediately after acquisition.

The eventual system therefore needs a notification mechanism.

Potential future channels include:

- internal dashboard
- email
- SMS
- WhatsApp
- other messaging provider

No notification provider has been selected.

Do not prematurely integrate one.

Create service boundaries when implementation reaches this requirement.

---

# 23. WhatsApp

The project team is currently coordinating primarily through WhatsApp.

This does NOT currently mean WhatsApp is part of the customer acquisition architecture.

Do not build WhatsApp integration based solely on internal team communication.

It may be considered later if there is a real customer-facing or staff-notification requirement.

---

# 24. Current Unknowns

The following remain intentionally unresolved:

- current Meta Business Portfolio configuration
- Meta Business Suite usage
- Meta ad account configuration
- existing campaigns
- current click destination
- current scheduling system
- intro availability
- attendance-recording process
- membership-management software
- notification provider
- SMS provider
- email provider
- Meta API permissions
- final production hosting

The application should not invent these answers.

---

# 25. Current Development Principle

Build the parts whose business rules are now known.

Create clean extension points for the parts still being discovered.

Do not block development waiting for Meta.

Do not build speculative Meta integrations.

Do not build speculative scheduling rules.

Do not build speculative membership integrations.

The immediate technical objective is to create a strong internal domain model for:

Lead
→ Trial
→ FollowUpTask
→ Conversion

while allowing external acquisition providers to be integrated later.