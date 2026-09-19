# Cursor Outcome-Driven Execution Prompt — Martial Arts CRM Customer #1 Sell-Readiness

## Mission

Take the current `crm_marketing_saas` repository from its **actual present state** to a state where Strategic Insights, LLC (SIC) can responsibly provision, operate, support, recover, update, and charge the **first unrelated paying martial-arts academy** for the Martial Arts CRM.

This is not a planning exercise, architecture exercise, code-review-only exercise, or request for recommendations.

**You are authorized and expected to read, investigate, debug, troubleshoot, modify, develop, implement, test, document, and verify the repository until the sell-readiness requirements below are closed.**

For every requirement, there are only two acceptable terminal outcomes:

- **SUCCESS** — the requirement is demonstrably satisfied, with concrete evidence.
- **BLOCKED** — completion is impossible without an external decision, credential, service, infrastructure resource, legal/business action, real-world validation, or other dependency you cannot legitimately supply. A BLOCKED result must contain a detailed explanation, evidence, impact, what was attempted, and the exact action required to unblock it.

Do not finish with requirements marked “mostly done,” “should work,” “planned,” “needs testing,” “TODO,” “not implemented,” “verify later,” or equivalent.

The desired outcome is that **when this execution cycle is finished, all repository work that Cursor can legitimately complete for Customer #1 sell-readiness is complete**, and the remaining blockers are explicit external actions rather than hidden engineering work.

---

# 1. Governing Commercial Objective

The governing objective is:

> Get the Martial Arts CRM into sustained real-world use at Renzo, demonstrate meaningful customer value, and make the product operationally mature enough that SIC could provision an unrelated martial-arts customer and responsibly charge recurring revenue.

The commercial sequence is:

**Customer Success → Responsible Sellability → First Paying Customer → Learn from Market → Improve → Automate → Scale**

Do not optimize for customer #100 while SIC is preparing for customer #1.

Do not turn this work into an attempt to finish every planned feature, achieve multi-product parity, redesign the architecture, or build an enterprise SaaS platform.

---

# 2. Repository Authority and Reconciliation Rules

Repository:

`Koifish95/crm_marketing_saas`

Primary working branch:

`working`

Before changing anything:

1. Inspect Git status, branch, HEAD, recent commits, and repository structure.
2. Read the canonical project-state packet and relevant ADRs/vault documents.
3. Inspect the actual implementation.
4. Inspect existing tests, scripts, Docker configuration, migrations, provisioning logic, backup/recovery logic, security controls, Control Plane behavior, and Martial Arts application.
5. Reconcile documentation against implementation.

Authority order:

1. **Current repository implementation and Git history**
2. **Current canonical project-state/vault documents**
3. **Current governing ADRs**
4. This execution prompt
5. Historical handoffs/roadmaps
6. Old assumptions

If documentation and implementation disagree, **Git/code wins for current-state truth**, but canonical documentation must be corrected if it is stale and the correction falls within this work.

Do not resurrect superseded architecture merely because an older document describes it.

In particular, do not make any of these prerequisites for Martial Arts commercialization unless current evidence independently proves they are required:

- completion of Sales/Software;
- completion of Beauty;
- shared-Core perfection;
- proving a multi-product architecture;
- PostgreSQL migration;
- customer #100 infrastructure.

The current architectural direction permits **product-owned domains and shared foundation** rather than forced inheritance.

---

# 3. Required Execution Method

For every gap-analysis line:

## Step A — Investigate

Determine the actual current state from code, tests, configuration, runtime behavior, documentation, and Git history.

Do not implement something merely because the gap analysis originally called it a gap if the repository already satisfies the outcome.

## Step B — Reproduce or Verify

Where the requirement concerns a defect, security issue, runtime behavior, provisioning, persistence, backup, recovery, update, or workflow:

- reproduce the current behavior;
- establish a baseline;
- retain useful evidence.

## Step C — Classify

Classify the requirement as:

- already satisfied;
- repository work required;
- external validation required;
- external infrastructure/resource required;
- business/legal/owner decision required;
- genuinely unnecessary because a stronger existing mechanism satisfies the underlying outcome.

## Step D — Implement the Smallest Adequate Solution

If repository work can close the requirement, **do it**.

Prefer:

- simple;
- observable;
- recoverable;
- documented;
- testable;
- maintainable;
- appropriate for the first paying customer.

Avoid speculative abstractions and infrastructure.

## Step E — Test

Add or update automated tests where they provide durable value.

Also perform appropriate runtime/integration/manual verification where automated tests alone cannot establish the outcome.

A green unit test is not proof that production deployment, recovery, networking, browser behavior, or operational procedures work.

## Step F — Troubleshoot Until Closed

If an implementation fails:

1. diagnose it;
2. fix it;
3. rerun the relevant verification;
4. repeat until SUCCESS or a legitimate external blocker is proven.

Do not convert an ordinary engineering problem into BLOCKED simply because the first implementation failed.

## Step G — Document

Update canonical documentation/runbooks when the implementation changes operational truth.

Documentation must describe what actually exists, not future intentions.

## Step H — Record Evidence

For SUCCESS, record concrete evidence such as:

- test names/results;
- commands;
- relevant files;
- runtime observations;
- screenshots/manual verification where appropriate;
- generated release identifiers;
- backup/restore evidence;
- HTTP/TLS behavior;
- security-negative tests;
- provisioning results;
- reconciliation counts.

---

# 4. Scope Discipline

Every significant implementation should map to at least one of:

- **CUST** — real customer requirement
- **SALE** — sales enablement
- **RET** — retention/customer success
- **OPS** — operational leverage/supportability
- **SEC** — security/reliability/recovery
- **DATA** — measurement/data ownership

If work is merely **SPEC** — speculative future improvement — do not implement it unless it is necessary to close a sell-readiness requirement.

Do not add features simply because they would be nice.

---

# 5. Gap Analysis Acceptance Contract

The following requirements constitute the Customer #1 sell-readiness execution contract.

The IDs are stable. Preserve them in progress reporting and the final report.

---

## Gate A — Customer Value & Product Validation

### A1 — Renzo real-world operation
**Outcome:** Renzo operates the CRM in a real acquisition workflow.

Repository work:
- ensure the product can support the workflow;
- fix defects preventing it;
- provide any reasonable instrumentation needed to observe it.

If sustained Renzo usage itself cannot be performed by Cursor, mark only that real-world portion BLOCKED and state exactly what human activity/evidence is required.

### A2 — Complete lead lifecycle
Prove:

**marketing/source → lead → trial scheduled → attendance/outcome → follow-up → won/lost → revenue/attribution/reporting**

Fix anything preventing the lifecycle from completing correctly.

### A3 — Household/member workflow
Prove realistic household/member lead operation without material workaround.

### A4 — Trial lifecycle
Prove trial creation, scheduling, rescheduling, cancellation where applicable, attendance/no-show/outcome behavior, and downstream state changes.

### A5 — Follow-up workflow
Prove the current repeated-contact model:

- completed follow-up = completed contact attempt;
- history remains immutable under normal operation;
- additional attempts can be created/scheduled;
- outcomes/notes work;
- pursuit closure is distinct from completing one attempt;
- trial-generated automatic follow-ups remain coherent and idempotent.

### A6 — Conversion and revenue attribution
Prove won/lost conversion and relevant acquisition/revenue attribution produce trustworthy results.

### A7 — Critical workflow defect closure
Resolve all known defects that materially prevent normal academy acquisition use.

### A8 — Demonstrable Renzo value
Repository work should expose enough usable information to evaluate customer value.

Actual owner/staff judgment or weeks of real-world usage may be externally BLOCKED. Do not fabricate customer validation.

---

## Gate B — Core Product Reliability

### B1 — Martial Arts automated tests
All relevant Martial Arts automated tests pass.

