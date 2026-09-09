# M8 V2 --- V1 Functional Completion, Household Lead Model, Reporting & Meta Integration Discovery

**Project:** Renzo Gracie Kaysville Customer Acquisition System\
**Milestone:** M8\
**Implementation agent:** Cursor\
**Specification version:** V2 --- finalized product decisions\
**Date:** 2026-08-31\
**Database for this milestone:** SQLite\
**Business timezone:** `America/Denver`

> This document supersedes
> `M8_V1_Functional_Completion_Reporting_Meta_Integration_Cursor_Prompt_2026-08-30.md`
> where V2 makes a product decision explicit or changes the model. Use
> the earlier M8 V1 document as background only. Do not re-open
> decisions finalized here unless repository reality exposes a material
> contradiction.

------------------------------------------------------------------------

# 1. Mission

M8 is the V1 functional-completion and schema-discovery milestone.

The objective is to finish the acquisition workflow far enough that
Renzo Gracie Kaysville can answer:

> Where did this household come from, which prospective members were
> involved, what happened to each person, who trialed, who joined or was
> lost, what forecasted acquisition value did the household create, and
> what marketing effort produced the result?

M8 also introduces a thin, read-only Meta integration so real marketing
data can inform the V1 schema before schema hardening and PostgreSQL
migration.

The intended sequence remains:

``` text
M0–M5  Accepted acquisition foundation
M6     UI/UX + Design System
M7     Authentication / Users / Security
M8     Functional Completion + Reporting + Meta V1
M9     Schema Hardening / V1 Data Model Review
M10    PostgreSQL 18 Migration
M11    Raspberry Pi Staging
M12+   Further Meta / production work
```

Do **not** migrate to PostgreSQL, implement Docker deployment, or deploy
to the Raspberry Pi in M8.

------------------------------------------------------------------------

# 2. Product Boundary

This application remains a **customer-acquisition system**, not a
gym-management platform.

The acquisition flow is:

``` text
Marketing / Campaign
        ↓
LeadHeader (household / inquiry)
        ↓
LeadLines (prospective members)
        ↓
Contact / Follow-Up
        ↓
Trial(s)
        ↓
Individual outcome
        ↓
Conversion or Lost
        ↓
Forecasted acquisition value
        ↓
Reporting / Attribution
```

M8 must **not** implement:

-   recurring billing,
-   payment collection,
-   invoices,
-   accounts receivable,
-   accounts payable,
-   cash-receipt tracking,
-   existing-member attendance,
-   rank/belt tracking,
-   membership freezes,
-   membership cancellations/retention workflows,
-   payroll,
-   accounting,
-   a generalized member-management system.

## Future member-management seam

Design the acquisition endpoint so a future member-management system can
continue from it cleanly.

That means stable identifiers, normalized Programs and Membership
Offerings, clean relationships, and an explicit Conversion/Enrollment
record.

Do **not** create a `Member` domain or begin member-management
functionality in M8.

**Conversion is the acquisition-system boundary.**

------------------------------------------------------------------------

# 3. Read and Audit Before Editing

Before making changes:

1.  Read all current project handoffs and milestone documentation.
2.  Read the M6/M7 implementation/audit documents.
3.  Read the previous M8 V1 specification for background.
4.  Inspect the actual repository, schema, migrations, services, APIs,
    pages, tests, seed data, and Git state.
5.  Audit the existing Lead lifecycle and its current Trial/Follow-Up
    automation.
6.  Audit all references to the current Lead primary key before
    introducing the household model.
7.  Audit Trial ownership, FollowUpTask ownership, Lead history,
    Dashboard queries, public `/trial`, source/campaign handling, and
    tests.
8.  Produce a concise migration/refactor plan before editing.
9.  Preserve accepted M0--M7 behavior unless this V2 specification
    explicitly changes it.
10. Treat repository reality as authoritative for implementation
    details, but stop and report if repository reality materially
    contradicts a finalized product decision in this specification.

This milestone includes a meaningful Lead-model refactor. Do not make it
as a blind table rename.

------------------------------------------------------------------------

# 4. Critical Existing Behavior to Preserve

## 4.1 Existing Lead lifecycle

The current Lead lifecycle/business logic has been reviewed conceptually
and is **accepted as a foundation**.

Do not redesign statuses merely because M8 exists.

The goal is to adapt the current lifecycle to the new household/line
model with the smallest coherent changes necessary.

Preserve existing automation among:

-   Leads,
-   Trials,
-   Follow-Up tasks,
-   Lead status/history,
-   Dashboard/task behavior.

Avoid status sprawl and duplicate truth.

## 4.2 M4 Trial behavior

Preserve:

-   public `/trial`,
-   date-first scheduling,
-   configured class/day/time eligibility,
-   Adult/Kids behavior,
-   recurring availability,
-   date exceptions,
-   server-side validation,
-   Trial history,
-   valid rescheduling.

A reschedule must never retain an impossible class/time combination.

## 4.3 M5 Follow-Up behavior

Preserve:

``` text
Trial Scheduled
      ↓
PHONE_CALL FollowUpTask
      ↓
Due within two business days
      ↓
Human follow-up
      ↓
Outcome / note
      ↓
Completed / Cancelled
```

Initial tasks remain server-created, idempotent, `PHONE_CALL`,
`INITIAL_SCHEDULE`, `PENDING`, and due on the second Monday--Friday
business day at 5:00 PM `America/Denver`.

Preserve completed historical tasks during rescheduling.

Preserve mutually exclusive:

``` text
Overdue
Due Today
Upcoming
```

## 4.4 M6/M7

Use the M6 visual system for all new UI.

Preserve M7 server-enforced RBAC, authentication, session behavior,
forced password changes, user administration, and security auditing.

------------------------------------------------------------------------

# 5. Workstream A --- LeadHeader / LeadLine Household Model

## 5.1 Core decision

A Lead represents a **household/inquiry**, not necessarily one
prospective member.

Implement a header/line model conceptually equivalent to:

``` text
LeadHeader
├── shared household/contact information
├── source / campaign / attribution
├── shared notes / inquiry context
├── shared follow-up relationship
└── LeadLines[]
      ├── prospective member A
      ├── prospective member B
      └── prospective member C
```

Preferred domain/table terminology is **LeadHeader** and **LeadLine**
(or repository-consistent plural/snake-case equivalents).

Do not force one household with three prospective members into three
duplicated Leads.

## 5.2 LeadHeader responsibilities

