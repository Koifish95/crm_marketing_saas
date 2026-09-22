# Cursor Milestone Prompt --- Control Plane Operator Experience & Lifecycle Management

## Purpose

We are preparing the CRM/Marketing SaaS platform for its first real VPS
deployment and eventual paying customers.

Before we move forward, we need to take a deliberate half-step back and
treat the **Control Plane itself as a real production product for the
SIC operator**, not merely a technical utility that happens to expose
backend capabilities.

The customer-facing Martial Arts and Sales products have recently
received substantial workflow and UI/UX attention. The Control Plane now
needs the same treatment.

This is a **full milestone** focused on the
**administrator/developer/operator experience of the Control Plane**,
including information architecture, fleet visibility, customer and
environment lifecycle management, operational workflows, reporting,
statistics, safety, and overall usability.

The objective is not to redesign the platform architecture. The
objective is to make the existing platform capabilities coherent,
discoverable, safe, efficient, and pleasant to operate before live VPS
use.

------------------------------------------------------------------------

# Governing principles

1.  **Investigate before implementing.**
2.  Git and the canonical vault define current truth.
3.  Do not modify the external `renzo_crm` project.
4.  Do not start Beauty, C3, billing, self-service customer signup,
    Kubernetes, multi-region infrastructure, or unrelated product work.
5.  Do not replace the accepted Product-Owned Domains / Shared
    Foundation architecture.
6.  Do not create speculative infrastructure merely because it might be
    useful someday.
7.  This milestone may extend the Control Plane where necessary to make
    existing lifecycle concepts usable, but it should not become a
    generic cloud-management platform.
8.  Prefer safe, explicit workflows over clever automation.
9.  Destructive operations must be strongly gated.
10. The Control Plane is an **SIC internal operations product**.
    Optimize it for the person actually operating customers and
    environments.
11. The external Renzo CRM is not a managed SaaS customer and must never
    be attached, altered, deleted, or provisioned by this work.
12. Existing persistent-volume safety rules remain absolute: never
    casually use `docker compose down -v`, prune customer volumes, or
    destroy customer data.

------------------------------------------------------------------------

# Milestone outcome

At the end of this milestone, an SIC operator should be able to open the
Control Plane and quickly answer:

-   What customers do I have?
-   Which products does each customer have?
-   Which environments exist?
-   Which are PROD, DEV, or other non-PROD environments?
-   Which environments are running, stopped, unhealthy, provisioning,
    failed, decommissioned, or archived?
-   Where is each environment hosted?
-   What release/image/schema is each environment running?
-   When was it last backed up?
-   Does it have an off-host backup?
-   What public hostname does PROD use?
-   Is TLS/edge configuration healthy or pending?
-   What needs my attention?
-   What changed recently?
-   How much infrastructure am I currently operating?
-   Can I safely start, stop, relaunch, upgrade, back up, restore,
    deactivate, decommission, archive, or retire something without
    hunting through runbooks or raw Docker?

The Control Plane should feel like the **operations console for the SIC
SaaS business**, not a database viewer with buttons.

------------------------------------------------------------------------

# Phase 1 --- Investigation and operator-experience audit

Before changing code, thoroughly investigate the current Control Plane.

Review:

-   `control_plane/`
-   current database/schema/migrations
-   customer model
-   product instance model
-   environment model
-   hosting node model
-   lifecycle APIs
-   backup/restore APIs
-   upgrade APIs
-   hostname/edge behavior
-   provisioning/retry behavior
-   health behavior
-   release identity
-   schema identity
-   current dashboard
-   customer pages
-   environment pages
-   hosting-node pages
-   settings
-   current filters/search/sorting
-   existing decommission behavior
-   existing docs/runbooks
-   canonical vault decisions
-   current `docs/` operator documentation

Run the application and perform a real browser-based operator
walkthrough.

Do not evaluate the Control Plane merely from source code.

Populate or use safe disposable data if necessary so the interface can
be evaluated with a **messy fleet**, not only two or three rows.

The audit should specifically examine what happens when the operator
has:

