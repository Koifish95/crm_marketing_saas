---
authorized: true
authorized_scope: |
  Implement SI Sales Slice B1 in sales_template: the approved commercial
  model and acquisition foundation, including controlled Sources,
  Campaigns, Campaign+Source Tracking Links, captured/current
  attribution, configurable public intake, basic aggregate click
  analytics, Offers, Opportunity commercial lines with one-time/MRR
  valuation, Company lifecycle, won/lost timestamps, and baseline
  operational/commercial/attribution reporting. Modify shared Core only
  where an already-approved generic contract is clearly required and the
  existing architecture supports it; do not promote Sales-specific
  behavior into Core.
base_sha: 83506fc4f5aefc54ff65bfd3365081e16100526e
decision_refs:
- "wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet.md#Decisions-1-64"
- ADR-CRM-Core-Vertical-Architecture
durable_docs:
- Current-State.md
- project-state.yaml
expected_outputs:
- code
- migrations
- tests
- QA evidence
- work-return
- durable_docs
forbidden_scope: |
  Do not start B2 proposals/PDF/versioning/artifact workflow; C2; D1;
  Control Plane Sales provisioning; SI production migration/cutover;
  Beauty; S7/VPS; DNS/TLS; billing/Stripe/invoicing/QuickBooks; customer
  accounts/portal; browser e-sign; automated proposal email;
  customer-facing form builder; detailed visitor/session analytics;
  multi-touch attribution; ad-platform synchronization; marketing
  automation; service delivery/project/ticketing/customer-success
  expansion; external Renzo production changes; speculative Core
  promotion.
id: WO-2026-09-12-si-sales-b1-commercial-acquisition
milestone: none
status: active
type: work-order
---

# Work Order --- SI Sales B1: Commercial Model + Acquisition Foundation

## 1. Authority and purpose

Scott authorizes implementation of **B1 only** against repository
`Koifish95/crm_marketing_saas`, branch `working`, from base SHA:

`83506fc4f5aefc54ff65bfd3365081e16100526e`

This Work Order converts the owner-approved decisions in:

`crm_saas_vault/wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet.md`

into implementation.

The worksheet is decision truth for B1. This Work Order is
implementation authority.

If repository reality directly conflicts with an approved decision, STOP
on that conflict rather than silently changing product behavior.

Do not reinterpret deferred items as implied scope.

------------------------------------------------------------------------

## 2. Bootstrap and preflight

Before changing code:

1.  Confirm repository root and remote.
2.  Confirm branch is `working`.
3.  Fetch/pull and confirm HEAD equals the Work Order `base_sha`.
4.  If HEAD differs, inspect the intervening commits. Continue only if
    they are compatible documentation/non-conflicting changes; otherwise
    STOP and report the mismatch.
5.  Read:
    -   `crm_saas_vault/project-state.yaml`
    -   `crm_saas_vault/Current-State.md`
    -   `crm_saas_vault/Work-Order-Protocol.md`
    -   `crm_saas_vault/ADR-CRM-Core-Vertical-Architecture.md`
    -   `crm_saas_vault/wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet.md`
    -   `crm_saas_vault/history/C2B_closeout.md`
    -   the Slice A return/closeout referenced by current state
6.  Inspect the current `sales_template/` implementation, schema,
    migrations, services, API routes, pages, tests, auth/public-route
    registration, settings, dashboard, and package scripts.
7.  Inspect Martial Arts public intake/tracking only as behavioral
    evidence. Do not import Martial Arts domain assumptions or create a
    dependency from Sales to Martial Arts.
8.  Record preflight facts in the eventual return.

------------------------------------------------------------------------

## 3. Implementation principles

Preserve the approved architecture:

-   Sales consumes Core.
-   Core must not depend on Sales.
-   Sales must not depend on Martial Arts or Beauty.
-   Vertical-specific schema remains vertical-owned.
-   Do not add Sales-specific columns to Core-owned tables.
-   Promote nothing to Core merely because a similar implementation
    exists in Martial Arts.