The header owns information shared across the inquiry/household,
including concepts equivalent to:

-   primary contact name,
-   phone,
-   email,
-   household/shared contact information,
-   source,
-   Campaign,
-   attribution/tracking-link information,
-   household/shared notes,
-   created/updated timestamps,
-   lifecycle information that truly belongs to the inquiry rather than
    an individual member.

The primary contact is the person staff use to communicate with the
household.

## 5.3 LeadLine responsibilities

Each LeadLine represents **one prospective member**.

At minimum, model fields/concepts equivalent to:

-   first name,
-   last name,
-   relationship to primary contact/header,
-   date of birth where appropriate,
-   Program interest,
-   line-specific notes,
-   timestamps,
-   lifecycle/outcome references necessary for individual acquisition
    reporting.

Relationship should support at least concepts such as:

``` text
SELF
CHILD
SPOUSE
OTHER
```

Use repository conventions for exact enum/configuration implementation.

## 5.4 Primary contact as a LeadLine

If the primary contact is also a prospective member, they **must also
have a LeadLine**.

Example:

``` text
LeadHeader
Primary contact: Father

LeadLines
1. Father — SELF — prospective Adult member
2. Son    — CHILD — prospective Kids member
```

If a parent is only the contact and is not interested in joining, do not
create a fake prospective-member line for them merely because they are
the header contact.

## 5.5 Trial relationship

A LeadLine may exist with **zero Trials**.

A LeadLine may have **multiple Trials** over its acquisition history.

Trials must ultimately belong to the prospective member/LeadLine so
different members of one household can have independent Trial histories.

Refactor existing Trial relationships carefully and preserve
historical/accepted M4 behavior.

## 5.6 Individual outcomes

Conversion and Lost outcomes belong to **LeadLines**, not to the entire
household.

Example:

``` text
Household
├── Father → CONVERTED
└── Son    → LOST
```

This must be a valid state.

The household must not be treated as entirely lost because one line is
lost, nor entirely converted because one line joined.

## 5.7 Header closure

When **all LeadLines are terminal**, the LeadHeader should
automatically/derivably be considered closed.

Terminal line outcomes include at least:

-   Converted/Joined
-   Lost/Closed

Do not allow the header and lines to drift into contradictory terminal
states.

Prefer deriving header terminal closure from line state where practical
rather than maintaining redundant truth.

## 5.8 Reopening

A Lost LeadLine can be reopened.

Reopening must preserve historical outcome/audit information rather than
deleting the fact that the line was previously closed/lost.

When a line is reopened, header closure must update coherently.

------------------------------------------------------------------------

# 6. Follow-Up Model Under Household Leads

## 6.1 Ownership

Follow-Up tasks belong primarily to the **LeadHeader**, because staff
generally contact the household through the shared primary contact
information.

## 6.2 Optional line association

A Follow-Up task may optionally reference one or more LeadLines when the
task concerns specific prospective members.

Do not require separate duplicate phone-call tasks merely because one
conversation concerns multiple family members.

Choose a clean relational design for optional one-or-many line
association.

## 6.3 Existing automatic Trial follow-up

The accepted M5 Trial → automatic FollowUpTask workflow must continue to
work after Trials move under LeadLines.

Automatic tasks must still be traceable to the Trial that generated them
and to the containing household.

## 6.4 Terminal outcomes

When a line converts or is marked lost, cancel only pending follow-up
work that is no longer appropriate for that line.

Do not destroy completed task history.

For shared household tasks, do not blindly cancel a task if another
active LeadLine still makes that task relevant.

Implement and test this carefully.

------------------------------------------------------------------------

# 7. Workstream B --- Conversion / Enrollment

## 7.1 Definition

A Conversion is the acquisition event indicating that **one LeadLine
became a paying member**.

It is not payment receipt and it does not create a Member record.

One household may therefore generate:

``` text
0 conversions
1 conversion
2 conversions
3+ conversions
```

## 7.2 Conversion data

At minimum, record:

``` text
Conversion
├── LeadLine
├── LeadHeader relationship available through LeadLine
├── Joined date
├── Program
├── Membership Offering
├── recurring/monthly amount snapshot
├── upfront/enrollment amount snapshot
├── applicable discount information
├── converted by staff user
├── notes
└── timestamps / audit information
```

## 7.3 One active conversion per LeadLine

Enforce at most **one active conversion per LeadLine**.

A correction/reversal must not create two simultaneously active
conversions for the same prospective member.

## 7.4 Corrections and reversal

Conversions must be correctable.

Do not hard-delete conversion history as the normal correction
mechanism.

Preserve enough history/audit data to know that a conversion was
corrected/reversed and by whom.

Use the existing audit/history architecture where appropriate.

Because reversal materially affects reporting, implement
reversal/cancellation as an **ADMIN-controlled** operation unless
repository security conventions expose a compelling reason to stop and
ask.

Normal operational conversion entry may be available to appropriate
STAFF/ADMIN users.

## 7.5 Product boundary

Do not create:

-   Member table/domain,
-   payment schedules,
-   invoices,
-   actual payment records,
-   membership status after acquisition,
-   cancellation/freeze logic.

The Conversion record should form a clean seam for a future
member-management phase.

------------------------------------------------------------------------

# 8. Membership Offerings --- ADMIN Managed

Membership Offerings must be ADMIN-configurable rather than hardcoded
into page components.

At minimum:

``` text
MembershipOffering
├── name
├── Program
├── standard recurring/monthly amount
├── standard enrollment/upfront amount
├── active status
├── display order
└── optional description if useful
```

Use stable IDs.

Inactive offerings must remain available to historical conversions but
should not normally be selectable for new conversions.

------------------------------------------------------------------------

# 9. Pricing, Household Discounts & Forecasting

## 9.1 Purpose

M8 must support **forecasted acquisition value**.

The system should be able to answer:

> If the prospective members in this household join under the currently
> selected offerings/discount rules, approximately how much recurring
> monthly value would the household represent?

This is acquisition forecasting, not accounting.

## 9.2 Structured household pricing

Support structured household/family pricing rules.

Known business example:

``` text
Adult Jiu-Jitsu
First household member: $175/month
Each additional applicable household member: $155/month
```

Do not hardcode those example amounts as universal business logic. Model
the rule/configuration so ADMIN can maintain applicable pricing.

Keep the first implementation deliberately bounded. Do not build a
generalized enterprise pricing engine.

The structured rule must be deterministic, testable, and understandable
in the UI.