### B2 — Lint
Repository lint passes for affected sell-readiness scope.

### B3 — Typecheck
Type checking passes.

### B4 — Production build
Production build succeeds.

### B5 — Desktop browser critical-path verification
Prove the critical customer workflow in a real browser against a production-like deployment.

Automation is preferred if practical, but a repeatable documented smoke-test harness is acceptable.

### B6 — Mobile critical-path verification
Prove critical operational surfaces work at realistic mobile viewport/device conditions.

### B7 — Production container deployment
Build and run the actual production container configuration, not merely the development server.

### B8 — Restart persistence
Prove representative customer records/assets survive ordinary application/container restart.

---

## Gate C — Provisioning & Customer Isolation

### C1 — Repeatable unrelated-customer provisioning
Provision a fresh fictional/unrelated martial-arts academy from documented inputs.

### C2 — Isolated database
Prove its persistent database is isolated from other customer/environment data.

### C3 — Isolated assets
Prove uploaded assets are isolated.

### C4 — Isolated secrets
Prove customer/environment secrets and credentials are isolated.

### C5 — Negative cross-customer access
Demonstrate one customer cannot access another customer's data through supported application paths.

### C6 — Configuration without code fork
Provision the second academy without modifying/forking product source code for customer identity/configuration.

### C7 — Branding
Prove expected academy branding can be configured without product fork.

### C8 — Provisioning runbook
Create/update a reproducible operator provisioning procedure and prove it by following it.

Manual/operator-driven provisioning is acceptable.

---

## Gate D — Production Hosting & Network

These requirements concern the production operating model.

### D1 — Durable production host
The architecture/configuration must support deployment to a durable production host.

If actual VPS credentials/resources are not available, complete all repository-side deployment automation/configuration/documentation possible and mark only the external deployment action BLOCKED.

### D2 — Stable production hostname
Provide the required deployment configuration/procedure for a stable customer hostname.

Actual DNS changes may be externally BLOCKED.

### D3 — HTTPS/TLS
Production customer traffic must use valid HTTPS.

Implement/configure everything repository-side that can be completed. External certificate/DNS execution may be BLOCKED if credentials/resources are unavailable.

### D4 — No unnecessary raw public app ports
Production edge design must prevent direct public exposure of internal application ports unless explicitly justified.

### D5 — Firewall/network policy
Document and implement repository-controlled network exposure expectations.

### D6 — Reverse proxy/routing
Provide and verify the intended production routing configuration.

### D7 — Automatic recovery after host restart
Production services must start appropriately after host reboot.

### D8 — Persistence after restart
Customer data/assets must remain intact after restart/reboot.

Do not introduce Kubernetes, HA, multi-region infrastructure, or fleet orchestration to satisfy this gate.

---

## Gate E — Security

### E1 — Password hashing
Verify the existing password-storage mechanism remains appropriate and tested.

### E2 — Session lifetime
Verify finite session lifetime and expected invalidation behavior.

### E3 — Server-side authorization
Verify permissions are enforced server-side, not merely hidden in UI.

### E4 — Last-admin protection
Verify the final active administrator cannot be accidentally removed/deactivated in a way that locks the customer out.

### E5 — Eliminate universal bootstrap password
Remove unsafe universal provisioned credentials such as `setup`.

Provisioning must create a secure, unique initial-access path.

### E6 — Secure production cookies
Ensure production authentication cookies have appropriate Secure/SameSite/HttpOnly behavior.

### E7 — Secret-file permissions
Ensure generated secret/environment files use appropriately restrictive permissions where supported.

### E8 — CSRF/origin protection
Investigate authenticated state-changing routes and implement an appropriate CSRF/origin defense.

### E9 — Trusted-proxy/IP semantics
Do not blindly trust spoofable `x-forwarded-for` values.

Establish a defined trusted proxy boundary and test it.

### E10 — Security headers
Implement an appropriate production security-header policy.

### E11 — Upload safety
Implement/test reasonable upload size/type/boundary protections without breaking legitimate multi-image asset workflows.

