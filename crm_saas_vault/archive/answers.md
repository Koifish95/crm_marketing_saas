Use the suggested defaults from V1 Questions except for the decisions below. These decisions supersede the suggested defaults.

1.1 — GREENFIELD.
Build a new application from the current specification. Keep existing git history but do not migrate or reshape the old Contact/ticket/sequence schema.

1.2 — OUT OF V1.
The old website is not part of this application. Public V1 functionality is limited to acquisition-oriented routes such as /trial.

1.3 — Keep old implementation in git history only.

2.1 — B: M0–M7.
V1 includes scaffolding, database, authentication, lead CRM, content pipeline, dashboard, analytics, and the public /trial form.

M8–M10 are post-V1.

2.2 — Scott-only operationally in V1.
Still implement ADMIN / STAFF / VIEWER in the schema and authorization model so adding gym staff does not require redesign.

2.3 — Include No Show and Reschedule functionality.

3.1 — Use an environment-seeded ADMIN account for development.
No public signup.

3.2 — No password reset in V1.

3.3 — Use nuxt-auth-utils unless implementation reveals a concrete incompatibility.

4.1 — Parent/guardian is the primary Lead/contact for Kids BJJ.

Model the person we communicate with as the Lead.

For an adult:
Lead/contact and participant are the same person.

For a child:
Lead/contact = parent or guardian.
Participant = child.

Support optional participant fields such as:
participantFirstName
participantLastName
participantAge
guardianRelationship

Do not require participant fields for adult leads.

4.2 — Programs:
ADULT_BJJ
KIDS_BJJ
STRIKING
WRESTLING
OTHER

BJJ is the primary offering.
Striking and wrestling are seasonal.

Do NOT include Muay Thai.

Design program representation so seasonal offerings can later be enabled/disabled without schema redesign.

4.3 — Experience levels:
NONE
BEGINNER
INTERMEDIATE
ADVANCED
UNKNOWN

4.4 — Allow duplicate creation but detect matching phone/email and flag possible duplicates.
Do not build merge functionality in V1.

4.5 — Internal lead:
firstName + at least phone OR email.

Public /trial:
firstName
lastName
phone
program
communication consent

Email is optional.

For Kids BJJ, the submitted primary name/contact information represents the parent/guardian and child/participant information is collected separately.

4.6 — Sources:
INSTAGRAM
FACEBOOK
WALK_IN
REFERRAL
WEBSITE
PHONE
OTHER

5.1 — Allow forward status skipping.
Example: NEW → TRIAL_SCHEDULED is valid.

5.2 — Allow backward/corrective status changes, but require a note and always write status history.

5.3 — LOST uses an optional free-text reason in V1.

5.4 — Add NO_SHOW as a real lead status.

Pipeline statuses:
NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
NO_SHOW
JOINED
LOST

A NO_SHOW can later return to TRIAL_SCHEDULED when another trial is scheduled.

6.1 — Do NOT implement reusable class slots or class capacity.

Create a lightweight Trial entity instead.

Trial:
id
leadId
scheduledAt
label optional
status
notes optional
createdAt
updatedAt

This is NOT a gym scheduling system.

6.2 — A Lead can have multiple Trial records.

Do not overwrite historical trial dates.

This supports:
scheduled → no show → rescheduled → attended

Operationally, the gym currently appears willing to offer a prospect approximately three trial classes, but DO NOT hard-code a three-trial database limit. Keep this flexible.

6.3 — Do not encode the gym class schedule yet.
Free datetime + optional label is sufficient.

6.4 — Current exact booking workflow is not confirmed.
Do not invent one.

7.1 — Adult BJJ is currently $175/month.

Do not hard-code membership pricing into business logic.

When a lead joins, support monthlyRate.

The UI may default Adult BJJ to $175, but it must remain editable.

Rates for Kids BJJ, striking, wrestling, family memberships, promotions, etc. are currently unknown.

7.2 — JOINED means an authorized user manually confirms that the prospect became a member.

Store:
joinedAt
monthlyRate

No billing/payment integration in V1.

7.3 — Do not show Scott's estimated commission in V1.
Show gym MRR / acquired membership value only.

Attribution and commission calculations are deferred.