## 9.3 Line-level ad hoc discount

Allow a LeadLine to have an optional ad hoc/override discount for
forecasting/conversion purposes.

Include an optional discount/override reason.

Make it clear when the standard offering/household rule has been
overridden.

## 9.4 Forecast versus conversion snapshot

Before conversion, the app may calculate/display **forecasted**
recurring/upfront value based on the current lines, offerings, and
discounts.

At conversion, snapshot the actual acquisition-relevant values used for
that Conversion.

Changing an Offering or discount rule later must **not rewrite
historical Conversion values**.

## 9.5 Money representation

Do not use floating-point money arithmetic carelessly.

Use a deliberate future-PostgreSQL-friendly representation such as
integer cents or an appropriate exact decimal strategy.

Document the choice.

## 9.6 Explicit non-goals

Do not track:

-   whether the member actually paid,
-   how much cash was collected,
-   delinquency,
-   AR/AP,
-   bank reconciliation,
-   accounting revenue.

Use language such as **forecasted MRR**, **new MRR**, **conversion
value**, or **expected recurring value** rather than implying cash
receipts.

------------------------------------------------------------------------

# 10. Lost / Closed Outcomes

Lost outcomes belong to LeadLines.

## 10.1 ADMIN-configurable reasons

Create an ADMIN-managed Lost Reason list.

Seed a small sensible set, such as concepts equivalent to:

``` text
Not interested
Price
Schedule
Location
No response
Joined another gym
Not ready
Other
```

Do not make the seed taxonomy unnecessarily large.

## 10.2 Required/optional data

When a LeadLine is marked Lost:

-   Lost Reason is required.
-   Note is optional.
-   Record outcome date/time.
-   Record actor/staff user.
-   Preserve history.

## 10.3 Reopen

Lost lines can be reopened.

Reopening must preserve the previous lost outcome in history/audit data.

------------------------------------------------------------------------

# 11. Administrative Configuration

M8 should make these business concepts ADMIN-managed:

-   Programs,
-   Lead Sources,
-   Campaigns,
-   Membership Offerings,
-   Lost Reasons.

Do not create a generic metadata/settings engine just to make everything
configurable.

Use explicit domain entities with understandable constraints and
lifecycle behavior.

Preserve system-defined values where configurability would create
unnecessary risk, particularly core Trial/Follow-Up workflow
statuses/outcomes unless the repository already has a safe established
pattern.

Configuration screens must use the M6 design system and remain
ADMIN-only.

Document:

-   what can be edited,
-   what can be deactivated,
-   what historical records do when a configuration value becomes
    inactive,
-   uniqueness rules,
-   display ordering where applicable.

------------------------------------------------------------------------

# 12. Workstream C --- Reporting

## 12.1 Reporting unit decisions

Use **LeadHeaders for household-level metrics**.

Use **unique LeadLines for person/member acquisition-funnel metrics**.

Do not count raw Trial/event rows as people.

A prospective member should be counted at most once per qualifying
funnel stage for the selected reporting scope.

## 12.2 Funnel

Implement and document defensible formulas for at least:

``` text
Prospective Members
      ↓
Trial Scheduled
      ↓
Trial Attended
      ↓
Converted / Joined
```

Include:

-   LeadLine → Trial rate
-   Trial scheduled → attended rate
-   Trial attended → joined rate
-   LeadLine → joined rate

Also provide household-level counts where useful, clearly labeled as
households rather than prospective members.

## 12.3 Multiple Trials

A LeadLine may have multiple Trials.

Reporting must not inflate person-level funnel counts because of:

-   reschedules,
-   multiple scheduled Trials,
-   no-show followed by another Trial,
-   cancelled Trial followed by another Trial.

Define exact qualification rules in code/tests/documentation.

Raw Trial activity may be reported separately when useful, but funnel
denominators must use unique LeadLines.

## 12.4 Operational Dashboard vs Reports

Keep the Dashboard operational.

Appropriate Dashboard concepts include compact
current-period/current-work summaries such as:

-   Leads/households this month,
-   prospective members this month,
-   upcoming Trials,
-   attended Trials this month,
-   new members/conversions this month,
-   new/forecasted MRR this month,
-   overdue Follow-Ups.

Do not turn Dashboard into a dense analytics suite.

Create/use a dedicated Reports area for deeper analysis.

## 12.5 Reports area

At minimum support useful V1 reporting for:

### Lead / household volume

-   households by date range,
-   prospective members by date range,
-   by Lead Source,
-   by Program,
-   by Campaign.

### Trial funnel

-   unique LeadLines with Trial scheduled,
-   unique LeadLines attended,
-   no-show activity,
-   cancellation activity,
-   reschedule activity where useful.

### Conversion

-   conversions/member joins,
-   conversion rates,
-   new MRR,
-   upfront/enrollment value,
-   average new MRR per conversion,
-   by Program,
-   by Lead Source,
-   by Campaign,
-   by Membership Offering.

### Lost

-   lost prospective members,
-   Lost Reasons,
-   lost rate where meaningful,
-   reopened lines where useful.

### Follow-Up

Use only metrics supported by reliable data, such as: - overdue tasks, -
completed tasks, - completion rate, - by staff member, - structured
outcomes, - time to first contact if defensible.

### Time-to-conversion

Where timestamps support it: - inquiry/LeadHeader created → first
Trial, - inquiry/LeadHeader created → Conversion, - Trial attended →
Conversion.

Clearly document whether household or line timestamps are used.

## 12.6 Reporting permissions

Lock permissions to:

``` text
ADMIN
→ all Reports
→ financial/forecasted acquisition value
→ Meta spend/performance
→ configuration/integration

STAFF
→ operational acquisition Reports
→ no Meta integration configuration

VIEWER
→ Dashboard only
```

Enforce server-side API authorization, not just navigation hiding.

## 12.7 CSV export

CSV export is **in scope for M8**.

Provide CSV export for high-value tabular report results where
practical, including at least core Lead/Line, Conversion, Campaign, and
Meta campaign-performance reporting.

Exports must respect the same filters and RBAC as the report being
exported.

Do not make Excel or PDF generation part of M8.

------------------------------------------------------------------------

# 13. Campaign Domain

## 13.1 Definition

A Campaign represents a marketing effort, not a single social-media
post.

Examples:

``` text
Kids Wrestling Boot Camp — Summer 2026
Back to School Trial Campaign
In-House Tournament Promotion
General Trial Promotion
```

