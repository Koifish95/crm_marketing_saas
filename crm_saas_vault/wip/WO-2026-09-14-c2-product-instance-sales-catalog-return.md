---
type: work-return
status: done
id: WO-2026-09-14-c2-product-instance-sales-catalog
milestone: C2
base_sha: "35c4aca8c0e02533f8e2278ade1bd6b3c513e025"
result_sha: "43454fa08a53975fa509c1871cc53c850cc1e4ba"
implementation_result: shipped
tests: "QA restore-selection remediation: control_plane pnpm test 20 files / 93 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass. sales_template pnpm test 8 files / 41 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass. martial_arts_template pnpm test 69 files / 331 tests pass; pnpm lint pass; pnpm typecheck pass. Previous provisioning QA remediation was 19/84 CP."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - Customer-Environment.md
  - Control-Plane.md
  - S4-Provision-Runbook.md
---

# C2 return — Product Instances + Sales catalog

**Not the live map.** Live map: [[Current-State]]. Work order: [[wip/WO-2026-09-14-c2-product-instance-sales-catalog]]. Worksheet: [[wip/C2_Pre_Development_Audit_and_Decision_Worksheet]].

**C2 is not Successful.** This return is code-ship + automated verification. Scott must complete owner QA before C2 can be proposed as Successful.

---

## Executive result

**C2 CODE-SHIPPED — READY FOR OWNER QA**

Control Plane now implements minimal D1: Customer Account → Product Instance → Environments. Hybrid catalog in CP code recognizes Martial Arts and Sales. Sales is provisionable as `crm-sales:c2`. Creating an account does not choose a product.

