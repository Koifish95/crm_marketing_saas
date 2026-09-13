---

type: work-order
status: active
id: WO-2026-09-12-si-sales-b2-proposal-system
milestone: SI-Sales-B2
decision_refs:

* SI_Sales_Slice_B_Pre_Development_Decision_Worksheet Decisions 18, 22-31, 40-44, 50-51, 60-61
* SI_Sales_B2_Pre_Development_Decision_Worksheet B2-01 through B2-06
  base_sha: 99bb058540a706d52aca8ac30e1e1035800f00e6
  authorized: yes
  authorized_scope:
* Implement the approved SI Sales B2 proposal/document system inside sales_template only
* One Proposal chain per Opportunity with sequential immutable revisions
* Draft, Issue/finalize, Mark Sent, Accepted, Declined, Superseded proposal workflow
* Optional valid-through with display-only past-valid-through behavior
* Proposal commercial snapshots copied from Opportunity commercial lines at Issue
* One selectable same-Company recipient Contact per revision, defaulting from Opportunity primary Contact
* Snapshot recipient identity at Issue
* Instance-configurable proposal seller letterhead with optional logo
* Closed proposal narrative/content slots
* Staff HTML/printable proposal preview
* Local server-generated PDF without Chromium or paid document APIs
* Generated PDF artifact storage under Sales-local data storage
* Optional uploaded signed PDF artifact
* Proposal revision/history visibility
* Minimal proposal-related dashboard/reporting polish
* Tests and migration required to support B2
  forbidden_scope:
* Browser customer e-signature
* Public signing routes or signing portal
* Customer portal or customer accounts
* In-app email sending, SMTP, or automated proposal delivery
* Multiple concurrent independent Proposal chains under one Opportunity
* Arbitrary document sections, rich document editor, template CMS, or theme CMS
* Tax calculation
* Invoicing
* Stripe, QuickBooks, accounting, payment, or billing integration
* Discount engine or list-price/discount modeling
* S3, object storage, or cloud artifact storage
* Chromium, Playwright, Puppeteer, or browser-based PDF generation
* Broad redesign of B1 reporting, attribution, Campaigns, Sources, or Tracking Links
* C2 Control Plane Sales catalog/provisioning
* D1 schema
* Strategic Insights production migration or cutover
* VPS, DNS, TLS, public deployment, or S7 work
* Beauty vertical
* Martial Arts domain imports
* Core promotion of Proposal/document concepts
* Service delivery, projects, ticketing, fulfillment, or post-sale operations
* Speculative multi-tenant infrastructure
  expected_outputs:
* Sales Proposal domain/schema and migration journal 0003
* Proposal/revision/commercial snapshot implementation
* Proposal workflow and Opportunity integration
* Proposal recipient snapshot implementation
* Proposal seller-letterhead configuration
* Proposal HTML/printable preview
* Local PDF generation
* Generated and optional signed PDF artifact handling
* Proposal-related history/audit notes
* Minimal proposal reporting/dashboard polish
* B2 automated tests under sales_template/tests/b2/
* Successful existing-database migration using pnpm db:migrate
* Work Order return with implementation result, tests, deviations, discovered decisions, result SHA, and durable-doc recommendations
  durable_docs:
* crm_saas_vault/Current-State.md
* crm_saas_vault/project-state.yaml
* crm_saas_vault/SaaS-Milestones.md
* crm_saas_vault/SaaS-Decisions.md

---

# SI Sales B2 — Proposal System Work Order

## Objective

Implement the approved **B2 proposal/document portion of SI Sales Slice B** in `sales_template/`.

B1 is already Successful and provides the working commercial model:

`Lead → Opportunity → Opportunity commercial lines → Won/Lost`

B2 extends that flow with a real customer-facing Proposal system:

`Opportunity commercial truth → Draft Proposal → Issue immutable revision → PDF → Mark Sent → Accepted/Declined → explicit Opportunity Won/Lost`

Proposal acceptance must **not** automatically mark the Opportunity Won.

B2 is a Sales-owned feature. Do not promote Proposal concepts into Core during this Work Order.

## Required repository preparation

Before changing code:

1. Confirm repository `Koifish95/crm_marketing_saas`.
2. Confirm branch `working`.
3. Fetch/pull and confirm the Work Order base is compatible with:
   `99bb058540a706d52aca8ac30e1e1035800f00e6`