A Campaign may be used by one post or many posts.

Use the industry term **Campaign** in the product/domain.

## 13.2 Organic and paid

The same internal Campaign model must support:

-   organic campaigns,
-   paid campaigns.

Organic campaigns may have zero cash spend.

Paid campaigns may later receive Meta-reported spend.

Do not require a campaign to be paid.

## 13.3 Optional internal budget

Allow an optional planned/entered Campaign budget if useful to the
existing design.

Do not treat that value as accounting actuals.

When Meta provides actual ad spend, clearly distinguish:

-   planned/internal budget,
-   Meta-reported spend.

Do not implement invoice/payment reconciliation.

------------------------------------------------------------------------

# 14. Campaign Tracking Links / Attribution

## 14.1 Primary workflow

Architecturally support **multiple Campaign Tracking Links per
Campaign**.

However, the normal staff workflow must default to **one reusable
default Campaign tracking link**.

Expected UX:

``` text
Create Campaign
      ↓
Default tracking link created
      ↓
Copy Link
      ↓
Use the same link in Instagram, Facebook, paid ads, etc.
```

Do not force staff to generate separate Instagram/Facebook links just to
publish routine content.

## 14.2 Optional advanced links

Allow optional additional tracking links for more granular attribution
when desired.

Conceptually:

``` text
Campaign
├── Default link
├── Optional labeled/source-specific link
├── Optional QR/flyer link
└── Optional other channel link
```

These are **Campaign Tracking Links**, not hardcoded Facebook/Instagram
columns.

Each optional link may carry a label/source/channel designation.

## 14.3 UTM support

Use standard tracking parameters where appropriate:

``` text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

The application should generate correct URLs rather than requiring staff
to manually understand UTM syntax.

Capture/persist attribution when the visitor reaches the public
acquisition flow.

Do not accidentally lose first-touch Campaign attribution while
navigating through `/trial`.

## 14.4 Campaign-first reporting

For V1, prioritize **Campaign-level attribution** over
Facebook-versus-Instagram attribution.

If one default Campaign link is used on both Instagram and Facebook, it
is acceptable for the CRM to attribute the resulting LeadHeader to the
Campaign without claiming which platform produced it.

Do not manufacture platform precision.

Where Meta later provides reliable platform/placement metrics, those can
be displayed as Meta-reported information without forcing staff into
separate links.

## 14.5 LeadHeader attribution

Campaign/source/tracking attribution belongs primarily on the LeadHeader
because it describes how the household inquiry entered the funnel.

All LeadLines and Conversions under that household must remain traceable
back to the header's acquisition information.

Do not duplicate campaign/source values onto every Conversion merely for
convenience unless a deliberate historical snapshot is required.

------------------------------------------------------------------------

# 15. Source / Campaign / Attribution Integrity

Support manual/offline and digital acquisition.

Examples include:

``` text
Walk-in
Referral
Google
Website
Meta / social
Other
```

Do not make the core LeadHeader schema dependent on Facebook-specific
identifiers.

Make unknown/unattributed acquisition explicit in reporting rather than
silently dropping it.

Distinguish:

``` text
Internal Campaign attribution
Meta-reported marketing metrics
Reliably matched CRM outcomes
```

Never infer exact ad-level attribution from date coincidence alone.

------------------------------------------------------------------------

# 16. Workstream D --- Meta V1 Purpose

M8 includes a **read-only Meta V1 integration**.

Purpose:

1.  connect to real Renzo Meta business/ad assets,
2.  prove current API access,
3.  pull real marketing hierarchy and performance data,
4.  store selected data in SQLite,
5.  compare marketing activity with internal Campaign/acquisition
    outcomes,
6.  learn the real integration data model before M9/PostgreSQL.

This is integration/schema discovery and analytics.

It is **not** Meta marketing automation.

------------------------------------------------------------------------

# 17. Meta API Verification --- Mandatory

Meta APIs change.

Before implementing the live integration:

1.  Verify current official Meta developer documentation.
2.  Verify the current Graph/Marketing API version to use.
3.  Verify actual permissions/scopes required.
4.  Verify which Renzo Business/ad assets the supplied account can
    access.
5.  Verify actual payload field names and metric semantics.
6.  Record the API version and permissions in the M8 handoff.
7.  Do not guess deprecated endpoints or fields.
8.  Do not use unofficial reverse-engineered endpoints.

Scott currently has Meta Business Suite access through Renzo, but
Business Suite UI access must **not** be assumed to equal sufficient API
permissions.

If access is insufficient, stop the affected live-integration work,
document exactly what permission/access is missing, and continue all
work that can be safely completed with mocked/fixture Meta data.

------------------------------------------------------------------------

# 18. Meta V1 Scope

Where current access permits, retrieve and persist:

``` text
Business/account identity as needed
Ad account
Campaign
Ad Set
Ad
```

Retrieve useful performance metrics including, where officially
supported and semantically reliable:

``` text
Spend
Impressions
Reach
Clicks
CTR
CPC
CPM
Meta-reported leads/results
```

Do not collect every field Meta exposes.

Use only what supports acquisition analysis or necessary entity
relationships.

------------------------------------------------------------------------

# 19. Meta Metric History

Store **daily Meta metrics per Meta entity** where the API supports an
appropriate daily breakdown.

At minimum design daily history for the hierarchy where useful:

``` text
Meta Campaign
Meta Ad Set
Meta Ad
```

Conceptually store:

``` text
Entity/external ID
Metric date
Spend
Impressions
Reach
Clicks
CTR
CPC
CPM
Leads/results where reliable
Fetched/synced at
```

Do not store only a single mutable lifetime-total row.

Document any Meta metric that cannot be safely summed across
entities/dates because of its semantics.

Do not double-count reach or other non-additive metrics in aggregate
reporting.

------------------------------------------------------------------------

# 20. Internal Campaign ↔ Meta Campaign Mapping

Use **explicit ADMIN-controlled mapping** between the internal Campaign
domain and Meta Campaigns.

Rules:

-   Organic internal Campaigns may have no Meta mapping.
-   Paid internal Campaigns may map to a Meta Campaign.
-   An unmapped Campaign remains valid.
-   Do not automatically map by matching names.
-   Preserve external Meta IDs as provider identifiers.
-   Design the relationship so it can support more than one relevant
    Meta relationship later if real data demonstrates the need, without
    prematurely building a generalized integration framework.

The UI should clearly show mapped/unmapped state.

Do not claim Meta spend belongs to an internal Campaign unless the
mapping is explicit/reliable.

------------------------------------------------------------------------

# 21. Meta Integration Boundary

Keep Meta code isolated behind a server-side integration/service
boundary.

Conceptually:

``` text
Browser/Admin UI
      ↓