-   Prefer normalized, explicit domain relationships over overloaded
    free-text fields.
-   Preserve existing Slice A behavior unless B1 explicitly changes it.
-   Migrations must preserve existing local Sales data where required by
    the approved decisions.
-   No destructive reset as the implementation strategy.

Use the existing Nuxt/TypeScript/Drizzle/SQLite conventions already
present in the repository unless repository truth requires otherwise.

------------------------------------------------------------------------

# 4. B1 functional scope

## B1-A --- Controlled Sources

Implement a Sales-owned controlled Source model.

Initial seeded values:

-   Referral
-   Website / Organic
-   Facebook
-   Instagram
-   Google
-   Email
-   Cold Outreach
-   Networking / Event
-   Existing Customer
-   Partner
-   Other

Requirements:

-   Sources are stable records, not free-text attribution.
-   Appropriate authorized staff may add and deactivate Sources.
-   Deactivation must not destroy historical attribution.
-   `Other` requires/permits meaningful source detail according to the
    approved worksheet.
-   Do not build a large Source administration subsystem.

------------------------------------------------------------------------

## B1-B --- Campaigns

Implement bounded Sales Campaigns.

Lifecycle:

-   Draft
-   Active
-   Completed
-   Archived

Campaigns may span multiple Sources.

Do not add a Campaign-level Primary Source merely to reproduce an
earlier draft; Decision 45 superseded that concept.

Implement the approved minimum Campaign fields from the worksheet,
including name, objective/description, lifecycle/status, dates, optional
budget, and timestamps as repository conventions permit.

Campaign reporting must not claim ROI merely because budget exists.

------------------------------------------------------------------------

## B1-C --- Tracking Links

Implement Sales-owned Tracking Links.

Each Tracking Link represents:

`Campaign + Source + specific placement/creative`

Minimum behavior:

-   required Campaign
-   required controlled Source
-   human-readable label
-   opaque unique public token/slug
-   active/inactive state
-   timestamps
-   many Tracking Links may exist for the same Campaign + Source pair
-   destination is the Sales public intake flow
-   inactive/unknown tokens do not expose Campaign information
-   no arbitrary external destination/open redirect

Public route concept:

`/t/{token}`

Use the exact repository-consistent Nuxt route shape.

------------------------------------------------------------------------

## B1-D --- Attribution model

Implement the approved captured/current attribution split.

### Original captured attribution

Preserve immutable evidence from acquisition:

-   original Source
-   original Campaign
-   original Tracking Link
-   original acquisition timestamp

Do not overwrite these when staff later correct attribution.

### Current working attribution

Authorized staff may correct current:

-   Source
-   Campaign
-   applicable source detail

Reporting uses current working attribution.

Corrections must create chronological history/audit evidence using the
existing Sales history/note conventions.

### Opportunity conversion

Preserve/snapshot the approved attribution into Opportunity conversion
behavior so downstream reporting can connect acquisition to Opportunity
and Won/Lost outcomes.

Do not create a full attribution-version ledger.

Do not implement multi-touch attribution.

------------------------------------------------------------------------

## B1-E --- Direct/untracked intake

Expose a stable untracked public intake route, repository-consistent
with the approved `/inquire` concept.

Untracked submissions default to:

-   Source = `Website / Organic`
-   Campaign = null
-   Tracking Link = null

Unknown Tracking Link tokens must not silently fall back to organic
attribution.

------------------------------------------------------------------------

# 5. Configurable public intake

The public intake form is a sellable/configurable product surface.

Initial SI/default field catalog:

### Required by default

-   First name
-   Last name
-   Email

### Optional by default

-   Phone
-   Company/business name
-   Message / what they need

Behavior:

