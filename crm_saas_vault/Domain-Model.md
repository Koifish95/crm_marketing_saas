---
type: note
status: current
area: domain
updated: 2026-09-08
tags:
  - domain
---

# Domain model

Implemented in M1 (`server/database/schema/index.ts`), extended in M8 and M9. Internal CRM: [[CRM]]. Validation: `shared/schemas/`. Persistence details: [[Database]].

```text
UserType ── UserRole ── AccessRight (code catalog)
User ── extra UserRole assignments

Campaign ── CampaignTrackingLink
    |         destination /trial or /events/:slug
    ├── CampaignCollaborator / CampaignProgram
    ├── MarketingTask
    ├── ContentItem ── channels, publications
    ├── Asset / AssetUsage
    └── AcquisitionEvent ── Session ── Registration ── RegistrationLines
                              └── batch process ──► LeadHeader / LeadLine
    |
    v
LeadHeader (table: leads)
 |
 +---- LeadLine (prospective member)
 |         +---- Trial (lead_line_id)
 |         +---- Conversion (snapshot; one active)
 |         +---- LeadLineLostOutcome
 |         +---- CompensationAttribution + history
 |         +---- CompensationEarned (JOINED snapshot)
 |
 +---- LeadStatusHistory
 +---- LeadNote
 +---- Trial (also header FK)
 +---- FollowUpTask ── optional FollowUpTaskLine
 |         purpose INITIAL_SCHEDULE | EVENT_FOLLOW_UP | MANUAL
 +---- LeadPossibleDuplicate (internal warning; not a merge)
 +---- PublicBookingSubmission (idempotency key → completed confirmation)

Program ── MembershipOffering
        ── HouseholdPricingRule
        ── LeadLine

Meta* (read-only) ── explicit CampaignMetaMap ── Campaign
```

`User` authenticates staff ([[Authentication]]). Optional FKs: status history `changedByUserId`, note `createdByUserId`, task `assignedUserId`. Coarse `role` stays ADMIN/STAFF/VIEWER. Marketing capabilities are Access Rights.

Intro booking configuration ([[Intro-Scheduling]]) is independent of Lead until a public `/trial` submit creates a Trial.

## Program

Configurable offering. Not a TypeScript enum. Seasonal rows can be deactivated later without a deploy that changes code constants.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `code` | unique (`ADULT_BJJ`, …) |
| `name` | display name |
| `active` | currently available for acquisition/scheduling |
| `seasonal` | offering is seasonal; not a current-season calendar |
| `createdAt` / `updatedAt` | UTC ms |