-   many customers
-   multiple products per customer
-   PROD and DEV for each product
-   additional non-PROD environments
-   stopped environments
-   unhealthy environments
-   failed provisioning
-   decommissioned environments
-   environments with different releases
-   environments needing backups
-   environments with and without hostnames
-   inactive customers
-   historical/archived environments

Create a durable audit document in the vault.

Suggested filename:

`Control-Plane-Operator-UX-Audit.md`

For every finding, assign:

-   stable ID
-   severity: CRITICAL / HIGH / MEDIUM / LOW
-   screen/workflow
-   current behavior
-   operator problem
-   desired outcome
-   proposed resolution
-   whether implementation is required in this milestone

Do not implement until the audit is complete enough to establish the
milestone scope.

------------------------------------------------------------------------

# Phase 2 --- Information architecture and navigation

Reconsider the Control Plane navigation and information hierarchy from
the operator's perspective.

The operator should not have to mentally reconstruct the fleet from
unrelated screens.

At minimum, evaluate and improve the following major areas:

-   Dashboard / Operations Overview
-   Customers
-   Product Instances
-   Environments
-   Hosting Nodes
-   Backups / Recovery visibility
-   Releases / Updates visibility
-   Reports / Statistics
-   Settings, if Settings has a meaningful current purpose

Do not create empty navigation simply to make the application look
larger.

If a dedicated page is not justified, integrate the information into the
appropriate workspace.

The navigation should clearly separate:

-   commercial/customer identity
-   product ownership
-   runtime environments
-   infrastructure/hosting
-   lifecycle/recovery
-   operational reporting

------------------------------------------------------------------------

# Phase 3 --- Fleet dashboard / operations overview

The Dashboard should become a useful operator command center.

Design it around **attention and operations**, not decorative metrics.

At minimum evaluate and, where justified, implement:

## Fleet summary

-   total active customers
-   inactive/deactivated customers
-   active product instances
-   total environments
-   PROD count
-   non-PROD count
-   running
-   stopped
-   unhealthy
-   failed provisioning
-   decommissioned
-   archived/retired where supported

## Attention required

Provide a clear queue or section for things that may require operator
action, such as:

-   unhealthy environments
-   failed provisioning
-   environments without a recent backup
-   PROD environments without off-host backup evidence
-   release mismatch between DEV and PROD
-   failed or incomplete upgrades
-   hostname/TLS/edge issues where that status is actually knowable
-   other genuine operational warnings supported by current data

Do not fabricate health or TLS information the system cannot actually
know.

## Recent operational activity

Investigate whether the Control Plane currently has enough data to show
useful recent activity.

Examples:

-   provisioned
-   started
-   stopped
-   relaunched
-   backed up
-   restored
-   upgraded
-   decommissioned
-   archived
-   customer deactivated/reactivated

If an operator activity log does not exist and is necessary for a
coherent production operator experience, propose and implement the
smallest adequate audit/event mechanism.

Do not build a general event-sourcing system.

------------------------------------------------------------------------

# Phase 4 --- Customer management UX

The Customers area must remain usable as the list grows.

Implement or improve as justified:

-   search
-   sorting
-   filtering
-   active/inactive filter
-   product filter
-   environment-health summary
-   environment count
-   product-instance count
-   last operational issue where useful
-   clear customer workspace
-   clear lifecycle state
-   deactivate/reactivate workflow

## Customer lifecycle

Normal customer cancellation should **not** casually delete the Customer
Account record.

Preferred conceptual model:

``` text
ACTIVE
  ↓
INACTIVE / DEACTIVATED
  ↓
optional future permanent deletion only if explicitly required
```

A deactivated customer should remain available for operational/history
purposes but should not clutter the default active-customer view.

Investigate and implement the appropriate schema/API/UI changes.

Record useful lifecycle metadata where justified, such as:

-   deactivated timestamp
-   reason/note if appropriate
-   reactivated timestamp/history if supported by the chosen audit
    mechanism

Do not invent legal retention policy.

Do not implement permanent customer deletion unless there is a clearly
justified requirement. If it is needed for data/privacy compliance
later, document it separately.

------------------------------------------------------------------------

# Phase 5 --- Product Instance management

Because one Customer Account may own multiple products, Product
Instances need to be understandable and operable independently.

The operator should be able to see:

-   product
-   customer
-   lifecycle state
-   PROD
-   DEV
-   additional environments
-   health summary
-   deployed releases
-   public hostname where relevant
-   last backup state
-   current operational warnings

Investigate whether Product Instance activation/deactivation is needed
now.

A customer may cancel one product while keeping another.

For example:

``` text
Smith Holdings
├── Martial Arts CRM — ACTIVE
└── Sales CRM        — INACTIVE
```

If product-instance deactivation is required for a coherent lifecycle,
implement it safely.

Do not delete historical product-instance identity merely because the
product is no longer active.

------------------------------------------------------------------------

# Phase 6 --- Environment fleet UX

This is a major focus of the milestone.

The current environment list becomes messy as environments accumulate.
The operator needs serious fleet-management tools.

At minimum implement/evaluate:

## Search

Search by useful identifiers such as:

-   customer
-   product
-   environment name
-   environment slug
-   hostname
-   hosting node

## Filtering

Useful filters should include, where supported:

-   customer
-   product
-   environment type
-   PROD / non-PROD
-   hosting node
-   runtime status
-   lifecycle status
-   healthy / unhealthy
-   active / decommissioned / archived
-   release/image
-   backup state

Filters should be easy to clear and should not produce confusing hidden
state.

## Sorting

Evaluate useful sorting by:

-   customer
-   product
-   environment
-   type
-   status
-   health
-   hosting node
-   release
-   last backup
-   recently changed

## Table/list design

The default environment view should surface the most operationally
useful information without becoming unreadable.

Potential columns/information:

-   Customer
-   Product
-   Environment
-   Type
-   Lifecycle
-   Runtime
-   Health
-   Hosting node
-   Release
-   Schema
-   Hostname
-   Last backup
-   Actions / attention

Do not show every database field merely because it exists.

------------------------------------------------------------------------

# Phase 7 --- Environment workspace

Each environment should have a coherent operational workspace.

The operator should not need to bounce among unrelated pages to
understand one environment.

Organize the workspace into logical sections/tabs as appropriate.

Potential structure:

## Overview

-   customer
-   product
-   environment
-   PROD/DEV/etc.
-   lifecycle state
-   runtime state
-   health
-   hosting node
-   host port where operationally relevant
-   public hostname
-   release ID
-   expected image
-   running image
-   schema version
-   provisioning state
-   warnings
-   last backup

## Runtime

Provide clear actions and state for:

-   Start
-   Stop
-   Relaunch / recreate process
-   Retry provisioning where applicable

Clarify terminology.

If the product currently uses "Stop" and there is no distinct technical
"Pause", do not create a fake Pause action.

If "Pause" would provide a genuinely different useful lifecycle
behavior, investigate it and explain the distinction before implementing
it.

## Backup & Recovery

-   create backup
-   backup history
-   backup timestamps
-   backup identity
-   off-host copy state if knowable
-   restore
-   PROD → DEV copy-down
-   warnings and restore restrictions

## Release / Upgrade

-   current release
-   expected image
-   running image
-   schema
-   target image
-   backup requirement
-   upgrade
-   validation status
-   rollback instructions/action where safely supported

## Networking / Public Access

Where applicable:

-   public hostname
-   origin
-   edge status that is actually knowable
-   TLS/certificate status only if the system can truthfully determine
    it
-   configuration instructions or links to runbooks

## History

If the milestone adds an operator activity log, show the relevant
environment history here.

------------------------------------------------------------------------

# Phase 8 --- Environment retirement lifecycle

Implement a safe, understandable environment-retirement workflow.

Preserve the useful distinction between:

## Stop

Temporary runtime shutdown.

-   process stops
-   data remains
-   environment remains active
-   may be started again

## Decommission

Remove the runtime/process while preserving persistent data.

Use when:

-   temporarily retiring
-   investigating
-   preparing for later reactivation
-   operator does not yet want to destroy persistent customer data

Existing decommission behavior should be investigated and
retained/improved rather than silently replaced.

## Archive & Delete

This is the intentional final retirement path for an environment.

The preferred workflow is:

``` text
Archive & Delete
       ↓
Stop environment
       ↓
Create final backup
       ↓
Verify backup
       ↓
Copy final backup off-host
       ↓
Verify copy
       ↓
Record archive metadata
       ↓
Remove runtime/container
       ↓
Remove persistent DB/assets volumes
       ↓
Remove obsolete generated runtime/config/secrets as appropriate
       ↓
Environment becomes ARCHIVED
```

This must be **strongly gated**.

Do not allow a casual Delete button next to Start/Stop.

Require explicit confirmation appropriate to the risk.

Consider requiring the operator to type the environment name/slug or
another strong confirmation.

The environment's Control Plane history/record should normally remain
after the live infrastructure/data has been removed.

Useful retained metadata may include:

-   environment identity
-   customer
-   product
-   environment type
-   archived timestamp
-   final release
-   final schema
-   final backup identity
-   off-host backup confirmation
-   hosting node
-   former hostname
-   data-removal confirmation

Do not decide backup retention duration in this milestone unless the
existing repository already defines it. Record that as a
business/retention-policy decision if still open.

## Safety

Archive & Delete must never:

-   delete sibling environments
-   delete another product instance
-   delete another customer
-   delete the Control Plane registry
-   delete the final backup
-   touch external Renzo resources
-   use broad volume prune
-   rely on unsafe name guessing

Use exact registered environment identity and exact owned resources.

------------------------------------------------------------------------

# Phase 9 --- Bulk operations

Investigate which bulk operations are genuinely useful and safe.

Current Start/Stop bulk behavior exists.

Evaluate:

-   bulk start
-   bulk stop
-   bulk refresh/health check
-   filtering then selecting environments
-   whether bulk backup is operationally useful
-   whether any other bulk operation is justified

Do **not** implement bulk destructive deletion.

Do **not** implement bulk restore.

Do **not** implement bulk PROD upgrades unless the current safety model
genuinely supports it.

Safety beats convenience.

------------------------------------------------------------------------

# Phase 10 --- Backups and recovery experience

Backups are too important to exist only as a button buried in an
environment.

Improve operator visibility.

The operator should be able to determine:

-   which environments have backups
-   last backup time
-   backup age
-   whether PROD has an appropriate backup before upgrade
-   whether an off-host copy has been made, if that is recorded
-   available restore candidates
-   backup source environment
-   allowed restore targets

Investigate whether a fleet-level backup/reporting view is warranted.

Do not redesign the backup format without a real requirement.

Existing safety rules remain:

-   same-environment rollback allowed
-   same-customer/same-product PROD → DEV allowed
-   DEV → PROD refused
-   cross-product refused
-   cross-customer refused

------------------------------------------------------------------------

# Phase 11 --- Release and update management UX

The operator experience for releases should make it obvious what is
actually running.

Expose, where appropriate:

-   expected image
-   running image
-   release ID
-   schema version
-   DEV/PROD version differences
-   backup readiness
-   upgrade eligibility
-   last upgrade attempt/result if tracked

The UI should make the safe path obvious:

``` text
Build/Test
   ↓
Backup DEV
   ↓
Upgrade DEV
   ↓
Validate DEV
   ↓
Backup PROD
   ↓
Upgrade PROD
   ↓
Validate PROD
```

Do not create automatic mass deployment merely to make the interface
look sophisticated.

A manual, explicit, observable process is acceptable for SIC's current
scale.

------------------------------------------------------------------------

# Phase 12 --- Reports and operational statistics

Add a useful Reports / Statistics capability only to the extent current
data can support truthful metrics.

This is **platform operations reporting**, not customer CRM analytics.

Potential useful metrics include:

## Customer / product footprint

-   active customers
-   inactive customers
-   active product instances
-   customers by product
-   environments by product
-   environments by type

## Runtime

-   running
-   stopped
-   unhealthy
-   failed
-   decommissioned
-   archived

## Releases

-   environments by release
-   environments by image
-   environments by schema version
-   DEV/PROD release mismatches

## Backup posture

-   last backup by environment
-   environments with no backup
-   PROD environments with stale backup
-   off-host backup state where recorded

## Hosting node utilization

Use only metrics the current system can accurately obtain.

Potentially:

-   environments per node
-   running containers per node
-   assigned ports
-   disk/storage information if safely and reliably measurable
-   container resource usage if justified