-   first + last produce the Lead display name
-   public submit does not auto-create a Company
-   submitted company/business name is retained as Lead intake
    information until staff decides how to attach/create a Company
-   message becomes useful Lead context/history, preferably the first
    Sales note

The form must be configuration-driven rather than permanently hardcoded
per customer.

At minimum support administrator/deployment-managed configuration for:

-   brand/copy using existing brand mechanisms
-   field visibility
-   field labels
-   required/optional state
-   field ordering
-   intro/help text
-   submit button copy
-   thank-you copy
-   unavailable/disabled copy

The initial SI configuration must still enforce a valid useful Lead. Do
not permit configuration to produce a server-invalid submission contract
without validation.

### Configuration boundary

This Work Order does **not** authorize:

-   customer-facing drag-and-drop builder
-   customer self-service form designer
-   arbitrary executable/custom code fields
-   a general CMS
-   billing for form changes

The commercial context is that initial form configuration is included in
the current \$750 setup/provisioning concept and later requested changes
may be paid service. Record that only as product context; do not
implement billing.

Prefer a repository-consistent, SaaS-reusable configuration
representation. If DB-backed configuration is required to satisfy
runtime/admin configuration safely, implement the smallest
vertical-owned model necessary. If an existing Sales/Core settings
mechanism already satisfies the approved behavior cleanly, reuse it
rather than inventing a parallel subsystem.

------------------------------------------------------------------------

# 6. Public intake security and submission behavior

The public intake is an unauthenticated boundary.

Implement:

-   public routes within the existing Sales Nuxt app
-   Core public-path registration as appropriate
-   server-side Zod validation
-   request/payload size limits
-   IP-based rate limiting, approximately the existing MA magnitude (\~8
    submissions / 10 minutes) unless repository-consistent
    implementation evidence supports a better equivalent
-   hidden honeypot
-   opaque/non-enumerable Tracking Link tokens
-   generic safe error responses
-   no public enumeration of Sources/Campaigns
-   no disclosure that an email/phone already exists
-   throttled/rejected-attempt logging where practical using existing
    security/server logging conventions
-   idempotency for accidental double-click/retry

Do not add CAPTCHA/Turnstile in B1.

Do not build a public authenticated session or customer account.

------------------------------------------------------------------------

# 7. Duplicate behavior

Distinguish replay from genuine repeat interest.

### Same submission replay/double-click

Idempotently return/replay the existing result. Do not create a second
Lead.

### Genuine new submission with matching email/phone

Create the new Lead.

Detect practical potential duplicates using normalized email and/or
phone.

Surface a staff-visible possible-duplicate warning/link/history
reference.

Do not:

-   auto-merge
-   auto-suppress
-   overwrite the prior Lead
-   disclose the duplicate to the public submitter

A repeat inquiry from a new Campaign is legitimate acquisition evidence.

------------------------------------------------------------------------

# 8. Public intake enable/disable and success states

Authorized admin/staff must be able to enable/disable public intake
without taking down the CRM.

When disabled:

-   staff CRM remains operational
-   existing data remains unchanged
-   new public submissions are rejected
-   Tracking Links must not silently create Leads
-   public UI shows the configured unavailable message/state

On successful submit:

-   show configured in-page thank-you state
-   no customer account
-   no portal
-   no scheduling
-   no automated confirmation email
-   no staff identity
-   no internal Lead ID

------------------------------------------------------------------------

# 9. Basic Tracking Link analytics

Implement basic aggregate Tracking Link visit/click counting plus
successful Lead submission counts.

Required reporting capability:

-   clicks
-   Leads/submissions
-   click → Lead conversion

Do not build detailed visitor/session analytics.

Do not retain raw IP, user-agent, or session history merely for
marketing analytics.

Security controls may use transient/request information as necessary,
but marketing analytics should prefer aggregate counts or the smallest
repository-safe event representation.