7.4 — Trial pricing/offers are currently unknown.
Do not assume all future introductory offers must be free.

8.1 — Campaign is a first-class lightweight entity.

Suggested fields:
id
name
slug
channel
active
startsAt optional
endsAt optional
createdAt
updatedAt

Do not add advertising spend/budget complexity yet.

8.2 — contentId is optional.

Public lead capture should support source/campaign query parameters.

Content attribution can be manually selected when known.

8.3 — List/filter + planned date is enough.
No dedicated calendar UI unless later justified.

9.1 — Media is optional URL/reference only.
No file-upload system in V1.

9.2 — Keep proposed content types.

9.3 — Allow optional manual performance metrics, but analytics should not depend on them.

10.1 — Public V1 route is /trial.
Use query parameters for source/campaign attribution.
Do not build /adults, /kids, or /offer/:campaign yet.

10.2 — After submission show a neutral confirmation indicating that the gym will contact the prospect.
Do not claim an automated SMS will be sent because messaging automation is not implemented yet.

10.3 — Honeypot + IP rate limiting initially.
Captcha can be added when deployed publicly if necessary.

10.4 — Store SMS and email consent separately.

Prefer:
smsConsent
smsConsentAt
emailConsent
emailConsentAt

Do not use one generic consent boolean.

10.5 — Privacy-policy decision can wait until public deployment.

11.1 — America/Denver.

11.2 — No chart library initially.
Use metrics, percentages, and tables.
Reconsider during M6.

11.3 — Current month initially.

12.1 — Do not build an Integrations product page in V1.
Provider/service boundaries may exist in code where appropriate, but M8 is post-V1.

13.1 — Local development is sufficient during initial implementation.

M0 should include Dockerfile/docker-compose support so deployment architecture is understood, but VPS deployment is not part of initial implementation.

13.2 — Domain decision deferred.

13.3 — For now:
The gym owns its Meta/business assets.
Scott owns/controls the acquisition application and infrastructure.
This can be revisited if the business arrangement changes.

14.1 — Current assumption:
Marta, the Head Instructor's wife, appears to currently handle incoming Facebook/Instagram inquiries.

Treat this as provisional.
Do not build workflow rules that depend on Marta specifically.

The future system should allow multiple STAFF users to process leads.

14.2 — Current trial attendance-recording process is unknown.
Do not invent an external workflow.
V1 will provide its own manual attendance/no-show actions.

14.3 — Existing membership management software is currently unknown.
Do not create fake external member IDs or integration assumptions.

14.4 — Existing vendor/lead export availability is unknown.
No migration/import work in V1.

14.5 — Scott is the only confirmed V1 user.
Future users may include Marta, instructors, owners, or other staff.

15.1 — Internal application working name:
Renzo Gracie Kaysville Acquisition

This can be renamed later.

15.2 — Build a clean functional UI first.
Brand refinement can occur later.

15.3 — Kids leads require guardian contact information.
Do not treat a minor as the communication/contact target.

16.1 — YES.
Implement M0 ONLY next and STOP for review before beginning M1.

16.2 — Leave the deleted draft implementation deleted.
Generate the new application tree.
Git history preserves the old implementation.

16.3 — Follow suggested testing strategy.
Do not introduce Playwright during M0.
Add appropriate schema/API tests as business functionality appears and consider browser testing when the public form is implemented.

IMPORTANT IMPLEMENTATION RULE:

Do not proceed beyond M0.

M0 should contain infrastructure/scaffolding only:
- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS
- Drizzle ORM dependencies/configuration
- SQLite configuration
- Zod
- nuxt-auth-utils dependency/configuration foundation
- environment configuration
- linting/formatting
- Dockerfile/docker-compose
- basic application shell
- README/developer instructions

Do NOT create the Lead, Trial, Campaign, ContentItem, User, or analytics business schema during M0. Those belong to M1.

Do NOT implement authentication behavior during M0. That belongs to M2.

Do NOT implement CRM pages or fake business functionality.

At completion of M0, stop and report:
1. files created/changed
2. dependencies added
3. commands required to run the project
4. Docker instructions
5. any deviations from the requested stack
6. warnings/problems encountered
7. recommended M1 plan

Do not begin M1 without approval.