Internal server API
      ↓
Meta integration service
      ↓
Meta API
```

Never expose privileged Meta tokens to the browser.

Do not scatter direct Meta fetches across Vue components.

Core domain and Meta integration domain should remain distinct.

Conceptually:

``` text
CORE
LeadHeader
LeadLine
Trial
FollowUpTask
Conversion
Program
LeadSource
Campaign
MembershipOffering
LostReason
CampaignTrackingLink

        │ explicit mappings
        ▼

META
Meta account/connection
Meta campaign
Meta ad set
Meta ad
Meta daily metric
Meta sync run
```

Exact table names are Cursor's implementation decision after repository
inspection.

------------------------------------------------------------------------

# 22. Meta Manual Sync

M8 should use an ADMIN-triggered manual sync.

Provide an ADMIN-only Meta integration surface showing at least:

-   configured/not configured,
-   selected/accessible business/ad account information,
-   last successful sync,
-   last sync status,
-   useful safe error summary,
-   manual `Sync Meta Data` action,
-   sync history.

Do not build scheduled/background sync in M8.

------------------------------------------------------------------------

# 23. Meta Sync History / Idempotency

Every sync should create structured history equivalent to:

``` text
Sync run ID
Provider
Started at
Completed at
Status
Records fetched
Records inserted
Records updated
Error summary
Triggered by user
```

Repeated syncs must not duplicate logical Meta entities.

Use external Meta IDs and appropriate unique/upsert behavior.

Test:

``` text
Sync #1
Sync #2 with no remote changes
→ no duplicate Campaign/Ad Set/Ad records
```

Metric storage must also be idempotent for the same
entity/date/granularity.

------------------------------------------------------------------------

# 24. Meta Secrets / Error Handling

Never commit or expose:

-   access tokens,
-   app secrets,
-   client secrets,
-   long-lived tokens,
-   business credentials.

Use server-only environment/configuration.

Update `.env.example` with placeholders only.

Do not log authorization headers or tokens.

Handle safely:

-   missing configuration,
-   expired/invalid token,
-   permission errors,
-   rate limiting,
-   network failure,
-   partial API failure,
-   unexpected/malformed payloads.

A Meta failure must not corrupt core CRM data.

------------------------------------------------------------------------

# 25. Meta Reporting

Provide ADMIN-accessible Meta reporting integrated with the Reports
area.

At minimum answer:

-   What Meta Campaigns exist?
-   Which are active/inactive where available?
-   What was spent?
-   What impressions/reach/clicks were reported?
-   What are CTR/CPC/CPM?
-   What leads/results does Meta report where semantically reliable?
-   Which internal Campaigns are explicitly mapped?
-   What internal households/prospective members/conversions/forecasted
    MRR are associated with mapped internal Campaigns?

Clearly distinguish:

``` text
Meta-reported performance
vs.
Internal CRM acquisition outcomes
vs.
Explicitly attributed/mapped outcomes
```

Do not imply that expected MRR is cash revenue.

------------------------------------------------------------------------

# 26. Meta V1 Explicit Non-Goals

Do not implement in M8:

-   campaign creation in Meta,
-   ad-set creation,
-   ad creation,
-   editing Meta campaigns,
-   budget changes,
-   bid management,
-   automated optimization,
-   social posting,
-   comment moderation,
-   Messenger automation,
-   Instagram DM automation,
-   AI content generation,
-   Conversions API,
-   webhook Lead Ads ingestion,
-   scheduled Meta synchronization,
-   arbitrary-customer OAuth onboarding,
-   sophisticated multi-touch attribution.

------------------------------------------------------------------------

# 27. M8 Meta Revision Pass Before M9

Do **not** automatically close M8 immediately after the first successful
Meta V1 sync.

After live testing against real Renzo Meta data:

1.  inspect actual relationships and payloads,
2.  compare stored data with Meta Business Suite for a small sample,
3.  identify schema assumptions that proved wrong or incomplete,
4.  make only targeted justified corrections while SQLite is still
    flexible,
5.  rerun tests and manual verification,
6.  document the stabilized V1 model.

This is a **single targeted design/schema revision pass**, not
permission to expand M8 into Meta automation.

Then close M8 and proceed to M9 schema hardening.

------------------------------------------------------------------------

# 28. Reporting Date/Timezone Semantics

Use `America/Denver` for business/reporting calendar boundaries.

Audit carefully:

-   Today,
-   This week,
-   This month,
-   Lead created date,
-   Trial date,
-   Joined date,
-   Lost date,
-   Meta metric date,
-   Campaign date ranges.

Store absolute timestamps consistently where appropriate.

Do not accidentally use UTC midnight as the business-day boundary.

------------------------------------------------------------------------

# 29. Query / Reporting Architecture

Perform aggregation server-side/database-side.

Do not load the whole database into the browser and calculate analytics
client-side.

Keep reporting queries readable and testable.

Document SQLite-specific date/aggregation/upsert behavior that needs
attention during M9/M10.

Do not prematurely optimize for PostgreSQL, but avoid gratuitous SQLite
lock-in.

------------------------------------------------------------------------

# 30. Data Quality

Reporting must expose incomplete data honestly.

Use explicit concepts such as:

``` text
Unknown
Unattributed
Not set
Unmapped
```

Do not silently exclude incomplete source/campaign/program data.

Data-quality gaps should be visible.

------------------------------------------------------------------------

# 31. Recommended Implementation Sequence

Implement M8 in controlled phases on the M8 branch.

## Phase 0 --- Audit and refactor plan

Before editing:

-   inspect Git state,
-   inspect current Lead schema and every foreign-key/reference,
-   inspect Trial and FollowUpTask relationships,
-   inspect public `/trial`,
-   inspect Lead history/status automation,
-   inspect reporting/Dashboard,
-   inspect M6/M7 state,
-   identify migration risks,
-   write a concise implementation plan.

Do not proceed blindly if the household refactor would destroy accepted
history or requires a major unapproved architectural substitution.

## Phase 1 --- Household Lead model

Implement/refactor:

-   LeadHeader,
-   LeadLine,
-   primary-contact semantics,
-   line fields,
-   Trial → LeadLine relationship,
-   FollowUpTask → LeadHeader with optional line associations,
-   header closure derivation,
-   line reopen behavior,
-   public/internal Lead creation changes,
-   Lead detail UI.

## Phase 2 --- Configuration and pricing

Implement:

-   Programs ADMIN management,
-   Lead Sources ADMIN management,
-   Membership Offerings,
-   Lost Reasons,
-   structured household pricing/discount rules,
-   line-level override discounts,
-   forecast calculations.

## Phase 3 --- Conversion and Lost outcomes

Implement:

-   per-line Conversion,
-   per-line Lost,
-   conversion snapshots,
-   reversal/correction history,
-   follow-up consequences,
-   reopening,
-   UI/actions.

## Phase 4 --- Campaigns and attribution

Implement/refine:

-   Campaign ADMIN management,
-   organic/paid support,
-   optional budget,
-   Campaign Tracking Links,
-   default reusable link,
-   optional granular links,
-   UTM generation/capture,
-   public `/trial` attribution persistence,
-   Campaign attribution on LeadHeader.

## Phase 5 --- Reporting

Implement:

-   server-side reporting/query layer,
-   Reports area,
-   household metrics,
-   unique-line funnel metrics,
-   Conversion/MRR reports,
-   Lost reporting,
-   Campaign/source/program/offering reporting,
-   Dashboard summary refinements,
-   CSV export,
-   RBAC.

## Phase 6 --- Meta discovery

Using current official documentation and actual access:

-   verify API version,
-   verify scopes/permissions,
-   verify accessible assets,
-   inspect actual payloads,
-   record findings.

## Phase 7 --- Meta V1

Implement:

-   server-side Meta service,
-   connection/status UI,
-   manual sync,
-   Meta hierarchy persistence,
-   daily metric persistence,
-   sync history,
-   idempotent upserts,
-   internal Campaign mapping,
-   Meta Reports.

## Phase 8 --- Regression / security / build

Run full automated and manual-focused regression.

## Phase 9 --- Real-data Meta revision pass

Perform the one targeted post-integration schema/design review described
above.

------------------------------------------------------------------------

# 32. Migration / Existing QA Data

Existing SQLite data is development/QA data and disposable unless
repository reality indicates otherwise.

Do not spend M8 building a production-grade migration for old QA
records.

However:

-   schema migrations must work correctly,
-   seeds/fixtures must represent the new household model,
-   tests must cover multi-line households,
-   do not casually destroy data during normal application use,
-   document any destructive development migration/reset requirement.

------------------------------------------------------------------------

# 33. Required Automated Tests --- Household Model

Add deterministic tests for at least:

1.  LeadHeader with one LeadLine.
2.  LeadHeader with multiple LeadLines.
3.  Primary contact also represented as a line when joining.
4.  Primary contact not represented as a fake line when only a contact.
5.  LeadLine with zero Trials.
6.  LeadLine with multiple Trials.
7.  Trials belonging to the correct line.
8.  Different lines under one header having independent Trial/outcome
    histories.
9.  Father converts while child is Lost.
10. One line Lost does not close active sibling lines.
11. All lines terminal closes/derives header closure.
12. Reopening a Lost line reopens header state coherently.
13. Attribution remains on LeadHeader and is available to
    line/conversion reporting.

------------------------------------------------------------------------

# 34. Required Automated Tests --- Follow-Up

Test:

-   existing M5 initial task creation,
-   task idempotency,
-   task due-date calculation,
-   rescheduling,
-   completed history preservation,
-   automatic task traceability through LeadLine → LeadHeader,
-   shared header-level task behavior,
-   optional line association,
-   line conversion/loss cancelling only obsolete pending work,
-   shared task not incorrectly cancelled while still relevant to
    another active line,
-   Overdue/Due Today/Upcoming semantics.

------------------------------------------------------------------------

# 35. Required Automated Tests --- Pricing / Conversion

Test:

-   Offering CRUD/configuration RBAC,
-   active/inactive offering behavior,
-   structured household pricing,
-   first/additional applicable member pricing,
-   line-level override discount,
-   override reason,
-   forecasted household recurring value,
-   exact money arithmetic,
-   Conversion creation,
-   one active Conversion per LeadLine,
-   different LeadLines converting independently,
-   offering/value snapshot,
-   historical Conversion unchanged after Offering price change,
-   conversion reversal/correction history,
-   ADMIN-only reversal,
-   STAFF/ADMIN normal conversion permissions,
-   no inappropriate follow-up after terminal outcome,
-   reporting inclusion.

------------------------------------------------------------------------

# 36. Required Automated Tests --- Lost Outcomes

Test:

-   ADMIN Lost Reason management,
-   required reason,
-   optional note,
-   actor/timestamp,
-   line-level Lost,
-   sibling line unaffected,
-   follow-up consequences,
-   reopening,
-   historical lost record preserved,
-   reporting inclusion,
-   RBAC.

------------------------------------------------------------------------

# 37. Required Automated Tests --- Campaign / Attribution

Test:

-   organic Campaign,
-   paid Campaign,
-   zero-spend organic behavior,
-   optional budget,
-   default Campaign Tracking Link generation,
-   same default link reusable across channels,
-   optional additional tracking link,
-   UTM generation,
-   public `/trial` entry with tracking parameters,
-   attribution survives navigation/submission,
-   LeadHeader receives Campaign/source attribution,
-   all LeadLines inherit reportability through header relationship,
-   unattributed LeadHeader remains explicit,
-   no false Facebook-vs-Instagram attribution when default link is
    shared.

------------------------------------------------------------------------

# 38. Required Automated Tests --- Reporting

Use deterministic fixtures.

Verify:

-   household counts use LeadHeaders,
-   funnel counts use unique LeadLines,
-   multiple Trials do not double-count people,
-   reschedules do not double-count people,
-   LeadLine → Trial rate,
-   scheduled → attended rate,
-   attended → joined rate,
-   LeadLine → joined rate,
-   Conversion count,
-   Lost count/reasons,
-   MRR sums,
-   upfront sums,
-   structured/override discount effects,
-   Program grouping,
-   Lead Source grouping,
-   Campaign grouping,
-   Offering grouping,
-   unknown/unattributed grouping,
-   date filters,
-   `America/Denver` boundaries,
-   RBAC,
-   CSV export matches filtered report results.

Document exact formulas.

------------------------------------------------------------------------

# 39. Required Automated Tests --- Meta

Normal automated tests must **not** require live Meta credentials.

Use fixtures/mocks based on verified current API payloads.

Test:

-   missing configuration,
-   successful sync,
-   repeated/idempotent sync,
-   changed remote entity,
-   Campaign/Ad Set/Ad hierarchy,
-   daily metric storage,
-   same entity/date metric upsert,
-   API permission error,
-   invalid/expired token,
-   rate limit where practical,
-   network/API failure,
-   malformed/partial payload,
-   sync-run history,
-   no secret leakage,
-   explicit internal Campaign mapping,
-   unmapped internal Campaign,
-   no name-based automatic mapping,
-   Meta report calculations.

------------------------------------------------------------------------

# 40. Existing Regression Requirements

Rerun all existing tests, especially M4/M5/M7 coverage.

Explicitly verify:

-   class/day filtering,
-   Trial scheduling,
-   Trial rescheduling,
-   Trial cancellation/status history,
-   public `/trial`,
-   completed call + Trial reschedule lifecycle,
-   Follow-Up queue semantics,
-   task completion/outcomes,
-   Dashboard follow-up counts,
-   ADMIN/STAFF/VIEWER access,
-   forced password change,
-   session revocation,
-   deactivation/reactivation,
-   User Administration,
-   Security Activity.

Do not weaken accepted behavior to simplify the household refactor.

------------------------------------------------------------------------

# 41. Human Acceptance Checklist --- Required in Handoff

Provide a detailed browser QA checklist covering at least:

## Household

-   Create a single-person inquiry.
-   Create parent-only-contact + child prospective member.
-   Create parent + child where both are prospective members.
-   Add/remove/edit lines as allowed.
-   Verify shared contact information.
-   Verify independent line outcomes.

## Trial / Follow-Up

-   Schedule Trial for one line.
-   Schedule separate Trial for another line.
-   Reschedule.
-   Complete follow-up.
-   Verify household task visibility and line association.
-   Verify completed history preservation.

## Mixed outcome

-   Convert parent.
-   Mark child Lost.
-   Verify parent remains converted.
-   Verify child is lost.
-   Verify household closes when all lines terminal.
-   Reopen child.
-   Verify household becomes active again.

## Pricing / forecast

-   Select Offerings.
-   Verify first/additional household pricing.
-   Apply line override.
-   Verify forecasted MRR/upfront value.
-   Convert.
-   Change Offering price afterward.
-   Verify historical Conversion snapshot is unchanged.

## Campaign

-   Create organic Campaign.
-   Copy default tracking link.
-   Use it through `/trial`.
-   Verify Campaign attribution.
-   Create optional second tracking link.
-   Verify both roll to same Campaign.
-   Verify no forced Facebook/Instagram workflow.

## Reports

-   Verify household versus person counts.
-   Verify funnel against known records.
-   Verify Campaign/source/program filters.
-   Verify MRR/upfront values.
-   Verify Lost Reasons.
-   Verify CSV exports.

## Meta

-   Configure credentials outside Git.
-   Verify accessible account/assets.
-   Trigger sync.
-   Verify Campaigns/Ad Sets/Ads.
-   Verify daily metrics.
-   Trigger second sync and verify no duplicates.
-   Explicitly map an internal Campaign.
-   Compare a small sample to Meta Business Suite.
-   Test invalid credentials.
-   Verify secrets do not appear in browser/log output.

## Roles

-   ADMIN full Reports/config/Meta.
-   STAFF operational Reports only.
-   VIEWER Dashboard only.
-   Direct API/route denial behaves correctly.

------------------------------------------------------------------------

# 42. Full QA Gates

Before reporting completion, run the repository's full quality gates,
including at minimum:

``` text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also run any migration/schema verification commands established by the
repository.