If concurrency/correctness makes persisted counters unsafe under the
current SQLite model, use the smallest durable representation that
preserves correct aggregate reporting without turning this into a
visitor analytics system.

------------------------------------------------------------------------

# 10. Offers and Opportunity commercial lines

Implement the approved commercial model.

## Offers

Sales-owned Offer catalog with the fields/lifecycle approved in the
worksheet.

Offers provide defaults/templates for quoting.

Do not turn Offers into billing products or accounting items.

## Opportunity commercial lines

An Opportunity may contain commercial line items.

Support approved pricing semantics including:

-   description/Offer reference as applicable
-   quantity
-   one-time unit price/value
-   recurring monthly unit price/value
-   quoted price override from Offer defaults
-   calculated one-time total
-   calculated MRR

Recurring quantity rule:

`MRR = quantity × monthly unit price`

Do not implement:

-   coupon engine
-   discount-rule engine
-   discount approvals
-   usage billing
-   invoices
-   subscriptions/payments

### Existing amount migration

Safely migrate the existing Opportunity one-time amount (`amount_cents`
or current repository equivalent) into the new commercial representation
according to the approved worksheet.

Preserve existing data.

Do not silently discard or double-count the old value.

Document the exact migration rule and verification in the return.

------------------------------------------------------------------------

# 11. Company lifecycle

Implement:

-   Prospect
-   Customer
-   Former Customer

Reconcile the existing `active` semantics without conflating record
availability with business lifecycle.

Approved Won behavior must promote/maintain the appropriate Company
customer state according to the worksheet.

Do not delete Former Customers or make them unusable merely because the
business relationship ended.

------------------------------------------------------------------------

# 12. Opportunity Won/Lost timestamps

Implement dedicated:

-   `won_at`
-   `lost_at`

Rules:

-   Won populates `won_at`
-   Lost populates `lost_at`
-   explicit Reopen clears the corresponding closing timestamp according
    to the approved lifecycle behavior
-   generic `updatedAt` is not the commercial close date

Preserve chronological/history evidence using current Sales conventions.

------------------------------------------------------------------------

# 13. Baseline B1 reporting

Implement the approved baseline operational/commercial/acquisition
reporting.

At minimum cover:

-   current open pipeline value
-   current open pipeline MRR
-   Leads by current stage/status
-   current Activity due/overdue/upcoming semantics already approved
-   New Leads by selected period
-   New Opportunities by selected period
-   Won count/value/MRR by `won_at`
-   Lost count by `lost_at`
-   simple operational Lead → Opportunity conversion
-   Win rate = Won / (Won + Lost) for selected period
-   Campaign performance
-   Source performance
-   Tracking Link click counts
-   click → Lead conversion
-   Lead → Opportunity
-   Won/Lost
-   one-time value
-   MRR

Date controls:

-   This month
-   Last month
-   Last 30 days
-   This quarter
-   This year
-   Custom range

Metric semantics:

-   current-state metrics remain current-state metrics and are not
    incorrectly filtered by creation date
-   period metrics use their approved metric-specific dates
-   do not label the simple Lead → Opportunity metric as cohort analysis
-   do not claim ROI

Keep reporting operational and comprehensible. Do not create a BI
subsystem.

------------------------------------------------------------------------

# 14. UX expectations

Follow the established Sales/CRM workspace style.

Requirements:

-   keep indexes compact
-   use clear record workspaces/details
-   avoid giant all-fields-at-once forms
-   attribution should be visible where staff need to understand
    acquisition origin
-   captured/original attribution and corrected/current attribution must
    be distinguishable without overwhelming normal workflows
-   duplicate warnings should be actionable but non-blocking
-   Campaign and Tracking Link management should be usable by ordinary
    authorized staff
-   public intake must be mobile-responsive
-   public intake must not expose staff CRM navigation/chrome

Do not redesign unrelated application surfaces.

------------------------------------------------------------------------

# 15. RBAC / authorization