### E12 — Protect the Control Plane
The Control Plane must not become an unauthenticated/weakly protected Internet-accessible administrative back door.

A private operator-only Control Plane is acceptable and likely preferable for Customer #1.

---

## Gate F — Backup, Recovery & Disaster Handling

### F1 — Transactionally trustworthy SQLite backup
Replace any unsafe sequential live-file copy approach with a SQLite-safe backup mechanism.

The resulting backup must be integrity-checkable and restoreable.

### F2 — Asset recovery
Ensure required customer assets are included in the recoverable set.

### F3 — Off-host survival
Design/implement the repository-side mechanism for backups to survive loss of the production host.

If actual remote storage credentials are unavailable, complete and test against an appropriate local/test target and mark only credentialed external activation BLOCKED.

### F4 — Dependable scheduled backup
Backups must occur automatically or through a demonstrably dependable operational mechanism suitable for a paying customer.

### F5 — Backup failure detection
A failed backup must become visible to the operator.

### F6 — Control Plane/registry recovery
Ensure the customer/environment registry and other required control data can be reconstructed after host loss.

### F7 — Full restore
Perform a full environment restore from recovery material.

### F8 — Restore reconciliation
Verify representative database records, assets, configuration, and required secrets/state after restore.

### F9 — Restored runtime verification
Start the restored application, authenticate, and complete representative workflow operations.

### F10 — Recovery expectations
Document realistic Customer #1 recovery expectations, including practical RPO/RTO assumptions where owner approval is required.

Do not claim business-approved RPO/RTO values without owner authorization.

---

## Gate G — Releases, Updates & Rollback

### G1 — Immutable/unique release identity
Every deployable production release must be uniquely identifiable.

Do not rely solely on mutable tags.

### G2 — Customer-to-release mapping
SIC must be able to determine exactly which release a customer environment is running.

### G3 — Reproducible/retrievable release
A known release must be redeployable/retrievable.

### G4 — Schema/migration state
Release and database migration/schema state must be determinable.

### G5 — Update runbook
Create a documented production update procedure.

### G6 — Pre-update protection
Ensure an appropriate verified backup/recovery point exists before potentially destructive production changes.

### G7 — Failed-release recovery
Define and test the safe response to a failed release.

Do not perform unsafe database downgrades merely to satisfy the word “rollback.” Recovery may mean restoring a known-compatible backup/release pair where appropriate.

### G8 — Production-like release rehearsal
Perform an update/recovery rehearsal against a representative customer environment.

Fully automated CI/CD is not required.

---

## Gate H — Monitoring, Diagnostics & Support

### H1 — Outage detection
Provide a mechanism for SIC to detect customer application unavailability without waiting for the customer to complain.

### H2 — Storage/disk warning
Provide reasonable detection of dangerous disk/storage conditions.

### H3 — Backup-failure alert
Backup failures must produce actionable operator notification.

### H4 — Diagnostic sufficiency
Ensure production logs/diagnostics are sufficient to investigate common failures without exposing secrets.

### H5 — Support channel
Document the Customer #1 support contact/process.

This may require owner input for final business details; prepare the repository/runbook side completely.

### H6 — Support expectations
Document expected support handling/escalation.

Do not invent contractual promises that require owner approval.

### H7 — Incident runbook
Document procedures for common incidents such as:

- application unavailable;
- login/access problem;
- disk pressure;
- failed backup;
- failed deployment;
- data recovery;
- accidental operator/customer error where recovery is possible.

Enterprise observability is not required.

---

## Gate I — Customer Onboarding & Data Ownership

### I1 — Existing-data onboarding
Provide a practical pathway to onboard an established academy's relevant lead/prospect data.

A documented operator-run CSV process is acceptable.

Do not build a universal self-service importer unless required.

### I2 — Import validation
Reject or report invalid input safely.

### I3 — Import reconciliation
Provide counts/errors/results sufficient to reconcile source data with imported data.