If a command is not present or differs, document the actual command
used.

Do not report M8 ready for human acceptance with known failing
tests/build unless the failure is clearly external and explicitly
documented.

------------------------------------------------------------------------

# 43. Git Safety

Before editing and before completion:

-   confirm branch,
-   confirm working tree,
-   do not reset/overwrite unrelated work,
-   do not commit local Obsidian state such as `vault/.obsidian/*`,
-   do not commit secrets,
-   keep M8 changes reviewable,
-   commit/push only intended project changes.

If the requested branch does not exist or repository state is unsafe,
stop and report.

------------------------------------------------------------------------

# 44. Schema Documentation / PostgreSQL Readiness

At completion, document the resulting SQLite schema.

For every M8 table/change include:

-   purpose,
-   primary key,
-   foreign keys,
-   important columns,
-   indexes,
-   unique constraints,
-   lifecycle,
-   relationship to LeadHeader/LeadLine/Trial/User,
-   whether it is core or Meta integration data.

Maintain a section:

``` text
SQLite → PostgreSQL considerations
```

Capture at least:

-   booleans,
-   timestamp strategy,
-   money representation,
-   date functions,
-   partial unique indexes,
-   CHECK constraints,
-   IDs/autoincrement,
-   JSON if used,
-   raw SQL,
-   upserts,
-   case sensitivity,
-   transaction behavior,
-   Meta metric keys/granularity.