Reuse the existing Core/Sales authorization model.

Define the smallest appropriate Sales permissions for:

-   Source management
-   Campaign management
-   Tracking Link management
-   attribution correction
-   public-intake configuration
-   public-intake enable/disable
-   Offer management
-   commercial line editing
-   reporting access

Do not invent a second RBAC system.

Do not weaken existing staff authorization merely because public routes
exist.

Public APIs must expose only the narrow unauthenticated actions
explicitly required by this Work Order.

------------------------------------------------------------------------

# 16. Migration and compatibility requirements

B1 must be upgrade-safe from the current Slice A database.

Requirements:

-   use repository-standard migrations
-   preserve current Companies, Contacts, Leads, Opportunities,
    Activities, notes/history, users, permissions, and existing one-time
    Opportunity values
-   seed controlled Sources safely/idempotently
-   do not require deleting the current Sales SQLite database
-   do not use a reset/reseed as acceptance evidence
-   verify migration against a representative existing Slice A database
    state where feasible

SQLite remains current for this Work Order unless canonical repository
state already changed before execution. Do not switch to PostgreSQL.

------------------------------------------------------------------------

# 17. Tests and QA

Use repository-standard commands discovered during preflight.

At minimum validate:

1.  install/lockfile consistency if dependencies change
2.  lint
3.  typecheck
4.  automated tests
5.  production build
6.  migrations from current Slice A state
7.  Source seed/idempotency
8.  Campaign CRUD/lifecycle
9.  Tracking Link token resolution and inactive/unknown behavior
10. click counting
11. untracked Website/Organic intake
12. tracked intake attribution
13. immutable captured attribution
14. staff correction of current attribution
15. idempotent double-submit
16. genuine repeat submission duplicate warning
17. rate limiting/honeypot/validation
18. public intake enable/disable
19. configurable field/copy rendering and server validation
20. Offer/commercial-line calculations
21. recurring quantity/MRR math
22. old Opportunity amount migration
23. Won/Lost/Reopen timestamps
24. Company lifecycle behavior
25. reporting metric/date semantics
26. RBAC boundaries
27. authenticated CRM regression
28. public route does not expose staff chrome/auth-only data

Record actual commands, pass/fail results, and test counts in the
return.

------------------------------------------------------------------------

# 18. Development cadence and commits

Work incrementally.

Recommended implementation sequence:

1.  schema/migrations + controlled Sources
2.  Campaigns + Tracking Links
3.  attribution model and conversion propagation
4.  public route/configuration/security foundation
5.  public submission/idempotency/duplicates
6.  click counters
7.  Offers + commercial lines + migration
8.  Company lifecycle + Won/Lost timestamps
9.  reporting
10. integrated UX/RBAC/regression hardening

Cursor may adjust commit boundaries when repository structure makes
another sequence safer, but must not expand scope.

After each logical commit:

-   run relevant focused tests
-   inspect the diff
-   keep the branch buildable where practical
-   do not begin B2

------------------------------------------------------------------------

# 19. Hard stops

STOP and report instead of guessing if any of these occur:

-   a current canonical document contradicts this authorized Work Order
-   HEAD divergence contains conflicting implementation
-   satisfying B1 appears to require C2/D1 or final multi-tenant
    architecture
-   satisfying B1 appears to require a customer-facing form builder
-   a safe migration of existing Opportunity amounts cannot be
    determined from repository evidence
-   implementing configurable intake would require an unapproved
    arbitrary custom-field engine
-   Core would need Sales-specific behavior/columns
-   B1 requires touching external `renzo_crm` or Renzo production
    infrastructure
-   tests reveal a pre-existing failure that prevents trustworthy B1
    validation and cannot be isolated
-   a new product decision materially changes owner-approved behavior

Do not convert a hard stop into a silent assumption.

------------------------------------------------------------------------

# 20. Explicit forbidden scope

Do not implement in this Work Order:

