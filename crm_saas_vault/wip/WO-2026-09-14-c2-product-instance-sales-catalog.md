---
type: work-order
status: done
id: WO-2026-09-14-c2-product-instance-sales-catalog
milestone: C2
base_sha: 35c4aca8c0e02533f8e2278ade1bd6b3c513e025
authorized: yes
decision_refs:
  - C2-01
  - C2-02
  - C2-03
  - C2-04
  - C2-05
  - C2-06
authorized_scope:
  - Minimal D1 Product Instance schema and safe backfill
  - Product Instance-aware Control Plane domain, services, APIs, and operator UI
  - Hybrid Control Plane product catalog for Martial Arts and Sales
  - Sales Docker/runtime/provisioning contract
  - Product-aware provisioning and applicable S4-S6 lifecycle operations
  - Sales proposal artifact backup/restore compatibility
  - Multi-product-per-account local proof with PROD and DEV per Product Instance
  - Martial Arts regression protection
  - Automated verification and owner-QA preparation
forbidden_scope:
  - Additional Sales CRM features or Proposal expansion
  - Campaign/public-capture promotion into Core
  - Beauty implementation or catalog entry
  - Strategic Insights production migration or cutover
  - S7 hosting/security/remote-node work
  - S8 DNS/TLS/public-hostname work
  - VPS deployment
  - Billing, invoicing, Stripe, or self-service signup
  - CRM email delivery, e-sign, public proposal signing, or customer portal
  - PROD-to-DEV copy-down implementation
  - Full Option C multi-instance account-management redesign
  - Renaming or retagging existing Martial Arts images merely for consistency
  - Destructive recreation of existing environments, containers, databases, or volumes
expected_outputs:
  - Implemented C2 code and schema changes
  - Safe migration/backfill for existing Control Plane data
  - Sales provisioned image crm-sales:c2
  - Automated test/build evidence
  - Owner QA instructions/results handoff
  - Return document with this Work Order ID and result SHA
durable_docs:
  - crm_saas_vault/Current-State.md
  - crm_saas_vault/project-state.yaml
  - crm_saas_vault/SaaS-Milestones.md
  - crm_saas_vault/SaaS-Decisions.md
  - crm_saas_vault/Platform-Architecture.md
---

# C2 Work Order — Product Instances + Sales Product Catalog / Provisioning

## Authorization

This Work Order authorizes implementation of **C2** from base SHA:

`35c4aca8c0e02533f8e2278ade1bd6b3c513e025`

Canonical repository state and the finalized C2 worksheet remain authoritative. Before editing, read at minimum:

- `crm_saas_vault/wip/C2_Pre_Development_Audit_and_Decision_Worksheet.md`
- `crm_saas_vault/project-state.yaml`
- `crm_saas_vault/Current-State.md`
- `crm_saas_vault/SaaS-Milestones.md`
- `crm_saas_vault/SaaS-Decisions.md`
- `crm_saas_vault/Platform-Architecture.md`
- `crm_saas_vault/Work-Order-Protocol.md`
- relevant D1 / Customer Account → Product Instance architecture records

If Git at implementation time materially disagrees with this Work Order, **stop and report the conflict** rather than silently broadening or rewriting scope.

## Locked owner decisions

Implement these decisions exactly:

1. **C2-01 = B — Minimal D1 ships in C2.**
   - Target identity: `Customer Account → Product Instance → Environments`.
   - Add the minimal first-class Product Instance layer.
   - Existing Control Plane customers/environments must be safely backfilled.
   - Do not perform the larger Option C account-management redesign.

2. **C2-02 = B — Prove multiple products under one account.**
   - C2 owner QA must prove one disposable Customer Account can own both a Martial Arts Product Instance and a Sales Product Instance, each with PROD + DEV.
   - This is not Strategic Insights migration.