```text
Customer Account
├── Product Instance: Martial Arts
│   ├── PROD
│   └── DEV
└── Product Instance: Sales
    ├── PROD
    └── DEV
```

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` |
| Branch | `working` |
| Work Order `base_sha` | `35c4aca8c0e02533f8e2278ade1bd6b3c513e025` |
| HEAD at start | **matched** `base_sha` |
| Dirty at start | `M .obsidian/workspace.json` (not committed); untracked Work Order (committed with C2) |
| Core package | **unchanged** (no Campaign/public-capture promotion) |

---

## What shipped

- Schema `product_instances` + `environments.product_instance_id`. Migration `0004_product_instances`: backfill every existing customer as one Martial Arts instance; attach existing env rows; **do not rename** slug / container / compose project / volumes / image / host port.
- Hybrid catalog `control_plane/server/products/catalog.ts`: `martial-arts` → `martial-arts-acquisition:s4` + `martial_arts_template/Dockerfile`; `sales` → `crm-sales:c2` + `sales_template/Dockerfile`. Beauty is not listed.
- `POST /api/customers` creates an account only (`industry_template` = `unassigned`, zero environments).
- `POST /api/customers/:id/product-instances` requires `productId`. Creates the instance and default PROD+DEV immediately (`lifecycle_status` provisioning), then starts Docker provision in the background. The HTTP request does not wait for image build.
- Extra non-PROD requires `productInstanceId`. One PROD per instance.
- New env names `{customer}-{productId}-{type}`. Backfilled names stay `{customer}-{type}`.
- Upgrade siblings filtered by product instance. Image build/compose cwd come from the instance product, not MA constants.
- Sales Docker: `sales_template/Dockerfile`, `docker-compose.provisioned.yml`, `docker/entrypoint.sh`, `docker/runtime-init.ts`. `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` on the existing assets volume.
- Operator UI: New customer = Create account. Customer workspace Products tab + instance-scoped extra env.

## What did not ship

- Live Docker build/provision of a proof account in this session (owner QA).
- C2 Successful.
- SI migration / cutover. lab-acme and SI identities were not retagged or rebuilt.
- Beauty catalog entry. Option C. Core promotion of campaigns/public capture. Additional Sales CRM features.

## Schema / backfill

- Deterministic instance id `{customerId}-martial-arts` for backfill/seed of existing customers.
- `ALTER TABLE environments ADD product_instance_id` (not a table rebuild) so live `environment_backups` FKs are not dropped.
- `industry_template` kept NOT NULL; new accounts use sentinel `unassigned`. Adding a Martial Arts instance sets it to `martial-arts`.

## Deviations

- Dual env naming (locked by the worksheet): backfill keeps historical names; new instances are product-qualified.
- SQLite column `product_instance_id` is nullable at the storage layer after `ALTER ADD`; application always writes it; inner join drops orphan rows.
- At most one instance per `(customer_id, product_id)` in C2 (not Option C).

## Tests / builds (actual)

| Tree | Commands | Result |
|---|---|---|
| `control_plane/` | `pnpm test` | 19 files / 81 tests pass |
| `control_plane/` | `pnpm lint` `pnpm typecheck` `pnpm build` | pass |
| `sales_template/` | `pnpm test` | 8 files / 41 tests pass |
| `sales_template/` | `pnpm lint` `pnpm typecheck` `pnpm build` | pass |
| `martial_arts_template/` | `pnpm test` | 69 files / 331 tests pass |
| `martial_arts_template/` | `pnpm lint` `pnpm typecheck` `pnpm build` | pass |

No `-v` / prune in compose or relaunch args (existing S3/S4 tests plus Sales compose contract). Core still does not import verticals (Sales architecture test).

This session did **not** run `docker build -t crm-sales:c2`. First Sales provision will build it via `ensureLocalImage`.

## Owner QA required for Successful

Use a **new disposable** Control Plane account. Do not mutate lab-acme or Strategic Insights.

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

CP: http://127.0.0.1:52100. Local Sales `pnpm dev` remains http://localhost:5040. After CP migrate/seed, restart Control Plane so `0004_product_instances` / `0005_provision_error` apply to the live gitignored sqlite.

## Owner QA remediation (2026-09-15)

Two defects found during Scott’s owner QA on disposable account **C2 QA Test** (`c2-test`). C2 remains **not Successful**.

### Defect 1 — long-running provision looked dead

`POST /api/customers/:id/product-instances` awaited `ensureLocalImage` (`spawnSync docker build`) and `waitUntilHealthy` on the HTTP request. First Sales add had no `crm-sales:c2` image, so the browser sat on **Adding…** for the full Docker/Nuxt build. Navigating away left persisted `provisioning` rows that the Products table never refreshed to show.

**Fix:** registry insert returns immediately (`accepted: true`). Provision runs in-process in the background (one lock per customer, not a job queue). UI acknowledges immediately, disables duplicate submit, polls `/api/status`, and shows persisted operator status: Provisioning / Failed / Healthy. Account create stays lightweight.

### Defect 2 — Sales unique-constraint orphan

Sales instance `d90f4a6a-b6b7-4f31-951e-9ed36b3b9576` and PROD/DEV rows (`c2-test-sales-prod` `:52208`, `c2-test-sales-dev` `:52209`) were inserted. `ensureLocalImage` threw **before** the per-env try/catch (and/or the HTTP client aborted mid-`spawnSync`), so rows stayed `provisioning` with no error, no containers, and a second Add returned **Sales is already on this account.** Default Node `maxBuffer` (1MB) also made a large Docker build unsafe.

The recoverable Sales image build then failed for real Dockerfile/runtime reasons once visibility existed:

1. `node node_modules/esbuild/bin/esbuild` — pnpm hoist, esbuild not at that path.
2. `entrypoint.sh` CRLF — tini exec `/bin/sh\r` exit 127.
3. Runner copied stubbed `sales_template/node_modules/@libsql` (empty `databaseOpen`) instead of workspace `/src/node_modules/@libsql`.

**Fix:** image failures mark **only** the environments that need that image as `failed` with `provision_error`. Product Instance stays visible. Duplicate `(customer, product)` stays 409. Retry continues the same env ids/volumes (no `-v`). Sales Dockerfile: `pnpm exec esbuild`, LF entrypoint + `sed` strip CR, copy workspace `@libsql`.

### Recovered proof on C2 QA Test (do not treat as Successful)

Remediation commit: `db7af34da661ea2b0a0a7aa2c284e5fe377b9e30`. Martial Arts PROD/DEV remained healthy (`martial-arts-acquisition:s4`, `:52206` / `:52207`). Sales recovered on the existing instance:

| Env | Container | Image | Port | Volumes |
|---|---|---|---|---|
| Sales PROD | `c2-test-sales-prod-app` | `crm-sales:c2` | 52208 | `c2-test-sales-prod-sqlite` / `-assets` |
| Sales DEV | `c2-test-sales-dev-app` | `crm-sales:c2` | 52209 | `c2-test-sales-dev-sqlite` / `-assets` |

Staff login `admin` / `setup` reached must-change-password on both Sales environments. lab-acme / SI / Still Beauty / Alianna's were not mutated.

## Owner QA remediation — selectable restore / PROD→DEV copy-down (2026-09-15)

QA discovery: Lifecycle restore was **latest ZIP of this environment only**. `restoreRegisteredEnvironment` defaulted to that zip, and the zip `manifest.environmentId` had to equal the **target** environment. That blocked `C2 QA Test / Sales PROD backup → C2 QA Test / Sales DEV`.

### Implementation

- Backups remain rows in `environment_backups` (`id`, `environment_id`, `customer_id`, `created_at`, `bytes`, `zip_path`). Product Instance and PROD/DEV come from joining the registered environment. Existing zips stay usable through those rows, not filenames.
- `GET /api/environments/:id/backups` lists restore candidates for that **target**.
- `POST /api/environments/:id/restore` requires `{ confirm, backupId }`. No `zipPath` body. Missing/invalid backups return 404; the server does not pick another zip.
- Server-side policy (`restoreBackupPolicy`): same customer + same Product Instance; same-env rollback; PROD→DEV copy-down; refuse DEV→PROD, cross-product, cross-customer.
- Snapshot still uses the S6 zip (SQLite + uploads, including `uploads/proposals/.../generated.pdf`). Restore writes into the **target** container/volumes, then compose `up -d --no-deps app` without `-v`. Running targets are restarted so SQLite reloads. Target identity/port/compose/secrets stay.
- Lifecycle UI: source environment + specific backup + visible target + destructive confirmation.

### Live inspection (non-destructive)

Did **not** restore into DEV. Preserved Scott’s existing Sales PROD zip:

`control_plane/data/backups/c2-test/c2-test-sales-prod/c2-test_c2-test-sales-prod_2026-09-15_155406.zip`

Registered backup id `5db4cda5-5eea-4178-8381-b1bbec6904c3`. Zip contents: `sqlite/crm.sqlite` and `uploads/proposals/1/1/generated.pdf`. Sales PROD `:52208` and Sales DEV `:52209` remained running `crm-sales:c2` with original identity.

Live CP (`http://127.0.0.1:52100`) `GET .../backups` lists that zip as **rollback** on Sales PROD and **copy-down** on Sales DEV. Direct restore POSTs without confirm, cross-product (Sales PROD zip → Martial Arts DEV), and cross-customer were refused 400/409. No customer data was replaced.

Resume owner QA at **#37** on Control Plane Lifecycle for `C2 QA Test → Sales DEV`: select the Sales PROD backup above, confirm, restore into DEV.

## Stop

Do not start C3, Beauty, S7, S8, SI migration, or Core promotion. Leave this Work Order and return in `wip/` until Scott accepts C2.