Do not migrate in M8.

------------------------------------------------------------------------

# 45. Stop Conditions

Stop and report before making a major architectural substitution if:

-   the repository's current Lead/Trial model makes the
    LeadHeader/LeadLine refactor unsafe in a way not anticipated here,
-   accepted M4/M5 behavior cannot be preserved,
-   a required household pricing rule cannot be represented without
    building a generalized billing/pricing engine,
-   M6/M7 is materially incomplete,
-   Meta API behavior cannot be verified,
-   Meta access lacks required permissions,
-   a requested Meta endpoint/permission is deprecated/unavailable,
-   reporting cannot be made reliable without a new business decision,
-   a schema change would destroy accepted history,
-   implementing the future seam requires building Member management.

Do not fake success.

For ordinary low-level implementation choices, make the safest
repository-consistent decision and document it rather than stopping
unnecessarily.

------------------------------------------------------------------------

# 46. Required Completion Handoff

Create:

``` text
M8_V2_Implementation_Handoff.md
```

It must include:

1.  repository/branch/commit state,
2.  pre-implementation audit findings,
3.  household refactor plan actually used,
4.  LeadHeader schema,
5.  LeadLine schema,
6.  Trial relationship changes,
7.  FollowUpTask relationship changes,
8.  lifecycle/closure/reopen behavior,
9.  Conversion model,
10. conversion correction/reversal behavior,
11. Lost model,
12. Programs configuration,
13. Lead Sources configuration,
14. Membership Offerings,
15. household discount model,
16. line-level override model,
17. forecast calculations,
18. Campaign model,
19. Campaign Tracking Link model,
20. UTM/attribution behavior,
21. Reports implementation,
22. exact funnel formulas,
23. Dashboard changes,
24. CSV export,
25. reporting permissions,
26. Meta API version,
27. Meta permissions/scopes,
28. Meta assets accessible,
29. Meta entity schema,
30. daily metric strategy,
31. Meta sync behavior,
32. internal Campaign mapping,
33. Meta reporting,
34. secrets/security review,
35. schema changes/migrations,
36. PostgreSQL-readiness notes,
37. tests added/changed,
38. exact QA commands/results,
39. human acceptance checklist,
40. known defects,
41. deferred items,
42. real-data Meta revision findings if completed,
43. top remaining risks,
44. recommended M9 work,
45. files changed,
46. final commit hash/push status.

