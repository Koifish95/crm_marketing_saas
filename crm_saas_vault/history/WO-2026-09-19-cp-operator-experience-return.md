---
type: work-return
status: done
id: WO-2026-09-19-cp-operator-experience
milestone: none
base_sha: "5e26fe8c40894059afd11aefb6b4b267aca5fdb0"
result_sha: none
implementation_result: shipped
tests: "control_plane pnpm test 25 files / 118 passed; pnpm typecheck pass; pnpm lint pass; pnpm build pass"
decisions_discovered:
  - "2026-09-20 — Control Plane customer/product/environment operator lifecycle"
durable_docs_updated:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Control-Plane.md
  - project-state.yaml
  - Control-Plane-Operator-UX-Audit.md
---

# Control Plane operator experience & lifecycle — return

Governing prompt: `crm_saas_vault/wip/Control_Plane_Operator_Experience_and_Lifecycle_Milestone_Prompt.md`. Work order: [[wip/archive/WO-2026-09-19-cp-operator-experience]]. Audit: [[Control-Plane-Operator-UX-Audit]].

This is **not** an official S-track Successful. Do not mark S7. Live VPS/DNS/TLS were not started.

**Outcome:** code-shipped. Browser/operator QA and a disposable Archive & Delete proof were performed on http://127.0.0.1:52100. Owner acceptance is still required before calling this Successful.

## Git

| Field | Value |
|---|---|
| Starting SHA | `5e26fe8c40894059afd11aefb6b4b267aca5fdb0` |
| Ending SHA | same (uncommitted at return) |
| Commits | none — not asked |

Working tree holds this milestone plus unrelated prior dirty files (`docs/` numbering, vault notes, `.nuxt`, sqlite). Do not commit until Scott asks. Stage Control Plane + vault + `docs/` operator pages only.

## Audit findings (implemented this milestone)

See [[Control-Plane-Operator-UX-Audit]] CP-UX-001–022. Implemented: dashboard attention/activity, nav (Products / Backups / Reports), customer/product/environment search-filter-sort, customer and product-instance deactivate/reactivate, environment workspace tabs, distinct Stop vs Decommission vs Archive & Delete, fleet backup list, truthful reports, hosting-node running/unhealthy counts, confirmation dialogs, loopback gate, operator_events.

Deferred from audit (still true): operator login (S7), live TLS probe (S8), historical uptime, bulk backup/restore/PROD upgrade, permanent customer deletion, Pause (not a distinct Docker state).

## What changed

Control Plane is now the SIC operations console for the laptop fleet: find a messy customer/environment quickly, operate one environment without hunting Docker/SQLite, and retire a throwaway environment with a gated final backup + exact volume delete.

## Schema / lifecycle

Migration `control_plane/drizzle/migrations/0007_operator_lifecycle.sql`:

- `customers.status` (`active` default) + `deactivated_at` / `deactivated_note` / `reactivated_at`
- same columns on `product_instances`
- `environments` archive metadata: `archived_at`, `archive_note`, `final_backup_id`, `final_release_id`, `final_schema_version`, `final_expected_image`, `former_public_hostname`, `data_removed_at`
- append-only `operator_events`

Lifecycle:

```text
Customer / Product Instance: active ⇄ inactive  (no permanent customer delete)
Environment:
  provisioning → ready | failed
  Stop        = compose stop app     (data stays, still ready)
  Decommission= compose rm -f --stop app  (volumes stay)
  Archive & Delete = final backup → verify → off-host (PROD required; non-PROD may skip) → exact docker volume rm of registered sqlite/assets → row remains archived
```

No Pause. Start refused for decommissioned/archived/inactive customer or product. Backup allowed on decommissioned (volumes exist); refused on archived. Restore refused on decommissioned and archived. Customer deactivate stops live instance environments and marks instances inactive. Customer reactivate restores instance `active` without auto-starting Docker. Lab-acme and names containing `renzo` / `webhosting` cannot be archived. Exact registered volume names only. Never `down -v`, never prune.

Archive confirmation: type the environment **slug** and **`ARCHIVE AND DELETE`**.

## UI / UX

Nav: Dashboard, Customers, Products, Environments, Backups, Reports, Hosting Nodes, Settings.

