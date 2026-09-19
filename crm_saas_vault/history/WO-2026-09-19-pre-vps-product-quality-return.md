---
type: work-return
status: done
id: WO-2026-09-19-pre-vps-product-quality
milestone: none
base_sha: "4bd015b20a9f5f188580a50cc171680af6328239"
result_sha: "3133558c4e1f0e4f88d5e06b3081e1d0cf756711"
implementation_result: shipped
tests: "Phase 2: martial_arts follow-up tests updated and previously passing; sales registration labels. Phase 3: control_plane pnpm test 21 files / 107 tests pass; pnpm typecheck pass; pnpm lint pass. sales_template docker-contract + registration 2 files / 4 tests pass."
decisions_discovered:
  - "SaaS-Decisions#2026-09-19 — Pre-VPS release identity, migrations, and upgrade recreate"
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - Home.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - Control-Plane.md
  - Customer-Environment.md
  - S6-Fleet-Runbook.md
  - Product-Workflow-UX-Audit.md
  - Product-UX-Overhaul-Return.md
  - Product-Release-Update-Lifecycle.md
---

# CRM SaaS Pre-VPS Product Quality Program — Final Result

**Not the live map.** Live map: [[Current-State]]. Work order (archived): [[wip/archive/WO-2026-09-19-pre-vps-product-quality]]. Program: [[wip/CRM_SaaS_Pre_VPS_Product_Quality_and_Release_Readiness_Program]].

Code-shipped on `working`. Not an official S-track or C-track Successful. Live VPS/DNS/TLS remain external.

## Overall Status

**SUCCESS** for all three phases. Official milestones unchanged. `renzo_crm` not modified. Not pushed.

## Phase 1 — Workflow / Usability Audit

- **Status:** SUCCESS (investigation only).
- **Audit:** [[Product-Workflow-UX-Audit]].
- **Finding counts:** CRITICAL 1, HIGH 11, MEDIUM 16, LOW 6.
- **Conclusions:** Both products can complete claimed workflows. Martial Arts staff chrome was unusable (rail overlay) until the shell was fixed; domain is coherent. Public `/trial` is the visual high-water mark. Sales V1 operational spine exists but felt like CRUD.

## Phase 2 — UI/UX Overhaul

- **Status:** SUCCESS (code-shipped). Feature commit `3133558`.
- **Major changes:** Unlayered `staff-shell.css`; MA Convert/Mark lost + confirmation-before-class + post-outcome MANUAL follow-up; Sales Company-first nav and workspace toggles.
- **Sales:** Daily spine is usable; remaining create-on-list polish deferred.
- **Martial Arts:** Convert after attend is primary; overlay gone.
- **Browser QA:** Desktop rail in-flow; phone Menu + off-canvas. Recorded in [[Product-UX-Overhaul-Return]].
- **Deferred:** dialogs in a11y tree, checkbox readonly, remaining Sales create-on-list, MA compensation panel, leftover lab sqlite.

## Phase 3 — Release / Update Lifecycle

- **Status:** SUCCESS (repository). Map: [[Product-Release-Update-Lifecycle]].
- **Release architecture:** expected image + running image + health `releaseId` + `schemaVersion`. Upgrade stamps `RELEASE_ID` into compose env. Sales image now has `ARG RELEASE_ID`.
- **Migrations:** Drizzle at container start. Additive/idempotent. Destructive → restore backup + previous image. Do not downgrade SQLite.
- **Backup:** Unchanged S6 zip of sqlite + uploads; upgrade refused without a backup of this environment.
- **Rollback:** Restore + previous image. Compose-up failure reverts the env file. Health failure is not an automatic container revert.
- **Runtime proof:** Control Plane contract tests pass, including `--force-recreate` without `-v`. Full old-image → new-image docker drill with representative MA + Sales data **not re-run** this phase (S6 already proved volume-preserving upgrade).
- **External blockers:** live VPS, registry credentials, off-host cloud folder, DNS/TLS.

## Tests

| Command | Result |
|---|---|
| `control_plane` `pnpm test` | 21 files / 107 tests pass |
| `control_plane` `pnpm typecheck` | pass |
| `control_plane` `pnpm lint` | pass |
| `sales_template` docker-contract + registration | 2 files / 4 tests pass |

Local `:5030` / `:5040` were not running at Phase 3 verification. Phase 2 browser QA was completed earlier in this work.

## Git

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Branch | `working` |
| Work order `base_sha` | `4bd015b20a9f5f188580a50cc171680af6328239` |
| Phase 1 | `c60e851` |
| Phase 2 | `3133558c4e1f0e4f88d5e06b3081e1d0cf756711` |
| `renzo_crm` | not modified |
| Push | not requested |

## Remaining Pre-VPS Blockers

- Purchase/bootstrap live VPS (repository hosting-node path already exists).
- Live DNS/TLS.
- Off-host cloud folder if SIC wants copies off the laptop.
- Optional: re-run a throwaway docker upgrade drill before first live customer update.

## Recommendation

The repository is ready to proceed to:

> **Purchase VPS → bootstrap hosting node → private Control Plane → provision SIC Sales + Martial Arts → temporary DNS → TLS → off-host backups → live acceptance rehearsal.**

Do not start C3, Beauty, or Core-domain promotion. Do not treat leftover laptop labs as official pilots.