Do not turn this milestone into Prometheus/Grafana infrastructure unless
investigation proves that is necessary.

## Historical statistics

Do not fabricate historical uptime or reliability percentages if the
Control Plane has not been collecting the required data.

If useful statistics require future telemetry, document the gap.

------------------------------------------------------------------------

# Phase 13 --- Hosting Node experience

Review the Hosting Nodes section as part of the operator workflow.

The operator should be able to understand:

-   node name
-   kind (`laptop` / `vps`)
-   driver
-   environment count
-   running count
-   unhealthy count
-   port allocation
-   relevant node warnings
-   whether the node is available/reachable where the current
    architecture can truthfully know that

For the future VPS node, the UI should support the accepted architecture
without pretending the VPS is already live-proven.

Do not add provider-specific APIs.

The platform must remain portable across a normal Linux Docker VPS.

------------------------------------------------------------------------

# Phase 14 --- Safety and destructive-action UX

Review every potentially dangerous action in the Control Plane.

Classify actions roughly as:

## Low risk

-   Refresh
-   View
-   Search/filter

## Operational

-   Start
-   Stop
-   Relaunch
-   Backup

## High risk

-   Restore
-   Upgrade PROD
-   Decommission
-   Customer deactivation
-   Product Instance deactivation

## Destructive

-   Archive & Delete environment
-   any future permanent customer deletion

Use confirmation UX proportional to risk.

The operator should understand:

-   what will happen
-   what data remains
-   what data is removed
-   whether a backup exists
-   whether the action is reversible
-   how to recover

Do not rely on browser `confirm()` if the application already has or
should have a better consistent destructive-action pattern.

------------------------------------------------------------------------

# Phase 15 --- Responsive and visual UX

The Control Plane is primarily a desktop operator tool, but it should
still behave coherently at smaller widths.

Perform browser QA at representative desktop and narrow widths.

Focus on:

-   readable tables
-   overflow
-   filters
-   action menus
-   workspace hierarchy
-   dialogs
-   destructive confirmations
-   status badges
-   long customer/environment names
-   long image/release strings
-   empty states
-   error states
-   loading/provisioning states

The visual design should be consistent with the recently improved
product applications where appropriate, while remaining an
infrastructure/operator console.

Do not make it visually flashy at the expense of information density.

------------------------------------------------------------------------

# Phase 16 --- Developer/operator ergonomics

This milestone also includes the experience of developing and operating
the platform itself.

Investigate friction such as:

-   needing raw SQLite inspection to understand state
-   needing Docker CLI for routine Control Plane-supported operations
-   ambiguous environment names
-   unclear status
-   missing error details
-   inability to find failed resources
-   inability to distinguish expected vs running release
-   stale rows cluttering lists
-   lack of filtering
-   hidden operational warnings

The Control Plane should reduce routine dependence on manual Docker
commands.

However, do not hide diagnostic information that is valuable when
troubleshooting.

Where appropriate, expose safe diagnostic details or link to relevant
operator documentation.

------------------------------------------------------------------------

# Phase 17 --- Documentation updates

Update the derived `docs/` package to reflect the final implementation.

At minimum review:

-   `docs/platform.md`
-   `docs/sic-operator-guide.md`
-   `docs/safety.md`
-   `docs/new-customer-runbook.md`
-   `docs/update-runbook.md`
-   `docs/troubleshooting.md`
-   `docs/glossary.md`
-   `docs/README.md`

Update canonical vault documents where the milestone creates new durable
architecture/lifecycle decisions.

Do not turn `docs/` into a competing project-state system.

Record new accepted lifecycle rules in the appropriate canonical
decision document.

------------------------------------------------------------------------

# Required QA

This milestone is not complete because tests compile.

Perform all applicable automated and runtime validation.

## Automated

At minimum:

-   Control Plane tests
-   typecheck
-   lint
-   production build
-   relevant Docker/compose contract tests
-   migration tests
-   lifecycle tests
-   destructive-action safety tests
-   filtering/search tests where practical

## Browser/operator QA

Perform a real browser walkthrough with enough disposable records to
exercise a messy fleet.

Verify:

-   dashboard
-   customer search/filter
-   active/inactive customer behavior
-   product instance workspace
-   environment search/filter/sort
-   environment workspace
-   Start
-   Stop
-   Relaunch
-   backup
-   restore rules
-   upgrade visibility
-   failed provisioning visibility
-   decommission
-   archive/delete workflow if implemented
-   reports/statistics
-   hosting-node view
-   responsive behavior

## Destructive lifecycle proof

Use **throwaway environments only**.

If Archive & Delete is implemented, prove:

1.  create disposable environment
2.  create representative data/assets
3.  create final backup
4.  verify backup
5.  perform archive/delete
6.  verify exact runtime/container is removed
7.  verify exact persistent environment data is removed
8.  verify siblings are untouched
9.  verify Control Plane historical/archive record remains
10. verify backup remains available
11. prove external Renzo resources are untouched

Never test destructive retirement against a meaningful customer
environment.

------------------------------------------------------------------------

# Milestone deliverables

Create durable milestone documentation including:

## 1. Operator UX audit

`Control-Plane-Operator-UX-Audit.md`

## 2. Implementation return

Suggested:

`Control-Plane-Operator-Experience-Return.md`

Include:

-   starting SHA
-   ending SHA
-   commits
-   files changed
-   schema changes
-   UX changes
-   lifecycle changes
-   tests
-   browser QA
-   destructive lifecycle proof
-   deferred items
-   blockers
-   screenshots/paths if the repository convention supports them

## 3. Updated operator documentation

Update relevant `docs/` files and canonical vault references.

## 4. Explicit remaining external blockers

Clearly distinguish repository-complete work from things that still
require:

-   real VPS
-   real DNS
-   real TLS
-   real off-host destination
-   live customer operation

------------------------------------------------------------------------

# Success criteria

This milestone is **SUCCESS** only when:

1.  The Control Plane has been evaluated as an operator product, not
    merely code-reviewed.
2.  A long/messy customer and environment fleet is manageable.
3.  Customers can be searched, filtered, and clearly distinguished as
    active/inactive.
4.  Environments can be searched, filtered, sorted, and understood
    quickly.
5.  Environment details expose meaningful runtime, health, hosting,
    release, schema, hostname, and backup information.
6.  Start/Stop/Relaunch behavior is clear and safe.
7.  Backup/restore workflows are understandable and remain server-side
    gated.
8.  Release/update state is visible enough to operate DEV-before-PROD
    safely.
9.  Customer deactivation/reactivation is supported or a legitimate
    blocker is documented.
10. Environment Decommission remains distinct from final retirement.
11. Final environment retirement is either safely implemented and proven
    or explicitly BLOCKED with a concrete reason.
12. Destructive actions cannot casually destroy persistent data.
13. Reports/statistics provide useful truthful operational information
    without fabricated telemetry.
14. Hosting-node visibility is sufficient for the upcoming VPS.
15. Browser QA confirms the Control Plane is smooth enough for daily SIC
    operation.
16. Automated validation passes.
17. Documentation accurately reflects the final behavior.
18. No external Renzo resources were modified.
19. No unrelated product milestone was started.
20. The result leaves us materially more comfortable operating real
    customer infrastructure from this Control Plane.

------------------------------------------------------------------------

# Failure / blocker handling

Do not declare SUCCESS by quietly omitting difficult requirements.

If a requirement cannot responsibly be completed before the live VPS
exists:

-   mark it **BLOCKED --- LIVE INFRASTRUCTURE REQUIRED**
-   explain exactly why
-   implement everything that can be truthfully completed locally
-   describe the live acceptance test that will resolve the blocker

If implementation uncovers a genuine architectural or safety defect, fix
it if it is directly required for this milestone.

Do not use discoveries as authorization for unrelated refactors.

------------------------------------------------------------------------

# Final instruction

Treat this as the **final major Control Plane productization milestone
before live VPS activation**.

Spend real time on it.

The standard is not:

> "The backend already has these endpoints."

The standard is:

> "I can operate customers, products, environments, backups, releases,
> hosting, and retirement from this interface confidently, quickly, and
> safely."

When complete, stop and return the milestone report. Do not begin VPS
activation, DNS/TLS activation, Beauty, C3, billing, or another product
milestone without explicit authorization.