- Dashboard: fleet counts including inactive/archived, attention from real backup/off-host/release/health data, recent `operator_events`. No fabricated uptime/TLS.
- Customers: search, active/inactive/all, product filter, sort. Default hides inactive.
- Products: independent Martial Arts / Sales instances with lifecycle.
- Environments: search + customer/product/type/PROD/lifecycle/runtime/health/node/backup filters, clear filters, archived hidden unless shown. Bulk start/stop unchanged (all = registered fleet, not the filter).
- Environment workspace: Overview / Runtime (Start, Stop) / Backup (backup, restore, Decommission, Archive & Delete) / Release / Network / History. Relaunch stays in the header.
- Reports: truthful registry + observe + backup rows; explicit gaps list.
- AppConfirmDialog for Stop Selected/All and Archive & Delete.

## Tests

`control_plane`:

- `pnpm test` — 25 files, 118 passed
- `pnpm typecheck` — pass
- `pnpm lint` — pass
- `pnpm build` — pass

New/updated: `tests/operator/archive.test.ts`, `filters.test.ts`, `lifecycle.test.ts`; nav, fleet, fleet-backup, loopback.

## Browser / operator QA

http://127.0.0.1:52100 against the live gitignored laptop registry (messy fleet: Acme, SI, Still Beauty LLC, Alianna's Baked Goods, C2 QA Test, plus disposable TRAINING).

Verified: dashboard counts/attention/activity; customer search (`C2` → C2 QA Test only) and active/inactive (deactivate hid C2 from default list: 4 active / 1 inactive); product instances page; environment filters (TRAINING → 1 of 13); environment workspace tabs; Stop (volumes stayed); Archive dialog (exact volume names, dual phrase); Reports (no uptime %); Hosting Nodes laptop list; Settings; Backups list; narrow ~390px dashboard (nav wraps, cards 2-up).

C2 Sales PROD and Martial Arts DEV were restarted after the deactivate/reactivate proof.

## Destructive lifecycle proof

Throwaway only: provisioned C2 QA Test · Sales · **ARCHIVE-QA** (`c2-test-sales-archive-qa`, id `419b9bfb-cd9e-467f-8f47-4f183d574ea0`). Not SI, Acme, Beauty, Alianna, lab-acme, or external Renzo.

1. Created TRAINING env (healthy).
2. Stopped from Runtime tab — volumes remained.
3. Archive & Delete in browser: typed `c2-test-sales-archive-qa` and `ARCHIVE AND DELETE`, skipped off-host (non-PROD).
4. Final zip verified present: `control_plane/data/backups/c2-test/c2-test-sales-archive-qa/c2-test_c2-test-sales-archive-qa_2026-09-19_215149.zip`.
5. Volumes `c2-test-sales-archive-qa-sqlite` and `-assets` removed. Sibling `c2-test-sales-prod-*` and `c2-test-sales-dev-*` remained. `c2-test-sales-prod-app` stayed running.
6. Control Plane row remains `archived` (dashboard Archived = 1). History: `environment.stop`, `environment.archive`.
7. Lab-acme / SI / Beauty / Alianna volumes untouched. No `renzo` / `webhosting` names involved.

## Documentation

Updated `docs/4`, `5`, `10`, `11`, `12`, `14` for Stop vs Decommission vs Archive, nav, reports, deactivate. Vault: this return, audit, Current-State, Control-Plane, Decisions, Milestones, project-state.yaml.

## Deferred

- Official operator login (S7)
- Live VPS, DNS, TLS, certificate expiry probe (S8)
- Historical uptime / CPU/memory telemetry
- Bulk backup, bulk restore, bulk PROD upgrade, bulk Archive
- Permanent customer deletion / legal retention duration
- Pause (not a distinct action)
- Automatic mass deploy

## External / live-infrastructure blockers

None for this laptop-lab milestone. Official S7/S8 remain Not started. Do not treat this return as VPS activation.

## Manual QA before VPS activation

- Walk Dashboard → a real customer workspace → PROD Backup tab on a **non-production** env.
- Confirm Archive & Delete is not adjacent to Start/Stop and requires slug + phrase.
- Confirm inactive customers are hidden by default.
- Confirm Reports gaps (no uptime %, no TLS expiry).
- Do **not** Archive SI, Acme, or any paying/pilot customer.
- Off-host copy still needs an existing folder path; PROD archive cannot skip it.
- After customer deactivate, reactivate restores product instances but **does not** start Docker — Start each needed environment.
- Loopback: browse `http://127.0.0.1:52100` (not a public bind).