3. **C2-03 = A — Hybrid product catalog.**
   - Database persists stable product identity on Product Instance.
   - Control Plane code owns executable product definitions/contracts.
   - Do not infer product identity from image names.

4. **C2-04 = A — No Campaign/Public Capture Core promotion.**
   - Martial Arts and Sales domain models remain vertical-owned.

5. **C2-05 = A — Explicit product selection.**
   - Operator flow is Customer Account → Add/Create Product Instance → Select Product.
   - No implicit Martial Arts default.

6. **C2-06 = A — Sales image `crm-sales:c2`.**
   - Do not rename or retag existing Martial Arts images as part of C2.

## Required target architecture

```text
Customer Account
├── Product Instance: Martial Arts
│   ├── PROD
│   └── DEV
└── Product Instance: Sales
    ├── PROD
    └── DEV
```

The one-PROD invariant belongs to the **Product Instance**, not the Customer Account.

Product/environment/container/volume identities must not collide when one Customer Account owns multiple products.

## Implementation scope

### 1. Minimal D1 schema and migration/backfill

Implement the smallest coherent Product Instance model required by the accepted architecture.

Requirements:

- Add a first-class `product_instances` representation in the Control Plane database.
- Each Product Instance belongs to exactly one Customer Account.
- Each environment belongs to exactly one Product Instance.
- Each Product Instance has a stable product id understood by the product catalog.
- Enforce at most one PROD environment per Product Instance.
- Support multiple Product Instances under one Customer Account.
- Backfill every existing customer/environment safely into a Product Instance.
- Existing Martial Arts records should become Martial Arts Product Instances.
- Preserve existing environment slugs, container names, compose identities, host ports, database volumes, asset volumes, and image identities wherever safe/practical.
- Do not delete/recreate live rows merely to make identifiers prettier.
- Treat legacy `industry_template` according to the reconciled worksheet: it must no longer be the authoritative product-instance model. Remove, retain, or deprecate it only as justified by safe migration and current schema constraints.

Before executing destructive or ambiguous migration behavior against existing local data, stop if the safe mapping cannot be determined deterministically.

### 2. Product Instance-aware Control Plane

Update the Control Plane domain/services/APIs/operator UI so Customer Account and Product Instance are distinct concepts.

Required operator behavior:

- Create/manage a Customer Account independently of product selection.
- From an account, create/add a Product Instance.
- Explicitly select Martial Arts or Sales.
- Display Product Instances beneath the Customer Account.
- Display/manage environments in the context of their Product Instance.
- Existing lifecycle operations must resolve product and sibling environments through Product Instance, not through the old assumption that every environment for a customer is the same product.

Do not build a generalized commercial account-management suite beyond what is necessary for this flow.

### 3. Hybrid product catalog

Create a small code-defined Control Plane product catalog for exactly:

- Martial Arts
- Sales

Beauty is forbidden in C2.

The catalog should provide the executable provisioning/lifecycle information needed by the existing Control Plane, such as:

- stable product id;
- display name;
- image/tag;
- template root / Docker build contract;
- compose contract;
- container port;
- health contract;
- persistent-storage expectations;
- initialization/runtime requirements;
- product-specific environment variables/branding where necessary.

Persist only the stable product identity needed on the Product Instance; do not build a database-configurable plugin loader.

### 4. Sales Docker/runtime contract

Make `sales_template/` provisionable through the Control Plane without changing its existing local development behavior at `http://localhost:5040`.

Implement the Sales equivalent of the proven Martial Arts provisioned runtime where appropriate, including:

- repo-root-compatible Docker build so `packages/crm-core` is available;
- provisioned compose contract;
- container startup/migration/seed behavior;
- container-internal SQLite location compatible with Control Plane persistence;
- isolated named SQLite and assets volumes per environment;
- `GET /api/health` compatibility;
- provisioned admin/bootstrap behavior consistent with the current application/security model;
- product-aware branding/environment identity;
- Sales image exactly `crm-sales:c2`.