4. Read the canonical project-state packet.
5. Read the finalized:
   `crm_saas_vault/wip/SI_Sales_B2_Pre_Development_Decision_Worksheet.md`
6. Inspect the current B1 implementation before designing schema or UI.
7. If Git/code materially conflicts with this Work Order, STOP rather than guessing.

## 1. Proposal domain

Implement exactly **one Proposal chain per Opportunity**.

An Opportunity may have sequential Proposal revisions:

`Proposal P-2026-0007 → r1 → r2 → r3`

but may not have multiple independent concurrent Proposal chains.

Only one revision is current.

Genuinely different simultaneous commercial packages belong on separate Opportunities.

Use a generic instance-local Proposal number. The planning recommendation is:

`P-{year}-{NNNN}`

with revision displayed separately, for example:

`P-2026-0007 r2`

The implementation may refine the technical sequence mechanism, but must not introduce customer-specific/SI-specific identifiers.

## 2. Proposal revisions and immutability

Draft Proposal content may be edited and may refresh from the Opportunity's current commercial lines.

**Issue/finalize** is the immutability boundary.

At Issue:

* copy the current Opportunity commercial lines into Proposal revision snapshot rows
* snapshot commercial descriptions
* snapshot quantities
* snapshot pricing type
* snapshot quoted unit prices
* snapshot relevant Offer identity/name
* calculate/snapshot one-time totals
* calculate/snapshot MRR totals
* snapshot recipient identity
* snapshot the document narrative/content necessary to reproduce that revision
* snapshot seller presentation information as necessary for historical reproduction
* record Issue timestamp
* generate the PDF artifact

Later changes to:

* Opportunity lines
* Offers
* Contact data
* seller configuration

must **not silently rewrite an already-issued revision**.

Material commercial/document changes after Issue require a new revision.

Prior revisions remain visible and historically reproducible.

## 3. Proposal lifecycle

Support the approved workflow:

* Draft
* Issued
* Sent
* Accepted
* Declined
* Superseded

`Sent` represents staff confirmation, not CRM delivery.

Implementation may model Sent as `status = sent` or as Issued plus `sent_at`, whichever produces the cleanest state model while preserving the approved semantics.

### Issue

Issue/finalize:

* freezes the revision snapshot
* generates the PDF
* makes the issued revision immutable

### Mark Sent

Provide an explicit staff action to **Mark Sent**.

It must:

* record `sent_at`
* record appropriate Sales history
* perform no email delivery

### Accepted / Declined

Authorized staff may record Accepted or Declined.

Accepted must **not** automatically mark the Opportunity Won.

The existing explicit Opportunity Won action remains authoritative.

### Superseded

When a new revision replaces a previously current issued revision, preserve the old revision and represent it as Superseded.

## 4. Valid-through

`valid_through` is optional.

When populated and in the past:

* UI may display a clear past-valid-through/expired visual indicator
* do not silently mutate the persisted Proposal status
* do not add a background expiration worker
* do not prevent staff from recording acceptance

No reminder/email automation is authorized.

## 5. Recipient Contact

Each Proposal revision has one recipient Contact.

Default from the Opportunity primary Contact when available.

Staff may select another Contact only from the Opportunity's Company.

At Issue snapshot:

* recipient name
* title
* email
* phone

Do not add multi-recipient proposal behavior.

Do not add email delivery.

Do not add Company billing/mailing-address scope solely for B2.

## 6. Seller letterhead

Implement generic instance-level Proposal letterhead configuration.

Required supported fields:

* business/legal name
* address
* phone
* email
* website
* optional logo
* optional footer/legal text

Text-only Proposal output must remain valid when no logo exists.

Use the existing instance-configuration approach where appropriate, such as `app_settings`.

Do not hardcode Strategic Insights.

Do not build a general white-label/theme/template CMS.

Store optional logo assets using the approved Sales-local artifact/storage approach.

## 7. Proposal content

Use a **closed document structure**, not arbitrary sections.

Supported content:

* Title — per revision, defaulting to Opportunity name
* Intro / scope — optional per revision
* Commercial lines — derived from the Opportunity and snapshotted at Issue
* One-time total
* MRR total
* Terms/legal text — instance default, overridable for the revision
* Notes — optional per revision
* Fixed visual signature/acceptance area