### I4 — Customer data export
Provide a documented way to return commercially relevant customer data in a usable format.

Operator-driven export is acceptable.

### I5 — Offboarding
Create a documented customer offboarding procedure.

### I6 — Retention/deletion execution
Provide the technical capability/procedure necessary to enforce a defined retention/deletion decision.

If the policy itself requires owner/legal approval, mark the policy decision BLOCKED while completing the technical support that can reasonably be implemented.

---

## Gate J — Training & Customer Operability

### J1 — Non-developer operability
Verify normal academy staff can complete the critical workflow without developer intervention.

Actual staff validation may be externally BLOCKED.

### J2 — Customer onboarding/training
Create the minimum useful Customer #1 onboarding/training material or operator-led training runbook.

A documentation portal is not required.

### J3 — Customer administration
Verify routine user, role, settings, branding, and expected administrative operations.

### J4 — No routine developer dependency
Identify and eliminate normal workflows that require direct database manipulation, source edits, or developer intervention.

If a rare support operation remains operator-only, document it rather than automatically building customer self-service.

---

## Gate K — Product Boundary & Existing-System Workflow

### K1 — Accurate product positioning
Document the product as a martial-arts **acquisition/trial/follow-up/conversion CRM**.

### K2 — Explicit non-goals
Make clear that Customer #1 is not being sold an all-in-one replacement for capabilities the product does not provide, such as broad membership billing/class/rank management unless current implementation proves otherwise.

### K3 — Post-conversion handoff
Document the operational handoff from CRM conversion to the academy's existing membership/business system.

If Renzo/customer evidence shows manual handoff is unacceptable, record that evidence and resulting blocker.

Do not build speculative integrations merely to close this line.

### K4 — Integration validation
Determine whether absence of direct gym-management integration is actually a Customer #1 blocker.

This is an evidence/market-validation item, not authorization to build integrations automatically.

---

## Gate L — Commercial, Privacy & Administrative Readiness

Repository work should support these outcomes, but do not fabricate owner/legal decisions.

### L1 — Monthly price
Requires approved commercial pricing.

If not already authoritative, BLOCKED pending owner decision.

### L2 — Provisioning/setup fee
Requires approved commercial decision.

### L3 — Billing method/cadence
Document the initial billing process.

Manual invoicing is acceptable.

### L4 — Customer agreement
Identify required agreement/terms artifact.

Do not invent legal approval. Drafting support may be provided if appropriate, but final legal/business acceptance can be BLOCKED.

### L5 — Privacy/data handling
Document actual system data handling sufficiently to support an appropriate privacy position.

### L6 — Retention/deletion rules
Expose the actual technical behavior and prepare implementation/procedure for approved policy.

### L7 — Incident-response responsibility
Document operational incident responsibilities and escalation.

### L8 — Cancellation
Document the cancellation/offboarding workflow.

### L9 — Subscription scope
Document what the recurring subscription actually includes.

### L10 — Included support
Document the technical/operational support model; owner approval may be required for contractual commitments.

---

## Gate M — Final Customer #1 Rehearsal

This is the final integration gate.

Do not declare sell-readiness based solely on isolated unit tests.

### M1 — Provision fresh academy
Create a fresh fictional/unrelated academy using the real provisioning procedure.

### M2 — Verify isolation/security
Perform representative positive and negative access/security checks.

### M3 — Complete acquisition lifecycle
Execute:

**public intake → lead → trial → attendance/outcome → follow-up → conversion/loss → reporting**

against the final production-like environment.

### M4 — Perform backup
Create a valid backup of the representative customer.

### M5 — Perform update
Deploy a controlled new release/update using the documented procedure.

### M6 — Simulate failure
Cause an appropriate safe failure and verify monitoring/alerting.

### M7 — Disaster recovery
Destroy or otherwise make the representative environment unavailable, then recreate it from the documented recovery material.

### M8 — Reconcile recovery
Verify records, assets, configuration, authentication, and representative workflow after recovery.