Do not rename the local Sales database or break `pnpm dev` merely to mirror the provisioned container path.

### 5. Sales proposal artifact durability

B2 Proposal PDFs/signed artifacts are part of the Sales application's durable state.

Ensure the provisioned Sales runtime stores those artifacts in a location covered by the existing applicable Control Plane backup/restore contract, preferably using the already-proven assets persistence rather than inventing a third volume unless actual implementation constraints require otherwise.

Verify generated and signed proposal artifacts survive:

- relaunch/recreate without `-v`;
- backup;
- restore.

Never overwrite an uploaded signed PDF as part of this work.

### 6. Product-aware lifecycle operations

Refactor only the necessary Martial-Arts-specific assumptions in the Control Plane so applicable existing S4–S6 lifecycle operations work correctly for both products.

At minimum inspect and correctly handle:

- provisioning;
- health observation;
- relaunch;
- start/stop;
- backup/restore;
- upgrade/rebuild;
- sibling/non-PROD-before-PROD upgrade logic.

Important: sibling/upgrade checks must be scoped to the **same Product Instance**, not every environment owned by the Customer Account.

No new S7/S8 functionality is authorized.

### 7. Identity and collision rules

Because one account can now own more than one product, new Product Instance/environment identifiers must be collision-safe.

Use a deterministic convention consistent with the finalized worksheet and existing architecture.

Do not rename existing proven Martial Arts environment/container/volume identities during backfill unless a genuine collision makes preservation impossible. If such a collision is discovered in real existing data, stop and report it before destructive remediation.

### 8. Martial Arts regression boundary

C2 must preserve existing Martial Arts behavior.

Protect at minimum:

- existing `martial-arts-acquisition:s4` provisioned image identity;
- lab-acme's existing `:s2` exception/identity where currently supported;
- existing environment/container/volume names;
- current health behavior;
- current relaunch semantics;
- no `docker compose down -v` or volume pruning;
- backup/restore behavior;
- upgrade behavior;
- extra non-PROD environment behavior, adjusted only as required to attach it to Product Instance identity;
- existing MA vertical domain/schema behavior.

Do not import Martial Arts domain code into Sales or Core.

## Required implementation sequencing

Use bounded commits/slices so failures are attributable. A recommended sequence is:

1. Product Instance schema + deterministic migration/backfill + tests.
2. Product catalog + Product Instance-aware Control Plane domain/services/UI.
3. Sales Docker/runtime/provisioning contract.
4. Product-aware lifecycle + Sales durable artifact handling.
5. End-to-end multi-product regression/QA fixes only.
6. Documentation/return.

You may adjust sequencing when technically necessary, but do not broaden scope.

After each major slice, run relevant tests before proceeding. Do not defer all validation to the end.

## Automated verification

Run all relevant existing and new tests. At minimum C2 evidence must cover:

- schema migration/backfill from the pre-C2 Control Plane shape;
- existing customers receive a Martial Arts Product Instance without destructive identity changes;
- Customer Account can own multiple Product Instances;
- one PROD per Product Instance;
- collision-safe environment identity for multiple products under one account;
- explicit product selection;
- Martial Arts product lookup selects existing MA build/runtime contract;
- Sales product lookup selects `crm-sales:c2` and the Sales Docker/runtime contract;
- lifecycle sibling checks are Product Instance-scoped;
- Sales health succeeds with reachable DB;
- Sales proposal artifacts are included in persistence/backup/restore;
- no forbidden cross-vertical imports;
- no `docker compose down -v` / prune behavior introduced;
- relevant Sales tests/lint/typecheck/build remain green;
- relevant Martial Arts regression tests/build remain green;
- relevant Control Plane tests/build remain green.

Record exact commands and results in the Return.

## Owner QA required for Successful

Implementation completion is **not** C2 Successful.

Prepare a clear owner-QA checklist and stop for Scott's acceptance after code/test completion.