Provide evidence, not merely a statement that M8 is complete.

------------------------------------------------------------------------

# 47. Acceptance Criteria

M8 V2 is ready for human acceptance only when:

## Household model

-   [ ] LeadHeader represents household/inquiry.
-   [ ] LeadLine represents individual prospective member.
-   [ ] Primary contact can also be a LeadLine when appropriate.
-   [ ] Parent-only contacts do not require fake prospective-member
    lines.
-   [ ] A LeadHeader supports multiple LeadLines.
-   [ ] A LeadLine can exist without a Trial.
-   [ ] A LeadLine can have multiple Trials.
-   [ ] Trials are associated with the correct LeadLine.
-   [ ] Different lines can independently convert or be lost.
-   [ ] Header closure is coherent when all lines are terminal.
-   [ ] Lost lines can reopen with history preserved.

## Follow-Up

-   [ ] Follow-Up remains household/header oriented.
-   [ ] Tasks can optionally reference relevant lines.
-   [ ] Existing M5 automatic Trial task behavior still works.
-   [ ] Completed task history is preserved.
-   [ ] Terminal line outcomes do not incorrectly destroy household
    work.

## Conversion / pricing

-   [ ] Conversion is per LeadLine.
-   [ ] No Member-management domain is introduced.
-   [ ] One active Conversion per LeadLine is enforced.
-   [ ] Conversion correction/reversal preserves history.
-   [ ] Reversal is ADMIN-controlled.
-   [ ] Membership Offerings are ADMIN-managed.
-   [ ] Offering values are snapshotted on Conversion.
-   [ ] Structured household pricing is supported.
-   [ ] Line-level override discount is supported.
-   [ ] Forecasted household acquisition value is available.
-   [ ] Money arithmetic is exact/deliberate.
-   [ ] No actual-payment/AR/AP functionality is introduced.

## Lost

-   [ ] Lost Reasons are ADMIN-managed.
-   [ ] Lost Reason is required.
-   [ ] Note is optional.
-   [ ] Actor/time/history are retained.
-   [ ] Reopening works.

## Reporting

-   [ ] Household metrics count LeadHeaders.
-   [ ] Funnel metrics count unique LeadLines.
-   [ ] Multiple Trials/reschedules do not inflate people counts.
-   [ ] Funnel formulas are documented and tested.
-   [ ] Conversion/MRR/upfront reporting exists.
-   [ ] Campaign/source/program/offering reporting exists.
-   [ ] Lost reporting exists.
-   [ ] Dashboard remains operational.
-   [ ] ADMIN/STAFF/VIEWER report permissions are correct.
-   [ ] CSV export exists for high-value tabular reports.

## Campaign / attribution

-   [ ] Campaigns support organic and paid use.
-   [ ] One default reusable Campaign tracking link is the normal
    workflow.
-   [ ] Multiple tracking links are supported architecturally.
-   [ ] Additional granular links are optional.
-   [ ] UTM/tracking data persists through `/trial`.
-   [ ] Attribution belongs to LeadHeader.
-   [ ] Campaign-level attribution is prioritized.
-   [ ] The app does not fabricate Facebook-vs-Instagram attribution.
-   [ ] Unknown/unattributed traffic remains visible.

## Meta V1

-   [ ] Current official API behavior was verified.
-   [ ] API version/scopes/assets are documented.
-   [ ] Meta Campaigns, Ad Sets, and Ads sync where access permits.
-   [ ] Spend, impressions, reach, clicks, CTR, CPC, CPM and reliable
    leads/results are handled where supported.
-   [ ] Daily metric history is stored.
-   [ ] Sync is manual/ADMIN-triggered.
-   [ ] Repeated sync is idempotent.
-   [ ] Sync history/errors are stored safely.
-   [ ] Internal Campaign ↔ Meta Campaign mapping is
    explicit/ADMIN-controlled.
-   [ ] No automatic name matching is used.
-   [ ] Meta reporting clearly distinguishes Meta metrics from CRM
    outcomes.
-   [ ] Secrets stay server-side and out of Git.
-   [ ] Automated tests do not require live credentials.
-   [ ] One real-data revision pass is performed or explicitly
    blocked/documented by access limitations.

## Regression / quality

-   [ ] M4 behavior remains correct.
-   [ ] M5 behavior remains correct.
-   [ ] M6 visual system is used.
-   [ ] M7 auth/RBAC remains correct.
-   [ ] Full test suite passes.
-   [ ] Lint passes.
-   [ ] Typecheck passes.
-   [ ] Production build passes.
-   [ ] Human QA checklist is supplied.
-   [ ] PostgreSQL-readiness notes are supplied.

------------------------------------------------------------------------

# 48. Final Product Principle

M8 should leave the application with a coherent acquisition-domain
model:

``` text
Campaign / Attribution
        ↓
LeadHeader — household relationship/contact
        ↓
LeadLines — individual prospective members
        ↓
Trials / Follow-Up
        ↓
Conversion or Lost
        ↓
Forecasted acquisition value
        ↓
Reporting
```

and a clean integration boundary:

``` text
Internal Campaign / CRM outcomes
        ↕ explicit mapping
Meta Campaign / Ad Set / Ad / daily metrics
```

The product stops at Conversion.

Design the seam for future member management, but **do not build member
management**.

Use real Meta data to challenge the schema once while SQLite is still
flexible. Then stabilize the V1 model and move to M9 rather than
allowing M8 to expand indefinitely.