Do not implement arbitrary custom/repeating sections.

Do not implement a document editor/CMS.

## 8. HTML preview

Provide a staff-facing Proposal preview representing the customer-facing document.

Preview must use the Proposal revision content and commercial model.

Issued-revision preview must render from the immutable revision snapshot rather than current Opportunity values.

Protect routes using existing Sales authentication/RBAC patterns.

Do not add public Proposal routes.

## 9. PDF generation

Generate customer-ready PDFs locally on the Sales server.

Hard constraints:

* no Chromium
* no Playwright
* no Puppeteer
* no paid document-generation API

Planning recommends **PDFKit**, with `pdf-lib` acceptable if implementation evidence makes it cleaner.

Choose the simplest maintainable Node-compatible implementation that works locally now and remains reasonable for later Docker/VPS deployment.

The PDF must represent the same approved document content as the HTML preview.

Handle:

* wrapping
* multiple commercial lines
* page breaks
* one-time vs monthly/MRR presentation
* optional logo
* optional narrative fields
* signature area

Do not make CSS/browser print-to-PDF the production PDF mechanism.

## 10. Artifact storage

Store Proposal artifacts locally under the Sales instance data boundary.

Planning target:

`sales_template/data/proposals/{proposalId}/{revision}/`

with generated and optional signed artifacts separated clearly.

Add the appropriate storage path to `.gitignore`.

Allow a future environment override such as `SALES_PROPOSALS_DIR` if useful, without building S7/Control Plane infrastructure.

Generated PDF:

* may be regenerated from the immutable revision snapshot if missing
* regeneration for the same revision may replace the generated artifact
* must not alter Proposal business history

Signed uploaded PDF:

* separate artifact
* never regenerated
* never overwritten by generated-PDF regeneration

Validate upload type/size appropriately.

Do not add S3/object storage.

## 11. Signed-copy handling

Support an optional staff upload of a signed Proposal PDF.

This is artifact storage only.

It does **not** authorize:

* browser e-sign
* public signing
* signature verification
* legal-evidence audit infrastructure
* DocuSign-like behavior

The visual signature block on the generated PDF remains part of the fixed template.

## 12. Opportunity integration

Expose Proposal workflow naturally from the existing Opportunity workspace.

At minimum staff must be able to:

* see the current Proposal
* see prior revisions
* create Draft
* edit Draft
* Issue
* preview
* download
* create a revision
* Mark Sent
* record Accepted/Declined
* upload/download signed copy when present

Do not rebuild the CRM navigation unnecessarily.

A compact Proposal index may be added if implementation evidence shows it is useful and remains bounded.

## 13. RBAC

Reuse existing:

* `VIEW_SALES`
* `MANAGE_SALES`

Expected behavior:

`VIEW_SALES`:

* view Proposal/revisions
* preview
* download generated/signed artifacts

`MANAGE_SALES`:

* create/edit Draft
* Issue
* revise
* Mark Sent
* Accepted/Declined
* upload signed artifact
* manage Proposal letterhead configuration where consistent with current settings permissions

Do not invent another Proposal-specific permission unless implementation discovers a concrete security requirement. If so, STOP and report it as a discovered decision rather than silently expanding RBAC.

## 14. History

Record meaningful Proposal events using the existing Sales history pattern:

* created
* issued
* revised
* superseded
* marked sent
* accepted
* declined
* signed artifact uploaded

Do not build a new audit subsystem.

## 15. Reporting/polish

B2 may add **minimal Proposal-related operational reporting** only.

Useful examples include:

* Draft
* Issued
* Sent
* Accepted
* Declined
* past valid-through display count

Keep this small and operational.

Do not redesign the B1 dashboard, Source/Campaign attribution reporting, funnel analytics, or build a BI/forecasting product.

## 16. Database/migration

Use the repository's established Drizzle/migration conventions.

Expected migration journal:

`0003`

Migration must operate against the existing B1 SQLite database.

Do not use destructive reset/setup as the migration strategy.

Likely domain shape from approved planning:

* `sales_proposals`
* `sales_proposal_revisions`
* `sales_proposal_lines`

Exact technical columns/constraints may be refined during implementation while preserving approved semantics.

## 17. Tests

Add B2 automated tests under:

`sales_template/tests/b2/`

At minimum verify:

* only one Proposal chain exists per Opportunity
* issuing snapshots Opportunity commercial lines
* issued revision remains unchanged after Opportunity line edits
* Offer edits do not rewrite issued Proposal
* recipient Contact is snapshotted at Issue
* only same-Company Contacts can be selected
* new revision preserves old revision
* prior revision becomes Superseded as appropriate
* Mark Sent records `sent_at` without email behavior
* optional valid-through does not auto-mutate stored status
* past-valid-through Proposal may still be Accepted
* Accepted does not auto-Won the Opportunity
* generated PDF metadata/artifact behavior
* missing generated PDF can regenerate from immutable snapshot
* signed upload is stored separately
* regeneration does not overwrite signed upload
* letterhead is instance-configured and not SI-hardcoded
* authorization/RBAC follows existing VIEW/MANAGE Sales rules

Run all relevant existing Sales tests as regression coverage.

## Successful criteria

Implementation may be returned as technically complete only when:

1. Existing B1 database migrates successfully through `0003`.
2. Proposal chain/revision behavior matches the approved decisions.
3. Issue creates an immutable historical commercial/document snapshot.
4. Issued Proposal can be previewed and downloaded as a valid PDF.
5. Opportunity/Offer edits do not mutate issued history.
6. Mark Sent works without sending email.
7. Recipient Contact behavior matches B2-06.
8. Seller letterhead is configurable and generic.
9. Valid-through behavior matches B2-05.
10. Accepted does not auto-Won.
11. Signed PDF can be stored separately.
12. Automated B2 tests pass.
13. Existing relevant Sales tests pass.
14. No forbidden scope was implemented.
15. No Strategic Insights-specific product code was introduced.
16. Cursor performs manual implementation-level QA possible in its environment and documents anything requiring Scott's browser QA.

**Technical completion is not milestone success.**

B2 becomes **Successful only after Scott performs/accepts the required owner QA**.

## Required owner QA handoff

The Work Order return must provide Scott a short, exact manual QA script for localhost `:5040`.

It should cover at minimum:

1. configure Proposal letterhead, including optional logo
2. open/create an Opportunity with commercial lines and Contact
3. create Draft Proposal
4. preview Draft
5. Issue Proposal
6. download/open generated PDF
7. modify Opportunity/Offer afterward and verify issued revision did not change
8. create a new revision
9. Mark Sent
10. verify `sent_at`/history behavior
11. verify optional valid-through display
12. record Accepted and confirm Opportunity did not automatically become Won
13. upload/download signed PDF
14. inspect prior revision/history
15. verify proposal recipient can be changed to another same-Company Contact

Do not mark B2 Successful before Scott accepts this QA.

## Hard stops

STOP and return for owner/ChatGPT decision if implementation discovers a need to:

* alter an approved B2 owner decision
* add multiple concurrent Proposal chains
* add public Proposal/signing behavior
* add customer portal behavior
* add email delivery
* add tax/invoicing/billing
* add S3/object storage
* add Chromium
* introduce SI-specific code
* change Core architecture to support B2
* introduce new cross-product document abstractions
* introduce C2/D1/S7 infrastructure
* materially expand Company schema beyond what B2 requires
* materially redesign Sales RBAC
* introduce a general template/document CMS

Do not solve these by assumption.

## Durable-document handling

During implementation, do not prematurely mark B2 Successful.

The Work Order return must identify the durable facts that should be promoted after implementation and owner acceptance.

After Scott accepts B2, expected durable updates include:

* `Current-State.md`
* `project-state.yaml`
* `SaaS-Milestones.md`
* `SaaS-Decisions.md` as appropriate
* historical closeout/return records

Do not treat this WIP Work Order as durable project truth.

## Return requirements

Create a return for this same Work Order ID containing:

* `status: done`
* Work Order ID
* base SHA
* result SHA
* implementation result
* schema/migrations added
* major files/features changed
* PDF engine selected and why
* artifact-storage implementation
* tests executed and results
* regression tests executed and results
* manual QA performed by Cursor
* exact owner QA steps for Scott
* deviations from Work Order
* decisions discovered
* forbidden-scope confirmation
* durable-document updates/recommendations
* any known limitations

Commit and push the implementation and return to `working`.

Then STOP.

Do **not** declare B2 Successful.

Tell Scott to have ChatGPT inspect the implementation return and Git before owner QA begins.