The QA must prove, using disposable/local data where practical:

1. A Customer Account exists independently of its products.
2. Operator adds a Martial Arts Product Instance to that account.
3. Operator adds a Sales Product Instance to the **same** account.
4. Product selection is explicit.
5. Each Product Instance receives independent PROD + DEV environments.
6. Environment/container/volume identities do not collide.
7. SQLite/assets are isolated between all four environments.
8. Martial Arts PROD/DEV become healthy and open the Martial Arts application.
9. Sales PROD/DEV become healthy and open the existing Sales CRM.
10. Sales provisioned admin/bootstrap works according to the existing security model.
11. Sales proposal PDF creation works in a provisioned environment.
12. Generated/signed proposal artifacts survive relaunch and backup/restore.
13. Sales start/stop/relaunch work without destructive volume behavior.
14. Sales upgrade rebuilds/selects `crm-sales:c2`, not the Martial Arts image.
15. PROD upgrade gating compares the correct non-PROD sibling(s) inside the same Product Instance.
16. Existing Martial Arts environment identities remain intact after the D1 backfill.
17. Existing Martial Arts lifecycle behavior remains functional.
18. No Strategic Insights migration occurred.
19. No Beauty product was introduced.
20. No Campaign/Public Capture Core promotion occurred.

If owner QA exposes a C2 defect, fix only defects within this Work Order scope and rerun the affected verification.

## Successful criteria

C2 may be proposed as **Successful** only when all of the following are true:

- Minimal D1 Product Instance architecture is implemented and safely backfilled.
- Customer Account → multiple Product Instances → independent environments is real, not merely schema-theoretical.
- Control Plane recognizes Martial Arts and Sales as distinct products through the hybrid catalog.
- Sales is provisionable and manageable through the Control Plane.
- One disposable Customer Account has demonstrated both MA and Sales Product Instances with PROD+DEV each.
- Applicable lifecycle operations work correctly and are Product Instance-aware.
- Sales durable Proposal artifacts are protected by backup/restore.
- Martial Arts regression boundary passes.
- automated tests/builds pass;
- Scott completes and accepts owner QA.

Cursor must **not** mark C2 Successful merely because implementation is code-shipped.

## Hard stops

STOP and report before proceeding if:

- current Git materially conflicts with the finalized C2 decisions;
- safe deterministic backfill of existing Control Plane data cannot be established;
- migration would require destructive recreation/renaming of existing environments or volumes not explicitly authorized here;
- Product Instance implementation requires the full Option C redesign rather than the minimal D1 layer;
- Sales provisioning requires changing Martial Arts domain behavior;
- a requested change crosses into S7/S8, Beauty, SI cutover, billing, e-sign, CRM email, or other forbidden scope;
- an architectural choice is discovered that materially changes owner-visible product/account/lifecycle semantics and is not already resolved by C2-01 through C2-06.

Do not invent owner policy to get around a hard stop.

## Stop condition / Return protocol

When implementation and automated verification are complete:

1. Commit and push all authorized implementation to `working`.
2. Create the Work Order Return using **the same ID**:
   `WO-2026-09-14-c2-product-instance-sales-catalog`.
3. Return must include:
   - `status: done`;
   - base SHA;
   - result SHA;
   - implementation result;
   - schema/backfill result;
   - tests/builds with exact commands/results;
   - Docker/provisioning verification;
   - Martial Arts regression evidence;
   - decisions discovered/deviations;
   - durable docs updated;
   - explicit owner-QA checklist and anything Scott must manually verify.
4. Promote durable facts according to `Work-Order-Protocol.md`, but do **not** mark C2 Successful before owner acceptance.
5. Archive/move WIP artifacts only according to repository protocol.
6. STOP and hand control back to Scott/ChatGPT for review and owner QA.

Do not start C3, Beauty, S7, S8, Strategic Insights migration, or any subsequent milestone.