-   B2 Proposal entity/versioning
-   HTML proposal preview
-   PDF generation
-   proposal artifacts/signed-copy workflow
-   public/browser e-signature
-   automated proposal email
-   customer account/portal
-   customer-facing form builder
-   detailed visitor/session analytics
-   multi-touch attribution
-   ad-platform API synchronization
-   marketing automation
-   billing
-   Stripe
-   invoicing
-   QuickBooks/accounting
-   service delivery
-   project management
-   ticketing
-   customer-success expansion
-   C2
-   D1
-   Control Plane Sales provisioning
-   SI production migration/cutover
-   Beauty
-   S7/VPS
-   DNS/TLS
-   final production deployment architecture
-   PostgreSQL migration
-   external Renzo deployment changes
-   speculative Core promotion

------------------------------------------------------------------------

# 21. Successful criteria

## Code-shipped criteria

B1 is **code-shipped** only when:

-   all authorized B1 behavior is implemented
-   required migrations exist and preserve Slice A data
-   automated validation passes
-   production build passes
-   return document is complete
-   durable current-state documents are updated
-   implementation commit(s) are pushed to `working`

## Owner acceptance / Successful

Do **not** mark B1 or any milestone **Successful** merely because code
shipped.

Scott must perform/accept the relevant manual QA.

The return must clearly separate:

-   `implementation_result: shipped`
-   owner acceptance: pending

unless Scott explicitly accepts it in the same Cursor session.

------------------------------------------------------------------------

# 22. Required return

Create:

`crm_saas_vault/wip/WO-2026-09-12-si-sales-b1-commercial-acquisition-return.md`

Required header:

``` yaml
---
type: work-return
status: done
id: WO-2026-09-12-si-sales-b1-commercial-acquisition
milestone: none
base_sha: "83506fc4f5aefc54ff65bfd3365081e16100526e"
result_sha: "<feature/final implementation SHA>"
implementation_result: shipped | partial | not-started | blocked
tests: "<commands and actual counts/results>"
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
---
```

The body must include:

-   executive implementation summary
-   exact features shipped
-   exact schema/migrations
-   public acquisition workflow
-   attribution behavior
-   configurable intake behavior
-   security controls
-   duplicate/idempotency behavior
-   click analytics behavior
-   Offers/commercial calculations
-   migration of existing Opportunity amount
-   Company/Won/Lost behavior
-   reporting behavior
-   RBAC changes
-   tests and actual results
-   manual QA instructions for Scott
-   deviations from Work Order
-   newly discovered decisions/risks
-   files changed
-   Git commit table
-   result SHA
-   what remains explicitly deferred to B2/later

------------------------------------------------------------------------

# 23. Durable documentation and closeout

Before stopping:

1.  Update `crm_saas_vault/Current-State.md` with what actually exists
    after B1.
2.  Update `crm_saas_vault/project-state.yaml` so it points to the
    actual current state and records B1 as code-shipped/pending owner
    acceptance as appropriate.
3.  Update other durable docs only if the Work-Order Protocol requires
    them because a durable architecture/product fact changed.
4.  Do not mark a milestone Successful without Scott acceptance.
5.  Create the return.
6.  Inspect final diff/status.
7.  Commit and push all authorized B1 implementation, return, and
    durable-doc changes to `working`.

Do not archive the Work Order/return until the protocol and
owner-acceptance state make that appropriate. If the repository's
current closeout convention requires leaving them in `wip/` pending
Scott acceptance, do so.

------------------------------------------------------------------------

# 24. Stop condition

After the B1 implementation is pushed and the return/durable docs are
complete:

**STOP.**

Do not start B2.

Do not create the B2 Work Order.

Do not begin proposal/PDF work.

Do not begin C2, D1, Beauty, S7, production migration, or deployment
work.

Report the result to Scott and tell him to have ChatGPT read the full B1
return from Git.
