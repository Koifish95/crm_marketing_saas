---
type: work-return
status: done
id: WO-2026-09-14-c2-product-instance-sales-catalog
milestone: C2
base_sha: "35c4aca8c0e02533f8e2278ade1bd6b3c513e025"
result_sha: pending
implementation_result: shipped
tests: "control_plane: pnpm test 19 files / 81 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass. sales_template: pnpm test 8 files / 41 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass. martial_arts_template: pnpm test 69 files / 331 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass."
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
- `POST /api/customers/:id/product-instances` requires `productId`. Creates the instance and default PROD+DEV, then provisions those envs.
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

CP: http://127.0.0.1:52100. Local Sales `pnpm dev` remains http://localhost:5040. After CP migrate/seed, restart Control Plane so `0004_product_instances` applies to the live gitignored sqlite.

## Stop

Do not start C3, Beauty, S7, S8, SI migration, or Core promotion. Leave this Work Order and return in `wip/` until Scott accepts C2.