### M9 — Export/offboard
Export the representative customer's data and execute the documented offboarding procedure.

### M10 — Operator independence
Using the completed runbooks, prove SIC could provision, operate, update, recover, export, and offboard Customer #1 without undocumented source/database manipulation.

M10 is the final engineering/operations sell-readiness gate.

---

# 6. Explicit Non-Requirements

Do **not** expand scope to implement the following unless direct evidence proves one is required to close a specific Customer #1 requirement:

- PostgreSQL migration;
- automated customer-facing email/SMS;
- native gym-management integrations;
- Sales/Software completion;
- Beauty completion;
- shared-Core redesign;
- plugin architecture;
- customer self-service provisioning;
- customer-facing Control Plane;
- Stripe;
- automated subscription billing;
- Kubernetes;
- shared multi-tenancy;
- high availability;
- multi-region hosting;
- enterprise SSO/SCIM;
- sophisticated placement/orchestration;
- enterprise telemetry;
- full CI/CD automation;
- infrastructure designed primarily for large future scale.

If one becomes necessary, document the evidence connecting it to a specific gap ID before implementing it.

---

# 7. Definition of a Legitimate BLOCKED Result

`BLOCKED` is not a substitute for unfinished engineering.

A line may be BLOCKED only when Cursor has exhausted work that can legitimately be performed inside the repository/environment and completion requires something external.

Examples:

- VPS account/credentials;
- DNS registrar access;
- external storage credentials;
- real Renzo staff usage over time;
- customer/prospect feedback;
- owner pricing decision;
- contractual/legal approval;
- production secrets unavailable to the development environment.

Every BLOCKED line must state:

1. **Gap ID**
2. **Exact blocker**
3. **Why Cursor cannot complete it**
4. **What was completed before reaching the blocker**
5. **Evidence**
6. **Commercial/operational impact**
7. **Exact action required from Scott/SIC/third party**
8. **What Cursor should do immediately after it is unblocked**

Do not mark something BLOCKED because:

- tests failed;
- implementation was difficult;
- documentation was unclear;
- a library behaved unexpectedly;
- code requires refactoring;
- an initial approach failed.

Those are troubleshooting tasks.

---

# 8. Required Testing Discipline

Do not weaken, delete, skip, or bypass legitimate tests merely to obtain green output.

For every meaningful change:

1. run targeted tests during development;
2. run relevant package tests;
3. run lint/typecheck/build;
4. run production-like runtime verification where applicable;
5. run the broader repository regression suite before final closure.

Security fixes require negative tests where practical.

Backup/recovery fixes require actual backup and restore.

Provisioning fixes require actual provisioning.

Release fixes require actual release/update rehearsal.

Monitoring fixes require simulated failure.

Import/export fixes require representative data and reconciliation.

Documentation-only claims are insufficient where behavior can be tested.

---

# 9. Migration and Existing Data

Preserve existing legitimate customer/test data unless the work explicitly requires migration.

Any schema change must include appropriate migration handling.

Do not reset databases merely to make tests or development easier if doing so avoids proving migration behavior.

Where existing dev/provisioned environments provide useful compatibility evidence, use them.

---

# 10. Security Rules

Do not commit:

- production secrets;
- passwords;
- API tokens;
- private keys;
- customer-sensitive data.

Do not print secrets into logs or final reports.

Do not weaken authentication/authorization to make testing easier.

Do not expose the Control Plane publicly as a shortcut.

Do not claim a security control is effective solely because configuration exists; verify behavior where practical.

---

# 11. Git and Change Management

Work incrementally.

Before implementation, record the starting commit.

Use coherent commits grouped around outcomes/gates rather than one enormous undifferentiated commit where practical.

Do not rewrite unrelated history.

Do not modify the external `renzo_crm` repository unless explicitly authorized. It may be inspected for behavioral/reference context only if available and useful.

At the end:

- working tree should be clean except for explicitly documented intentional artifacts;
- all implementation commits should be identified;
- branch status relative to remote should be reported;
- do not silently push unless current project instructions explicitly authorize pushing.

---

# 12. Required Progress Artifact

Create and maintain a canonical execution document in the SaaS vault, for example:

`crm_saas_vault/Martial-Arts-Customer-1-Sell-Readiness.md`

Use the repository's existing naming/location conventions if a better canonical path already exists.

For every gap ID track:

| ID | Class | Status | Evidence | Changes | Blocker/Next Action |
|---|---|---|---|---|---|

Allowed active statuses during execution:

- INVESTIGATING
- IMPLEMENTING
- VERIFYING
- SUCCESS
- BLOCKED

Only **SUCCESS** and **BLOCKED** are allowed in the final state.

This document must be updated as work progresses so the project can survive context loss.

---

# 13. Final Deliverables

Do not stop after producing code.

At completion provide:

## A. Executive Result

One of:

**SELL-READINESS ENGINEERING COMPLETE — EXTERNAL BLOCKERS REMAIN**

or

**CUSTOMER #1 SELL-READINESS COMPLETE**

The second statement is allowed only if every gap is SUCCESS, including those requiring real external validation/decisions.

## B. Gap Closure Matrix

Every A1–M10 line with:

- final status;
- concise result;
- evidence;
- relevant files/commits;
- blocker if applicable.

No missing IDs.

## C. Implementation Summary

Describe:

- defects found;
- root causes;
- features/controls implemented;
- operational procedures added;
- migrations;
- security changes;
- infrastructure/deployment changes;
- backup/recovery changes;
- monitoring changes;
- onboarding/export changes;
- documentation changes.

## D. Verification Report

Include actual results for:

- automated tests;
- lint;
- typecheck;
- builds;
- production container deployment;
- browser/mobile smoke tests;
- provisioning;
- isolation;
- security-negative tests;
- backup;
- restore;
- update;
- rollback/recovery;
- monitoring failure simulation;
- import/export;
- final Customer #1 rehearsal.

## E. External Blocker Register

For every remaining blocker:

- gap ID;
- owner;
- exact required action;
- prerequisites;
- expected verification after completion.

This should function as Scott's remaining to-do list.

## F. Sell-Readiness Runbooks

Ensure the repository contains current procedures for at least:

- provisioning;
- production deployment;
- DNS/TLS activation where applicable;
- backup;
- restore/disaster recovery;
- updates;
- failed-release recovery;
- monitoring/incident handling;
- import/onboarding;
- export/offboarding;
- customer support operations.

## G. Git State

Report:

- starting commit;
- ending commit;
- commits created;
- branch;
- ahead/behind status;
- working-tree status.

---

# 14. Stop Conditions

Do not stop merely because:

- the code compiles;
- tests pass;
- one gate is complete;
- the original audit issues were addressed;
- implementation became large;
- an external blocker exists for one line.

Continue working on all other independent requirements.

Stop only when:

1. every gap ID has been investigated;
2. every repository-solvable requirement has been implemented and verified;
3. every line has reached SUCCESS or legitimate BLOCKED;
4. all relevant regression verification passes;
5. canonical sell-readiness documentation is current;
6. the remaining blocker register contains only genuinely external work.

---

# 15. Final Decision Rule

The goal is **not** to make the repository look more sophisticated.

The goal is:

> When Cursor is finished, there should be no undiscovered or knowingly unfinished repository engineering standing between SIC and responsibly selling the Martial Arts CRM to Customer #1.

If something can be fixed, **fix it**.

If something can be tested, **test it**.

If something can be reproduced, **reproduce it**.

If something can be automated simply, **automate it**.

If something only needs a runbook, **write and prove the runbook**.

If something requires real external action, **complete everything around it and document the blocker precisely**.

Do not substitute recommendations for implementation.

Do not substitute architecture proposals for working behavior.

Do not substitute “should work” for evidence.

Do not substitute future scale for Customer #1 readiness.

**Close the gap.**