Seed: [[Database#Seed]]. No Muay Thai.

## Campaign

Internal acquisition **and** marketing-planning effort. One campaign may map to several ads, landing pages, content items, or events. **Not** a Meta Campaign ID.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `name` | |
| `slug` | unique, lowercase hyphenated |
| `kind` | `ORGANIC` or `PAID` |
| `budgetCents` | optional planned budget (`$0` valid), not actual spend |
| `channel` | optional free text |
| `status` | `DRAFT` `PLANNED` `ACTIVE` `COMPLETED` `CANCELLED` |
| `active` | synced from `status === 'ACTIVE'` (currently live). Tracking resolve stamps unless `CANCELLED`, not only while `active` |
| `description` / `objective` / `offer` / `targetAudience` / `notes` | planning copy |
| `ownerUserId` | optional staff owner |
| `startsAt` / `endsAt` | planned window |
| `actualStartsAt` / `actualEndsAt` | actual window |
| `createdAt` / `updatedAt` | UTC ms |

Collaborators and programs are join tables. There is **no CampaignLine**. Staff UI: compact `/marketing/campaigns`, create at `/marketing/campaigns/new`, workspace at `/marketing/campaigns/:id`. Attributed households (LeadHeader `campaignId`) are Campaign context for `VIEW_MARKETING`; detailed Performance is `VIEW_MARKETING_REPORTS`. Household rows link to `/leads/:id?campaignId=`. The reverse link from Lead Detail is `/marketing/campaigns/:id`. Legacy hashes `#campaign-:id` on the index redirect to the workspace.

## CampaignTrackingLink

Reusable URL for a Campaign. Creating a campaign creates a Default link (`utm_source=campaign`, `utm_medium=link`, `utm_campaign=slug`) and a unique `publicSlug` (from the campaign slug). Extra labeled links are optional and get their own slug (`campaign-slug-label`, or staff-chosen). Preferred public URL is `/t/:publicSlug`. The hex `code` stays canonical for `?c=` links already shared. `destinationPath` is `/trial` or `/events/:slug` only. Do not invent Facebook vs Instagram from one reused link.

Attribution (campaign, tracking link, UTM) lives on the **LeadHeader**. `/t/:slug` writes the same `renzo-trial-attribution` session as `?c=` and continues to the destination without the query string. Tracking codes stamp `campaignId` unless the Campaign is `CANCELLED`. Copying a tracking URL while status is not `ACTIVE` warns; it does not hard-block. Household staff UI also shows derived Acquisition Events from processed registrations.

## LeadHeader

Table `leads` is the household / inquiry — the person we contact. Do not rename the table blindly.

- Adult BJJ: the header contact is usually also a `SELF` LeadLine.
- Kids BJJ: the header is the parent/guardian; the child is a `CHILD` line. Do not invent a fake parent line.

M8 added `campaignTrackingLinkId`, `utmSource`, `utmMedium`, `utmContent`, `utmTerm`. Phone/email rules are unchanged.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `firstName` | required |
| `lastName` | optional |
| `phone` | indexed, **not unique**; required unless email is present. Public `/trial` stores digits-only canonical form |
| `email` | indexed, **not unique**; required unless phone is present |
| `programId` | required FK → Program |
| `experienceLevel` | `NONE` `BEGINNER` `INTERMEDIATE` `ADVANCED` `UNKNOWN` |
| `source` | `INSTAGRAM` `FACEBOOK` `WALK_IN` `REFERRAL` `WEBSITE` `PHONE` `OTHER` |
| `status` | `NEW` `CONTACTED` `RESPONDED` `TRIAL_SCHEDULED` `TRIAL_ATTENDED` `NO_SHOW` `JOINED` `LOST` |
| `participantFirstName` / `participantLastName` / `participantAge` / `guardianRelationship` | kids |
| `campaignId` | optional FK → Campaign |
| `joinedAt` | optional UTC ms |
| `monthlyRateCents` | optional integer cents |
| `smsConsent` / `smsConsentAt` | |
| `emailConsent` / `emailConsentAt` | |
| `createdAt` / `updatedAt` | UTC ms |

No Meta IDs on the header except through optional Campaign mapping.

Database CHECK `leads_phone_or_email_check` rejects rows with neither a non-empty phone nor a non-empty email. Zod `createLeadSchema` matches that rule. Duplicates are allowed. Matching phone/email is an internal possible-duplicate warning; it does not merge households ([[CRM]], [[Intro-Scheduling]]). Public `/trial` and staff `/leads/new` always create a new LeadHeader for a new submission key.

Header pipeline status still exists for display. Multi-line JOINED/LOST on the header is not “convert everyone.” Convert or mark lost each line. `closedAt` is derived when every line is terminal. Mixed JOINED+LOST is a valid closed household. Details: [[CRM]].

## LeadLine

Prospective member under a household. A line can exist with zero Trials. Reschedules add Trial rows on the same line.

Relationship: `SELF` `CHILD` `SPOUSE` `OTHER`. A household may have **at most one** `SELF` line — the prospective member who is the primary contact on the LeadHeader. Additional people use `CHILD` / `SPOUSE` / `OTHER`. Guardian-only households may have zero `SELF` lines. Optional offering, monthly override cents, discount reason. JOINED/LOST must go through Conversion / Lost services, not a raw status post.

## Conversion

Acquisition boundary. One active conversion per line (`reversed_at IS NULL`). Snapshots offering name and integer cents (**Conversion Snapshot MRR**). That snapshot is not active Forecast MRR and is not cash collected. ADMIN reverse stamps `reversedAt`; history is kept. No `Member` domain.

## Lost outcome

Required lost reason, optional note, actor, `reopenedAt` when the line leaves LOST.

## LeadStatusHistory

| Field | Notes |
|---|---|
| `id` | integer PK |
| `leadId` | FK |
| `fromStatus` | optional |
| `toStatus` | required |
| `changedByUserId` | optional FK → User |
| `note` | optional |
| `createdAt` | UTC ms |

## LeadNote

| Field | Notes |
|---|---|
| `id` | integer PK |
| `leadId` | FK |
| `body` | required |
| `createdByUserId` | optional FK → User |
| `createdAt` / `updatedAt` | UTC ms |

## Trial

Separate from the household. Many per LeadLine. Preserve history on no-show, attend, and reschedule (old Trial stays `ATTENDED` / `NO_SHOW` / `CANCELLED`; a later intro is a new `SCHEDULED` row). After `ATTENDED`, scheduling another intro returns that LeadLine to stored status `TRIAL_SCHEDULED`. Not a class-capacity scheduler. No database cap of three intros.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `leadId` | FK → LeadHeader |
| `leadLineId` | FK → LeadLine |
| `scheduledAt` | UTC ms |
| `label` | optional (e.g. “Tuesday intro”) |
| `status` | `SCHEDULED` `ATTENDED` `NO_SHOW` `CANCELLED` |
| `notes` | optional |
| `createdAt` / `updatedAt` | UTC ms |

Staff record `ATTENDED` / `NO_SHOW` through `setTrialOutcome`. When `allowEarlyTrialOutcomes` is OFF, those two outcomes wait until `scheduledAt` (UTC ms). Cancel is not time-gated. Default ON. See [[Decisions#2026-09-02 — Allow early Trial outcomes is an ADMIN setting]].

No `Class`, `ClassSchedule`, `Capacity`, or member-attendance tables. Intro booking uses [[Intro-Scheduling]] (`intro_availability_rules` + `intro_exceptions`).

## FollowUpTask

Work item for human follow-up. The first operational type is a confirmation phone call after an intro is scheduled.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `leadId` | FK |
| `trialId` | optional FK → Trial; required for automatic initial-schedule tasks |
| `type` | currently `PHONE_CALL` |
| `purpose` | `INITIAL_SCHEDULE` (automatic intro confirmation), `EVENT_FOLLOW_UP` (household call after event batch), or `MANUAL` |
| `dueAt` | UTC ms; calculated, not a hard-coded +24h column |
| `status` | `PENDING` `COMPLETED` `CANCELLED` |
| `assignedUserId` | optional FK → User; automatic tasks start unassigned |
| `completedByUserId` | optional FK → User; who completed the task |
| `completedAt` | optional UTC ms |
| `outcome` | required on complete: `REACHED` `NO_ANSWER` `LEFT_VOICEMAIL` `WRONG_NUMBER` `OTHER` |
| `notes` | optional plain text |
| `createdAt` / `updatedAt` | UTC ms |

Default due date: two weekdays after the scheduling operation, 5:00 PM America/Denver. Saturday and Sunday are skipped; holidays are not. Constants live in `shared/utils/follow-up.ts`.

At most one **pending** `INITIAL_SCHEDULE` task per Trial remains the database partial unique (`trial_id`). Application code consolidates overlapping pending acquisition calls (`INITIAL_SCHEDULE` and `EVENT_FOLLOW_UP`) to one household task. Scheduling a Trial retargets a pending Event follow-up to `INITIAL_SCHEDULE` (source event kept; due date not reset). Event process attaches to a pending intro confirmation instead of opening another call. Two Event follow-ups without intros may still coexist until a Trial is scheduled. Do not add `UNIQUE(leadId)`: a household may create a new confirmation later after an earlier call is completed. A tighter database invariant remains a PostgreSQL item, not M9. Retrying the same public submission key does not create a second pending task. A new submission key creates a new household and its own confirmation work. Reschedule retargets a still-useful pending household task. Trial `CANCELLED` / `ATTENDED` / `NO_SHOW` cancels that pending confirmation only when no other relevant `SCHEDULED` Trial remains. Completed history is kept. Completing a call does not change Lead status. No automatic no-show or membership-sales task.

Event batch processing ensures one `EVENT_FOLLOW_UP` task per household+event (`source_event_id`, unique) when no pending intro confirmation exists. Event attendance is not Trial attendance. Event tasks do not present later Trial times until retargeted as intro confirmation.

Marketing Tasks are a **different** table. Never store creative/content work as `FollowUpTask`.

Optional `follow_up_task_lines` links a task to relevant people. Converting or losing a line cancels that line’s pending trial-initial task and line-linked tasks when no other linked line is still active. Shared header tasks stay open while another line is active.

## PublicBookingSubmission

Opaque public `/trial` idempotency record. Unique `idempotencyKey`. Stores the completed confirmation JSON and LeadHeader id after a successful transactional booking. The same key replays that result. Contact fields are not the key.

## LeadPossibleDuplicate

Structured internal warning on a newly created LeadHeader when its primary-contact phone and/or email exactly matches another header (`PHONE` `EMAIL` `BOTH`). Stores matched LeadHeader id, display name, and detected-at. Staff-only. Does not change status, Forecast MRR, or reports. Not a merge.

## Meta (read-only V1)

Stored separately from core acquisition: ad account, Meta campaign / ad set / ad, daily metrics, sync runs, and `campaign_meta_maps`. ADMIN maps an internal Campaign to a Meta campaign by id, never by name. Reach is not additive across days.

## MarketingTask

Collaborative marketing work item (`marketing_tasks`). Types include asset request, caption, publish, weekly summary, and other. Status `PENDING` `COMPLETED` `CANCELLED`. Due buckets reuse Denver `followUpDueState`. Not a Lead FollowUpTask.

## ContentItem

Marketing content plan in `content_items` (M9): status `IDEA` … `PUBLISHED` / `CANCELLED` (no `SCHEDULED`). Channels, optional approval (`APPROVE_CONTENT`), assigned publisher, manual `content_publications` history. Optional **one** `campaignId` — Content is not many-to-many with Campaigns. Does not post to Meta. Staff queue `/marketing/content`; focused detail `/marketing/content/:id` links back to that Campaign. Not a LeadHeader child and not a CampaignLine.

## Asset

File metadata in SQLite; bytes on disk. Marketing-use `UNKNOWN` `APPROVED` `RESTRICTED` `DO_NOT_USE`. Direct `assets.campaignId` / `contentItemId` plus reusable `asset_usages` (Campaign and/or Content). Asset detail lists those usages with links. Used assets archive; unused may delete.

## AcquisitionEvent

Public or staff registration of a gym event that can later become Leads. Sessions, constrained questions, roster attendance. Registration rows are not households until batch process. Public signup does not warn about possible duplicates. Staff Roster and Process show advisory matches and may force-create a new household. Staff workspace `/marketing/events/:id`. Details: [[CRM]], [[Implementation-State]].

## CompensationAttribution

Per-LeadLine credit for earned compensation, separate from header acquisition attribution and from Follow-up ownership. SYSTEM credit for an app-generated tracking link uses `compensation.tracked_acquisition_owner_user_id` (ADMIN Settings), not Campaign owner. Campaign/event evidence without a generated tracking link stays UNASSIGNED unless ADMIN assigns it. History is append-only. On JOINED, `compensation_earned` snapshots cents and basis so later price/campaign edits cannot rewrite it.

## IntroAvailabilityRule

Recurring weekly class that may accept a first-time trial. Configuration, not a class-capacity scheduler. Details: [[Intro-Scheduling]].

| Field | Notes |
|---|---|
| `id` | integer PK |
| `programId` | FK → Program (`ADULT_BJJ` or `KIDS_BJJ`) |
| `weekday` | 0 = Sunday … 6 = Saturday (America/Denver) |
| `startMinute` / `endMinute` | minutes from midnight, Denver wall clock |
| `name` | class label shown publicly |
| `ageMin` / `ageMax` | Kids bands; Adult null |
| `enabled` | public form ignores disabled rows |
| `seedKey` | unique; seed identity only |
| `createdAt` / `updatedAt` | UTC ms |

## IntroException

Date-specific override of recurring rules.

| Field | Notes |
|---|---|
| `id` | integer PK |
| `kind` | `CLOSE_DATE` `CLOSE_RULE` `OPEN_SLOT` |
| `onDate` | `YYYY-MM-DD` America/Denver |
| `ruleId` | optional FK → IntroAvailabilityRule (`CLOSE_RULE`) |
| `programId` / `startMinute` / `endMinute` / `name` / `ageMin` / `ageMax` | used by `OPEN_SLOT` |
| `note` | optional staff note |
| `createdAt` | UTC ms |

## User

Staff identity. Authentication: [[Authentication]].

| Field | Notes |
|---|---|
| `id` | integer PK |
| `username` | unique; bootstrap default `admin`; also a sign-in identifier |
| `email` | unique across all rows including inactive; also a sign-in identifier; stored lowercase |
| `displayName` | |
| `role` | `ADMIN` `STAFF` `VIEWER` |
| `active` | inactive users cannot log in or keep using internal routes |
| `passwordHash` | scrypt PHC string; never exposed in API/UI |
| `mustChangePassword` | true for new users and after ADMIN require-password-change; false after ADMIN sets a password |
| `sessionVersion` | incremented to revoke cookies |
| `lastLoginAt` | UTC ms; updated on successful login |
| `createdAt` / `updatedAt` | UTC ms |

Users are never hard-deleted. Security history is `security_events` (append-only).

Related: [[Requirements]], [[Decisions]], [[Funnel]].
